/**
 * AxisTriad
 * Fixed 3D axis indicator displayed at the bottom-left of the viewport
 * Follows main camera rotation to show XYZ axis orientations
 */
import * as THREE from 'three';

export class AxisTriad {
    constructor(camera) {
        this.camera = camera;
        this.container = null;
        this.scene = null;
        this.triadCamera = null;
        this.renderer = null;
        this.axes = null;

        this.init();
    }

    init() {
        // Create container element
        this.container = document.createElement('div');
        this.container.id = 'axis-triad';
        this.container.style.cssText = `
            position: absolute;
            bottom: 45px;
            left: 10px;
            width: 100px;
            height: 100px;
            z-index: 1000;
            pointer-events: none;
        `;
        document.getElementById('canvas-container').appendChild(this.container);

        // Create dedicated scene and camera
        this.scene = new THREE.Scene();

        // Use orthographic camera (no perspective)
        this.triadCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 10);
        this.triadCamera.position.set(0, 0, 5);
        this.triadCamera.lookAt(0, 0, 0);

        // Add lights to give a 3D appearance
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);

        // Create dedicated renderer
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(100, 100);
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);

        // Create axes
        this.createAxes();

        // Animation loop
        this.animate();
    }

    createAxes() {
        // Axis length
        const axisLength = 1.5;
        const arrowSize = 0.15;
        const labelOffset = 0.35;

        // X axis (red)
        const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(axisLength, 0, 0)
        ]);
        const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
        const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
        this.scene.add(xAxis);

        // X axis arrow
        const xArrowGeometry = new THREE.ConeGeometry(arrowSize / 2, arrowSize * 2, 8);
        const xArrowMaterial = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const xArrow = new THREE.Mesh(xArrowGeometry, xArrowMaterial);
        xArrow.position.set(axisLength, 0, 0);
        xArrow.rotation.z = -Math.PI / 2;
        this.scene.add(xArrow);

        // X axis label
        this.createLabel('X', axisLength + labelOffset, 0, 0, 0xef4444);

        // Y axis (green)
        const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, axisLength, 0)
        ]);
        const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x22c55e, linewidth: 2 });
        const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
        this.scene.add(yAxis);

        // Y axis arrow
        const yArrowGeometry = new THREE.ConeGeometry(arrowSize / 2, arrowSize * 2, 8);
        const yArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        const yArrow = new THREE.Mesh(yArrowGeometry, yArrowMaterial);
        yArrow.position.set(0, axisLength, 0);
        this.scene.add(yArrow);

        // Y axis label
        this.createLabel('Y', 0, axisLength + labelOffset, 0, 0x22c55e);

        // Z axis (blue)
        const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, axisLength)
        ]);
        const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
        const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
        this.scene.add(zAxis);

        // Z axis arrow
        const zArrowGeometry = new THREE.ConeGeometry(arrowSize / 2, arrowSize * 2, 8);
        const zArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
        const zArrow = new THREE.Mesh(zArrowGeometry, zArrowMaterial);
        zArrow.position.set(0, 0, axisLength);
        zArrow.rotation.x = Math.PI / 2;
        this.scene.add(zArrow);

        // Z axis label
        this.createLabel('Z', 0, 0, axisLength + labelOffset, 0x3b82f6);

        // Origin sphere
        const originGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const originMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const origin = new THREE.Mesh(originGeometry, originMaterial);
        this.scene.add(origin);
    }

    createLabel(text, x, y, z, color) {
        // Create text sprite
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 128;

        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.font = 'Bold 80px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            sizeAttenuation: false
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(x, y, z);
        sprite.scale.set(0.4, 0.4, 0.4);

        this.scene.add(sprite);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.triadCamera);
    }

    update() {
        // Copy main camera rotation
        if (this.camera) {
            this.triadCamera.rotation.copy(this.camera.rotation);
            this.triadCamera.quaternion.copy(this.camera.quaternion);
        }
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}
