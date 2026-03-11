import * as THREE from 'three';

/**
 * BoxSelectManager — drag-to-select multiple objects.
 *
 * Usage:
 *   const bsm = new BoxSelectManager(sceneManager, stateManager);
 *   bsm.init(canvas);
 *   bsm.onBoxSelect = (meshes, additive) => { ... };
 *
 * Active only when stateManager.currentMode === 'select'
 * and no TransformControls drag is ongoing.
 */
export class BoxSelectManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;

        this._canvas = null;
        this._overlay = null;
        this._active = false;   // Rectangle is being drawn
        this._moved = false;    // Mouse has moved enough to trigger box select
        this._startX = 0;
        this._startY = 0;

        /** Callback: (meshes: THREE.Mesh[], additive: boolean) => void */
        this.onBoxSelect = null;

        this._boundMouseDown = this._onMouseDown.bind(this);
        this._boundMouseMove = this._onMouseMove.bind(this);
        this._boundMouseUp   = this._onMouseUp.bind(this);
    }

    init(canvas) {
        this._canvas = canvas;
        this._overlay = this._createOverlay();

        canvas.addEventListener('mousedown', this._boundMouseDown);
        window.addEventListener('mousemove', this._boundMouseMove);
        window.addEventListener('mouseup',   this._boundMouseUp);
    }

    dispose() {
        if (this._canvas) {
            this._canvas.removeEventListener('mousedown', this._boundMouseDown);
        }
        window.removeEventListener('mousemove', this._boundMouseMove);
        window.removeEventListener('mouseup',   this._boundMouseUp);
        if (this._overlay && this._overlay.parentNode) {
            this._overlay.parentNode.removeChild(this._overlay);
        }
    }

    // ── private ──────────────────────────────────────────────────────────────

    _isEnabled() {
        return this.stateManager.currentMode === 'select';
    }

    _createOverlay() {
        const div = document.createElement('div');
        div.id = 'box-select-rect';
        div.style.cssText = [
            'position:fixed',
            'border:1px dashed #ff9500',
            'background:rgba(255,149,0,0.08)',
            'pointer-events:none',
            'display:none',
            'z-index:900',
        ].join(';');
        document.body.appendChild(div);
        return div;
    }

    _onMouseDown(e) {
        if (e.button !== 0) return;
        if (!this._isEnabled()) return;

        this._startX = e.clientX;
        this._startY = e.clientY;
        this._active = false;
        this._moved  = false;
    }

    _onMouseMove(e) {
        // Left button must be held
        if (!(e.buttons & 1)) {
            if (this._active) this._cancelDrag();
            return;
        }
        if (!this._isEnabled()) return;

        const dx = e.clientX - this._startX;
        const dy = e.clientY - this._startY;

        if (!this._moved && Math.sqrt(dx * dx + dy * dy) > 6) {
            this._moved = true;
            this._active = true;
        }

        if (!this._active) return;

        const left   = Math.min(this._startX, e.clientX);
        const top    = Math.min(this._startY, e.clientY);
        const width  = Math.abs(dx);
        const height = Math.abs(dy);

        const ov = this._overlay;
        ov.style.display = 'block';
        ov.style.left    = left   + 'px';
        ov.style.top     = top    + 'px';
        ov.style.width   = width  + 'px';
        ov.style.height  = height + 'px';
    }

    _onMouseUp(e) {
        if (!this._active) return;
        this._cancelDrag(); // hide overlay

        const rect    = this._canvas.getBoundingClientRect();
        const camera  = this.sceneManager.camera;

        // Convert screen rect to NDC (Normalized Device Coordinates)
        const ndcX1 = (Math.min(this._startX, e.clientX) - rect.left) / rect.width  * 2 - 1;
        const ndcY1 = -((Math.min(this._startY, e.clientY) - rect.top)  / rect.height * 2 - 1);
        const ndcX2 = (Math.max(this._startX, e.clientX) - rect.left) / rect.width  * 2 - 1;
        const ndcY2 = -((Math.max(this._startY, e.clientY) - rect.top)  / rect.height * 2 - 1);

        // Pick objects whose projected center lies within the box
        const selected = this._findObjectsInNdcRect(ndcX1, ndcY1, ndcX2, ndcY2, camera);

        if (this.onBoxSelect) {
            this.onBoxSelect(selected, e.shiftKey);
        }
    }

    _cancelDrag() {
        this._active = false;
        if (this._overlay) this._overlay.style.display = 'none';
    }

    /**
     * Return extruded meshes whose world-space center projects inside the NDC rect.
     * NDC: x in [-1,1], y in [-1,1] with y1 < y2 (top NDC < bottom NDC in screen space).
     */
    _findObjectsInNdcRect(x1, y1, x2, y2, camera) {
        const meshes   = this.stateManager.sketches
            .filter(s => s.isExtruded && s.extrudedMesh && s.extrudedMesh.visible)
            .map(s => s.extrudedMesh);

        const tempV  = new THREE.Vector3();
        const result = [];

        for (const mesh of meshes) {
            // Use mesh world-space center
            tempV.setFromMatrixPosition(mesh.matrixWorld);
            tempV.project(camera);

            // Note: after project(), y is inverted relative to screen (up = +1)
            // y1 and y2 here are already in [-1,1] with y1=top(larger), y2=bottom(smaller)
            // But we built them as: y1 = top screen (smaller y) → larger NDC y
            // Let's just compare both ways with min/max
            const nx = tempV.x;
            const ny = tempV.y;

            if (nx >= x1 && nx <= x2 && ny >= Math.min(y1, y2) && ny <= Math.max(y1, y2)) {
                result.push(mesh);
            }
        }

        return result;
    }
}
