import * as THREE from 'three';
import { calculateBounds, pointInBounds, calculateDimensions, calculateCenter, generateRectanglePoints, validateRectangleSize } from '../utils/geometry.js';
import { MeshHandler, MaterialHandler, DimensionHandler } from '../handlers/threeHandlers.js';
import { Rectangle } from './Rectangle.js';
import { Box } from './Box.js';
import { CustomExtruder } from './CustomExtruder.js';

export class SketchRectangle {
    constructor(startPoint, endPoint, sceneHandler) {
        this.startPoint = startPoint || new THREE.Vector3();
        this.endPoint = endPoint || new THREE.Vector3();
        this.mesh = null;
        this.extrudedMesh = null;
        this.isExtruded = false;
        this.extrudeHeight = 0;
        this.isPending = false;
        this.isHovered = false;
        this.objectId = null;
        this.stateManager = null;
        this.dimensionLines = [];
        this.dimensionTexts = [];
        this.showDimensions = true;
        
        // Initialize handlers
        this.meshHandler = new MeshHandler(sceneHandler);
        this.materialHandler = new MaterialHandler();
        this.dimensionHandler = new DimensionHandler(sceneHandler, this.meshHandler, this.materialHandler);
        
        // Initialize data separation components
        this.extruder = new CustomExtruder();
        this.rectangle = null;
        this.box = null;
        
        // Create initial rectangle data
        this.updateRectangleData();
    }
    
    setStateManager(stateManager) {
        this.stateManager = stateManager;
    }
    
    update(endPoint) {
        this.endPoint = endPoint;
        this.updateRectangleData();
        this.createMesh();
        if (this.showDimensions) {
            this.createDimensions();
        }
        return this.mesh;
    }
    
    updateRectangleData() {
        // Convert 3D points to 2D for Rectangle class
        const start2D = new THREE.Vector2(this.startPoint.x, this.startPoint.z);
        const end2D = new THREE.Vector2(this.endPoint.x, this.endPoint.z);
        
        if (this.rectangle) {
            this.extruder.updateRectangle(this.rectangle.id, end2D);
        } else {
            this.rectangle = this.extruder.createRectangle(start2D, end2D);
        }
    }
    
    createMesh() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        
        const bounds = calculateBounds(this.startPoint, this.endPoint);
        const pointsData = generateRectanglePoints(bounds, 0);
        
