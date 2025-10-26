/**
 * ViewCube
 * 画面右上に表示される3Dビューコントロール
 * Autodesk製品の標準機能を再現
 */
import * as THREE from 'three';

export class ViewCube {
    constructor(camera, controls) {
        this.mainCamera = camera;
        this.controls = controls;
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cube = null;
        this.isHovering = false;
        this.hoveredFace = null;

        // View definitions
        this.views = {
            front: { position: [0, 0, 5], name: '正面' },
            back: { position: [0, 0, -5], name: '背面' },
            left: { position: [-5, 0, 0], name: '左' },
            right: { position: [5, 0, 0], name: '右' },
            top: { position: [0, 5, 0], name: '上' },
            bottom: { position: [0, -5, 0], name: '下' }
        };

        this.init();
    }

    init() {
        // コンテナ要素を作成
        this.container = document.createElement('div');
        this.container.id = 'view-cube';
        this.container.style.cssText = `
            position: absolute;
            top: 142px;
            left: 10px;
            width: 120px;
            height: 120px;
            z-index: 1000;
            cursor: pointer;
            border-radius: 8px;
            background: rgba(42, 42, 42, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(10px);
        `;
        document.getElementById('canvas-container').appendChild(this.container);

        // 専用のシーンとカメラを作成
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        this.camera.position.set(3, 3, 3);
        this.camera.lookAt(0, 0, 0);

        // 専用のレンダラーを作成
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(120, 120);
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);

        // キューブを作成
        this.createCube();

        // イベントリスナー
        this.setupEventListeners();

        // アニメーションループ
        this.animate();
    }

    createCube() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);

        // 各面に異なる色を設定
        const materials = [
            new THREE.MeshBasicMaterial({ color: 0x6b6b7b, transparent: true, opacity: 0.8 }), // Right (X+)
            new THREE.MeshBasicMaterial({ color: 0x5b5b6b, transparent: true, opacity: 0.8 }), // Left (X-)
            new THREE.MeshBasicMaterial({ color: 0x7b7b8b, transparent: true, opacity: 0.8 }), // Top (Y+)
            new THREE.MeshBasicMaterial({ color: 0x4b4b5b, transparent: true, opacity: 0.8 }), // Bottom (Y-)
            new THREE.MeshBasicMaterial({ color: 0x8b8b9b, transparent: true, opacity: 0.8 }), // Front (Z+)
            new THREE.MeshBasicMaterial({ color: 0x3b3b4b, transparent: true, opacity: 0.8 })  // Back (Z-)
        ];

        this.cube = new THREE.Mesh(geometry, materials);

        // エッジを追加
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        this.cube.add(wireframe);

        this.scene.add(this.cube);

        // ラベルを追加
        this.addLabels();
    }

    addLabels() {
        const labels = [
            { text: 'R', position: [0.6, 0, 0], color: 0xffffff },   // Right
            { text: 'L', position: [-0.6, 0, 0], color: 0xffffff },  // Left
            { text: 'T', position: [0, 0.6, 0], color: 0xffffff },   // Top
            { text: 'B', position: [0, -0.6, 0], color: 0xffffff },  // Bottom
            { text: 'F', position: [0, 0, 0.6], color: 0xffffff },   // Front
            { text: 'K', position: [0, 0, -0.6], color: 0xffffff }   // Back
        ];

        labels.forEach(({ text, position, color }) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 64;
            canvas.height = 64;

            context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
            context.font = 'Bold 32px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, 32, 32);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.set(...position);
            sprite.scale.set(0.3, 0.3, 0.3);

            this.cube.add(sprite);
        });
    }

    setupEventListeners() {
        this.container.addEventListener('click', this.onClick.bind(this));
        this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.container.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    }

    onClick(event) {
        const face = this.detectFace(event);
        if (face) {
            this.setView(face);
        }
    }

    onMouseMove(event) {
        const face = this.detectFace(event);
        if (face !== this.hoveredFace) {
            this.hoveredFace = face;
            this.updateHoverState();
        }
    }

    onMouseLeave() {
        this.hoveredFace = null;
        this.updateHoverState();
    }

    detectFace(event) {
        const rect = this.container.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(x, y);
        raycaster.setFromCamera(mouse, this.camera);

        const intersects = raycaster.intersectObject(this.cube);
        if (intersects.length > 0) {
            const faceIndex = intersects[0].faceIndex;
            // Convert face index to view name
            const faceMap = ['right', 'right', 'left', 'left', 'top', 'top', 'bottom', 'bottom', 'front', 'front', 'back', 'back'];
            return faceMap[faceIndex] || null;
        }
        return null;
    }

    updateHoverState() {
        // Reset all materials
        this.cube.material.forEach((material, index) => {
            const baseOpacity = 0.8;
            const hoverOpacity = 1.0;

            const faceMap = ['right', 'left', 'top', 'bottom', 'front', 'back'];
            const isHovered = faceMap[index] === this.hoveredFace;

            material.opacity = isHovered ? hoverOpacity : baseOpacity;
        });
    }

    setView(viewName) {
        const view = this.views[viewName];
        if (!view) return;

        const targetPosition = new THREE.Vector3(...view.position);
        const currentDistance = this.mainCamera.position.distanceTo(this.controls.target);

        // Normalize and scale to maintain current distance
        targetPosition.normalize().multiplyScalar(currentDistance);
        targetPosition.add(this.controls.target);

        // Smooth camera transition
        this.animateCameraTo(targetPosition, this.controls.target);

        console.log(`ViewCube: Switched to ${view.name} view`);
    }

    animateCameraTo(targetPosition, targetLookAt) {
        const startPosition = this.mainCamera.position.clone();
        const startLookAt = this.controls.target.clone();

        const duration = 500; // ms
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-in-out)
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            // Interpolate position
            this.mainCamera.position.lerpVectors(startPosition, targetPosition, eased);
            this.controls.target.lerpVectors(startLookAt, targetLookAt, eased);
            this.controls.update();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }

    update() {
        // Sync cube rotation with main camera
        if (this.mainCamera && this.cube) {
            this.cube.rotation.copy(this.mainCamera.rotation);
            this.cube.quaternion.copy(this.mainCamera.quaternion);
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
