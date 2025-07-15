import * as THREE from 'three';
import { MeshHandler, MaterialHandler, DimensionHandler } from './threeHandlers.js';

export class SelectionHandler {
    constructor(sceneHandler) {
        this.sceneHandler = sceneHandler;
        this.meshHandler = new MeshHandler(sceneHandler);
        this.materialHandler = new MaterialHandler();
        this.dimensionHandler = new DimensionHandler(sceneHandler, this.meshHandler, this.materialHandler);
        
        this.selectionElements = [];
        this.hoverHighlight = null;
        this.originDisplay = null;
    }

    createHoverHighlight(meshObject) {
        if (!meshObject || !meshObject.geometry) {
            return null;
        }

        const wireframe = this.meshHandler.createWireframeMesh(meshObject, 0x00ff00);
        
        this.materialHandler.updateMaterialProperties(wireframe.material, {
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });
        
        wireframe.position.copy(meshObject.position);
        wireframe.rotation.copy(meshObject.rotation);
        wireframe.scale.copy(meshObject.scale);
        wireframe.scale.multiplyScalar(1.005);
        
        this.sceneHandler.addToScene(wireframe);
        return wireframe;
    }

    createDimensionLine(startPoint, endPoint, text, color = 0x00ff00) {
        const line = this.dimensionHandler.createDimensionLine(startPoint, endPoint, color);
        
        const tickLength = 0.1;
        const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
        const perpendicular = new THREE.Vector3();
        
        if (Math.abs(direction.y) > 0.9) {
            perpendicular.set(1, 0, 0);
        } else if (Math.abs(direction.x) > 0.9) {
            perpendicular.set(0, 0, 1);
        } else {
            perpendicular.set(0, 1, 0);
        }
        
        const startTick1 = startPoint.clone().add(perpendicular.clone().multiplyScalar(tickLength));
        const startTick2 = startPoint.clone().add(perpendicular.clone().multiplyScalar(-tickLength));
        const startTick = this.meshHandler.createLineMesh([startTick1, startTick2], color);
        
        const endTick1 = endPoint.clone().add(perpendicular.clone().multiplyScalar(tickLength));
        const endTick2 = endPoint.clone().add(perpendicular.clone().multiplyScalar(-tickLength));
        const endTick = this.meshHandler.createLineMesh([endTick1, endTick2], color);
        
        this.sceneHandler.addToScene(line);
        this.sceneHandler.addToScene(startTick);
        this.sceneHandler.addToScene(endTick);
        
        const textPosition = startPoint.clone().add(endPoint).multiplyScalar(0.5);
        textPosition.y += 0.15;
        const textSprite = this.createSelectionDimensionText(text, textPosition, color);
        
        return {
            line,
            startTick,
            endTick,
            textSprite
        };
    }

    createSelectionDimensionText(text, position, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        const colorHex = '#' + color.toString(16).padStart(6, '0');
        context.fillStyle = colorHex;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.strokeStyle = '#ffffff';
        context.lineWidth = 3;
        context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        
        context.fillStyle = '#ffffff';
        context.font = 'bold 20px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            depthTest: false,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(material);
        
        sprite.position.copy(position);
        sprite.scale.set(1.0, 0.25, 1);
        sprite.renderOrder = 999;
        
        this.sceneHandler.addToScene(sprite);
        return sprite;
    }

    createOriginMarker(position) {
        const size = 0.5;
        const elements = [];
        
        const point = this.meshHandler.createSphereMesh(0.05, 0xffffff);
        point.position.copy(position);
        this.sceneHandler.addToScene(point);
        elements.push(point);

        const axes = [
            { color: 0xff0000, direction: new THREE.Vector3(1, 0, 0) },
            { color: 0x00ff00, direction: new THREE.Vector3(0, 1, 0) },
            { color: 0x0000ff, direction: new THREE.Vector3(0, 0, 1) }
        ];

        axes.forEach(axis => {
            const endPoint = position.clone().add(axis.direction.clone().multiplyScalar(size));
            const line = this.meshHandler.createLineMesh([position, endPoint], axis.color);
            this.sceneHandler.addToScene(line);
            elements.push(line);
            
            const arrow = this.createArrow(position, axis.direction, size, axis.color);
            elements.push(arrow);
        });

        return elements;
    }

    createArrow(origin, direction, length, color) {
        const arrowSize = 0.08;
        const arrowLength = 0.15;
        
        const tipPosition = origin.clone().add(direction.clone().multiplyScalar(length));
        const arrow = this.meshHandler.createConeMesh(arrowSize, arrowLength, color);
        
        arrow.position.copy(tipPosition);
        
        if (direction.x > 0.9) {
            arrow.rotation.z = -Math.PI / 2;
        } else if (direction.y > 0.9) {
            // No rotation needed
        } else if (direction.z > 0.9) {
            arrow.rotation.x = Math.PI / 2;
        }
        
        this.sceneHandler.addToScene(arrow);
        return arrow;
    }

    createOriginText(text, position) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 400;
        canvas.height = 64;
        
        context.fillStyle = 'rgba(255, 255, 255, 0.9)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.strokeStyle = '#000000';
        context.lineWidth = 2;
        context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        
        context.fillStyle = '#000000';
        context.font = 'bold 18px monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(`Origin: ${text}`, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            depthTest: false,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(material);
        
        sprite.position.copy(position);
        sprite.scale.set(2.0, 0.32, 1);
        sprite.renderOrder = 998;
        
        this.sceneHandler.addToScene(sprite);
        return sprite;
    }

    addSelectionElement(element) {
        if (Array.isArray(element)) {
            this.selectionElements.push(...element);
        } else {
            this.selectionElements.push(element);
        }
    }

    clearSelectionElements() {
        this.selectionElements.forEach(element => {
            this.sceneHandler.removeFromScene(element);
            this.meshHandler.disposeMesh(element);
        });
        this.selectionElements = [];
    }

    setHoverHighlight(highlight) {
        this.clearHoverHighlight();
        this.hoverHighlight = highlight;
    }

    clearHoverHighlight() {
        if (this.hoverHighlight) {
            this.sceneHandler.removeFromScene(this.hoverHighlight);
            this.meshHandler.disposeMesh(this.hoverHighlight);
            this.hoverHighlight = null;
        }
    }

    setOriginDisplay(display) {
        this.clearOriginDisplay();
        this.originDisplay = display;
    }

    clearOriginDisplay() {
        if (this.originDisplay) {
            this.sceneHandler.removeFromScene(this.originDisplay);
            this.meshHandler.disposeMesh(this.originDisplay);
            this.originDisplay = null;
        }
    }

    clearAll() {
        this.clearSelectionElements();
        this.clearHoverHighlight();
        this.clearOriginDisplay();
    }
}