        const points = pointsData.map(p => new THREE.Vector3(p.x, p.y, p.z));
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: this.getLineColor(),
            linewidth: 2 
        });
        
        this.mesh = new THREE.Line(geometry, material);
        
        // Set userData for selection
        this.mesh.userData.sketchRectangle = this;
        this.mesh.userData.objectId = this.objectId;
        
        if (this.showDimensions) {
            this.createDimensions();
        }
        
        return this.mesh;
    }
    
    extrude(height) {
        if (this.extrudedMesh && this.extrudedMesh.parent) {
            this.extrudedMesh.parent.remove(this.extrudedMesh);
            this.extrudedMesh = null;
        }
        
        this.extrudeHeight = Math.max(0, height);
        
        if (!this.rectangle) {
            this.updateRectangleData();
        }
        
        // Use CustomExtruder to create Box from Rectangle
        if (this.rectangle && this.rectangle.isValid() && this.extrudeHeight > 0.1) {
            this.box = this.extruder.extrudeRectangle(this.rectangle.id, this.extrudeHeight);
            
            if (this.box) {
                // Set visual state
                this.box.setPending(this.isPending);
                this.box.setHovered(this.isHovered);
                
                // Create 3D mesh
                this.extrudedMesh = this.box.createMesh();
                
                // Set userData for selection
                this.extrudedMesh.userData.sketchRectangle = this;
                this.extrudedMesh.userData.objectId = this.objectId;
                this.extrudedMesh.userData.box = this.box;
                
                this.isExtruded = true;
                
                if (this.mesh) {
                    this.mesh.material.color.setHex(this.isPending ? 0xff9500 : 0x666666);
                }
            }
        }
        
        return this.extrudedMesh;
    }
    
    confirmExtrusion() {
        this.isPending = false;
        this.isExtruded = true;
        if (this.extrudedMesh) {
            this.extrudedMesh.material.color.setHex(0x4a90e2);
            this.extrudedMesh.material.opacity = 0.8;
        }
        if (this.mesh) {
            this.mesh.material.color.setHex(0x666666);
        }
        
        // Update object list
        if (this.stateManager) {
            this.stateManager.updateSketchInObjectList(this);
        }
    }
    
    cancelExtrusion() {
        if (this.extrudedMesh && this.extrudedMesh.parent) {
            this.extrudedMesh.parent.remove(this.extrudedMesh);
            this.extrudedMesh = null;
        }
        this.isExtruded = false;
        this.isPending = false;
        this.extrudeHeight = 0;
        if (this.mesh) {
            this.mesh.material.color.setHex(0x007acc);
        }
    }
    
    setPending() {
        this.isPending = true;
        if (this.extrudedMesh) {
            this.extrudedMesh.material.color.setHex(0xff9500);
            this.extrudedMesh.material.opacity = 0.6;
        }
        this.updateLineColor();
    }
    
    setHovered(hovered) {
        this.isHovered = hovered;
        this.updateLineColor();
    }
    
    getLineColor() {
        if (this.isPending) return 0xff9500;
        if (this.isHovered && !this.isExtruded) return 0x00ccff;
        if (this.isExtruded) return 0x666666;
        return 0x007acc;
    }
    
    updateLineColor() {
        if (this.mesh) {
            this.mesh.material.color.setHex(this.getLineColor());
        }
    }
    
    getBounds() {
        return calculateBounds(this.startPoint, this.endPoint);
    }
    
    containsPoint(point) {
        const bounds = this.getBounds();
        return pointInBounds(point, bounds);
    }
    
    createDimensions() {
        this.clearDimensions();
        
        if (!this.mesh || !this.mesh.parent) return;
        
        const bounds = this.getBounds();
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxZ - bounds.minZ;
        
        if (width < 0.1 || height < 0.1) return;
        
        const offset = 0.5;
        
        this.createWidthDimension(bounds, offset);
        this.createHeightDimension(bounds, offset);
    }
    
    createWidthDimension(bounds, offset) {
        const width = bounds.maxX - bounds.minX;
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const y = 0.01;
        const z = bounds.minZ - offset;
        
        const points = [
            new THREE.Vector3(bounds.minX, y, z),
            new THREE.Vector3(bounds.maxX, y, z)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x888888,
            linewidth: 1
        });
        
        const dimensionLine = new THREE.Line(geometry, material);
        this.dimensionLines.push(dimensionLine);
        this.mesh.parent.add(dimensionLine);
        
        const tickGeometry1 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(bounds.minX, y, z - 0.1),
            new THREE.Vector3(bounds.minX, y, z + 0.1)
        ]);
        const tickGeometry2 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(bounds.maxX, y, z - 0.1),
            new THREE.Vector3(bounds.maxX, y, z + 0.1)
        ]);
        
        const tick1 = new THREE.Line(tickGeometry1, material);
        const tick2 = new THREE.Line(tickGeometry2, material);
        this.dimensionLines.push(tick1, tick2);
        this.mesh.parent.add(tick1);
        this.mesh.parent.add(tick2);
        
        this.createDimensionText(width.toFixed(2), new THREE.Vector3(centerX, y, z - 0.2));
    }
    
    createHeightDimension(bounds, offset) {
        const height = bounds.maxZ - bounds.minZ;
        const centerZ = (bounds.minZ + bounds.maxZ) / 2;
        const y = 0.01;
        const x = bounds.maxX + offset;
        
        const points = [
            new THREE.Vector3(x, y, bounds.minZ),
            new THREE.Vector3(x, y, bounds.maxZ)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x888888,
            linewidth: 1
        });
        
        const dimensionLine = new THREE.Line(geometry, material);
        this.dimensionLines.push(dimensionLine);
        this.mesh.parent.add(dimensionLine);
        
        const tickGeometry1 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x - 0.1, y, bounds.minZ),
            new THREE.Vector3(x + 0.1, y, bounds.minZ)
        ]);
        const tickGeometry2 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x - 0.1, y, bounds.maxZ),
            new THREE.Vector3(x + 0.1, y, bounds.maxZ)
        ]);
        
        const tick1 = new THREE.Line(tickGeometry1, material);
        const tick2 = new THREE.Line(tickGeometry2, material);
        this.dimensionLines.push(tick1, tick2);
        this.mesh.parent.add(tick1);
        this.mesh.parent.add(tick2);
        
        this.createDimensionText(height.toFixed(2), new THREE.Vector3(x + 0.2, y, centerZ));
    }
    
    createDimensionText(text, position) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.strokeStyle = '#ffffff';
        context.lineWidth = 2;
        context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        
        context.fillStyle = '#ffffff';
        context.font = 'bold 24px Arial';
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
        sprite.position.y += 0.1;
        sprite.scale.set(1.0, 0.25, 1);
        sprite.renderOrder = 1000;
        
        this.dimensionTexts.push(sprite);
        this.mesh.parent.add(sprite);
    }
    
    clearDimensions() {
        this.dimensionLines.forEach(line => {
            if (line.parent) {
                line.parent.remove(line);
            }
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
        });
        this.dimensionTexts.forEach(text => {
            if (text.parent) {
                text.parent.remove(text);
            }
            if (text.material) {
                if (text.material.map) text.material.map.dispose();
                text.material.dispose();
            }
        });
        this.dimensionLines = [];
        this.dimensionTexts = [];
    }
    
    updateDimensions() {
        if (this.showDimensions) {
            this.clearDimensions();
            this.createDimensions();
        }
    }
    
    updateFromTransform(position, scale) {
        // Calculate new dimensions based on current startPoint and endPoint
        const currentWidth = Math.abs(this.endPoint.x - this.startPoint.x);
        const currentDepth = Math.abs(this.endPoint.z - this.startPoint.z);
        
        // Apply scale to dimensions
        const newWidth = currentWidth * scale.x;
        const newDepth = currentDepth * scale.z;
        
        // Update start and end points based on new position and scale
        this.startPoint.set(
            position.x - newWidth / 2,
            position.y,
            position.z - newDepth / 2
        );
        
        this.endPoint.set(
            position.x + newWidth / 2,
            position.y,
            position.z + newDepth / 2
        );
        
        // If extruded, update height
        if (this.isExtruded) {
            this.extrudeHeight *= scale.y;
        }
        
        // Recreate the mesh with new coordinates
        this.createMesh();
        
        // If extruded, recreate the extruded mesh
        if (this.isExtruded && this.extrudeHeight > 0.1) {
            this.extrude(this.extrudeHeight);
        }
        
        // Update dimensions
        this.updateDimensions();
    }
    
    setDimensionsVisible(visible) {
        this.showDimensions = visible;
        if (visible) {
            this.createDimensions();
        } else {
            this.clearDimensions();
        }
    }
    
    remove() {
        this.clearDimensions();
        if (this.mesh) {
            if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
        }
        if (this.extrudedMesh) {
            if (this.extrudedMesh.parent) this.extrudedMesh.parent.remove(this.extrudedMesh);
            if (this.extrudedMesh.geometry) this.extrudedMesh.geometry.dispose();
            if (this.extrudedMesh.material) {
                if (this.extrudedMesh.material.map) this.extrudedMesh.material.map.dispose();
                this.extrudedMesh.material.dispose();
            }
        }
    }
}