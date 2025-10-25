/**
 * AxisTriad
 * 画面左下に固定表示される3D軸インジケーター
 * カメラの回転に追従してXYZ軸の方向を視覚的に表示
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
        // コンテナ要素を作成
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

        // 専用のシーンとカメラを作成
        this.scene = new THREE.Scene();

        // 平行投影カメラを使用（遠近感なし）
        this.triadCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 10);
        this.triadCamera.position.set(0, 0, 5);

        // 専用のレンダラーを作成
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(100, 100);
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);

        // 軸を作成
        this.createAxes();

        // アニメーションループ
        this.animate();
    }

    createAxes() {
        // 軸の長さ
        const axisLength = 1.5;
        const arrowSize = 0.15;
        const labelOffset = 0.3;

        // X軸（赤）
        const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(axisLength, 0, 0)
        ]);
        const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
        const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
        this.scene.add(xAxis);

        // X軸の矢印
        const xArrowGeometry = new THREE.ConeGeometry(arrowSize / 2, arrowSize * 2, 8);
        const xArrowMaterial = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const xArrow = new THREE.Mesh(xArrowGeometry, xArrowMaterial);
        xArrow.position.set(axisLength, 0, 0);
        xArrow.rotation.z = -Math.PI / 2;
        this.scene.add(xArrow);

        // X軸ラベル
        this.createLabel('X', axisLength + labelOffset, 0, 0, 0xef4444);

        // Y軸（緑）
        const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, axisLength, 0)
        ]);
        const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x22c55e, linewidth: 2 });
        const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
        this.scene.add(yAxis);

        // Y軸の矢印
        const yArrowGeometry = new THREE.ConeGeometry(arrowSize / 2, arrowSize * 2, 8);
        const yArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        const yArrow = new THREE.Mesh(yArrowGeometry, yArrowMaterial);
        yArrow.position.set(0, axisLength, 0);
        this.scene.add(yArrow);

        // Y軸ラベル
        this.createLabel('Y', 0, axisLength + labelOffset, 0, 0x22c55e);

        // Z軸（青）
        const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, axisLength)
        ]);
        const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
        const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
        this.scene.add(zAxis);

        // Z軸の矢印
        const zArrowGeometry = new THREE.ConeGeometry(arrowSize / 2, arrowSize * 2, 8);
        const zArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
        const zArrow = new THREE.Mesh(zArrowGeometry, zArrowMaterial);
        zArrow.position.set(0, 0, axisLength);
        zArrow.rotation.x = Math.PI / 2;
        this.scene.add(zArrow);

        // Z軸ラベル
        this.createLabel('Z', 0, 0, axisLength + labelOffset, 0x3b82f6);

        // 原点の球
        const originGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const originMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const origin = new THREE.Mesh(originGeometry, originMaterial);
        this.scene.add(origin);
    }

    createLabel(text, x, y, z, color) {
        // テキストスプライトを作成
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 64;

        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.font = 'Bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(x, y, z);
        sprite.scale.set(0.5, 0.5, 0.5);

        this.scene.add(sprite);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.triadCamera);
    }

    update() {
        // メインカメラの回転をコピー
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
