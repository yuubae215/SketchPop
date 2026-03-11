import * as THREE from 'three';

/**
 * MeasurementManager — in-viewport measurement tools.
 *
 * Distance mode: click two points in the scene; a dimension annotation appears.
 * Face area mode: click an extruded face; its area is displayed.
 * Press M to cycle modes (off → distance → area → off).
 * Press Escape or M again to cancel / clear.
 */
export class MeasurementManager {
    /**
     * @param {SceneManager} sceneManager
     * @param {StateManager} stateManager
     */
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;

        /** @type {'off'|'distance'|'area'} */
        this.mode = 'off';

        /** Pending first click point for distance measurement */
        this._pointA = null;

        /** All 3D annotations (lines + sprites) added to scene */
        this._annotations = [];

        /** Temporary preview line while waiting for second click */
        this._previewLine = null;

        /** Track latest mouse world position for preview */
        this._mouseWorld = null;

        this._bound_onMouseMove = this._onMouseMove.bind(this);
        this._bound_onClick = this._onClick.bind(this);
    }

    // ── Public ─────────────────────────────────────────────────────────────

    /** Cycle through modes: off → distance → area → off */
    cycleMode() {
        const next = { off: 'distance', distance: 'area', area: 'off' };
        this.setMode(next[this.mode]);
    }

    setMode(mode) {
        this._cleanupPreview();
        this._pointA = null;
        this.mode = mode;

        if (mode !== 'off') {
            this.sceneManager.renderer.domElement.addEventListener('mousemove', this._bound_onMouseMove);
            this.sceneManager.renderer.domElement.addEventListener('click', this._bound_onClick, true);
        } else {
            this._removeListeners();
        }
    }

    clearAll() {
        this._annotations.forEach(obj => {
            if (obj.parent) obj.parent.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (obj.material.map) obj.material.map.dispose();
                obj.material.dispose();
            }
        });
        this._annotations = [];
        this._cleanupPreview();
        this._pointA = null;
    }

    get isActive() {
        return this.mode !== 'off';
    }

    // ── Mouse handlers ─────────────────────────────────────────────────────

    _onMouseMove(event) {
        const world = this.sceneManager.getMouseIntersection(event);
        this._mouseWorld = world;

        if (this.mode === 'distance' && this._pointA && world) {
            this._updatePreviewLine(this._pointA, world);
        }
    }

    _onClick(event) {
        if (this.mode === 'off') return;
        // Don't consume right-clicks
        if (event.button !== 0) return;

        if (this.mode === 'distance') {
            this._handleDistanceClick(event);
        } else if (this.mode === 'area') {
            this._handleAreaClick(event);
        }
    }

    // ── Distance measurement ───────────────────────────────────────────────

    _handleDistanceClick(event) {
        const world = this.sceneManager.getMouseIntersection(event);
        if (!world) return;

        if (!this._pointA) {
            this._pointA = world.clone();
            // Place a small point marker
            this._addPointMarker(this._pointA);
            // Don't stop propagation — first click just sets origin
        } else {
            const pB = world.clone();
            const dist = this._pointA.distanceTo(pB);
            this._addDistanceAnnotation(this._pointA, pB, dist);
            this._cleanupPreview();
            this._pointA = null;
            // Stop so InteractionManager doesn't also act on this click
            event.stopImmediatePropagation();
        }
    }

    _addPointMarker(pos) {
        const geo = new THREE.SphereGeometry(0.07, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00bfff, depthTest: false });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.renderOrder = 999;
        this.sceneManager.scene.add(mesh);
        this._annotations.push(mesh);
    }

    _addDistanceAnnotation(pA, pB, dist) {
        // Dimension line
        const lineGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x00bfff, depthTest: false });
        lineMat.depthWrite = false;
        const line = new THREE.Line(lineGeo, lineMat);
        line.renderOrder = 998;
        this.sceneManager.scene.add(line);
        this._annotations.push(line);

        // End-point marker
        this._addPointMarker(pB);

        // Text sprite at midpoint
        const mid = pA.clone().lerp(pB, 0.5);
        mid.y += 0.15;
        const label = `${dist.toFixed(2)} u`;
        this._addTextSprite(label, mid, 0x00bfff);
    }

    // ── Area measurement ───────────────────────────────────────────────────

    _handleAreaClick(event) {
        // Raycast against extruded mesh faces
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width)  * 2 - 1,
            -((event.clientY - rect.top)  / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.sceneManager.camera);

        const meshes = this.stateManager.sketches
            .filter(s => s.isExtruded && s.extrudedMesh)
            .map(s => s.extrudedMesh);

        if (meshes.length === 0) return;

        const hits = raycaster.intersectObjects(meshes, false);
        if (hits.length === 0) return;

        const hit = hits[0];
        const area = this._computeFaceGroupArea(hit.object, hit.face);

        if (area <= 0) return;

        const pos = hit.point.clone();
        pos.y += 0.2;
        this._addTextSprite(`${area.toFixed(2)} u²`, pos, 0xffa500);

        event.stopImmediatePropagation();
    }

    /**
     * Compute the surface area of the planar face group that contains `targetFace`.
     * CustomExtruder creates 6 face groups (4 triangles per face = 2 tris).
     * Each face group shares the same normal.
     */
    _computeFaceGroupArea(mesh, targetFace) {
        const geo = mesh.geometry;
        const pos = geo.attributes.position;
        const idx = geo.index ? geo.index.array : null;

        // Normal of clicked triangle
        const n0 = targetFace.normal.clone().transformDirection(mesh.matrixWorld).normalize();

        let area = 0;
        const triCount = idx ? idx.length / 3 : pos.count / 3;
        const vA = new THREE.Vector3();
        const vB = new THREE.Vector3();
        const vC = new THREE.Vector3();
        const normal = new THREE.Vector3();

        for (let i = 0; i < triCount; i++) {
            const ia = idx ? idx[i * 3]     : i * 3;
            const ib = idx ? idx[i * 3 + 1] : i * 3 + 1;
            const ic = idx ? idx[i * 3 + 2] : i * 3 + 2;

            vA.fromBufferAttribute(pos, ia).applyMatrix4(mesh.matrixWorld);
            vB.fromBufferAttribute(pos, ib).applyMatrix4(mesh.matrixWorld);
            vC.fromBufferAttribute(pos, ic).applyMatrix4(mesh.matrixWorld);

            // Triangle normal
            const ab = vB.clone().sub(vA);
            const ac = vC.clone().sub(vA);
            normal.crossVectors(ab, ac);
            const len = normal.length();
            if (len < 1e-10) continue;
            normal.divideScalar(len);

            // Same face group?
            if (Math.abs(normal.dot(n0)) > 0.99) {
                area += len * 0.5;
            }
        }
        return area;
    }

    // ── Preview line ───────────────────────────────────────────────────────

    _updatePreviewLine(pA, pB) {
        if (this._previewLine) {
            this.sceneManager.scene.remove(this._previewLine);
            this._previewLine.geometry.dispose();
        }
        const geo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
        const mat = new THREE.LineBasicMaterial({ color: 0x00bfff, opacity: 0.5, transparent: true, depthTest: false });
        this._previewLine = new THREE.Line(geo, mat);
        this._previewLine.renderOrder = 997;
        this.sceneManager.scene.add(this._previewLine);
    }

    _cleanupPreview() {
        if (this._previewLine) {
            if (this._previewLine.parent) this._previewLine.parent.remove(this._previewLine);
            this._previewLine.geometry.dispose();
            this._previewLine.material.dispose();
            this._previewLine = null;
        }
    }

    // ── Text sprite ────────────────────────────────────────────────────────

    _addTextSprite(text, position, color = 0x00bfff) {
        const hex = '#' + color.toString(16).padStart(6, '0');
        const canvas = document.createElement('canvas');
        canvas.width  = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();
        ctx.roundRect(0, 0, 256, 64, 8);
        ctx.fill();

        ctx.strokeStyle = hex;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(2, 2, 252, 60, 7);
        ctx.stroke();

        ctx.fillStyle = hex;
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(position);
        sprite.scale.set(1.4, 0.35, 1);
        sprite.renderOrder = 1001;
        this.sceneManager.scene.add(sprite);
        this._annotations.push(sprite);
    }

    // ── Cleanup ────────────────────────────────────────────────────────────

    _removeListeners() {
        this.sceneManager.renderer.domElement.removeEventListener('mousemove', this._bound_onMouseMove);
        this.sceneManager.renderer.domElement.removeEventListener('click', this._bound_onClick, true);
    }

    dispose() {
        this.clearAll();
        this._removeListeners();
    }
}
