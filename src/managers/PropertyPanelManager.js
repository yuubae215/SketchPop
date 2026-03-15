/**
 * PropertyPanelManager: Right slide-in panel that shows selected object properties.
 *
 * Displays:
 *  - Object name
 *  - Position (X, Y, Z) — editable, moves the mesh
 *  - Dimensions (W × D × H) — H is editable, W/D are read-only display
 */

export class PropertyPanelManager {
    constructor() {
        this._panel = null;
        this._currentSketch = null;
        this._onPositionChange = null; // optional external callback
    }

    /** Call after DOM is ready */
    init() {
        this._panel = document.getElementById('property-panel');
        if (!this._panel) return;
        this._setupListeners();
    }

    /** Show panel and populate with sketch data */
    show(sketch) {
        this._currentSketch = sketch;
        this._populate(sketch);
        if (this._panel) this._panel.classList.add('visible');
    }

    /** Hide the panel */
    hide() {
        this._currentSketch = null;
        if (this._panel) this._panel.classList.remove('visible');
    }

    /** Refresh displayed values (call after transform / face extrusion) */
    refresh() {
        if (this._currentSketch) this._populate(this._currentSketch);
    }

    // ── Private ────────────────────────────────────────────────────────────

    _populate(sketch) {
        if (!sketch) return;

        // Name
        const index = sketch.objectId ? sketch.objectId.split('_')[1] : '';
        const name = sketch.isExtruded ? `Box` : `Sketch`;
        this._set('prop-obj-name', name, true);

        // Position from the 3D mesh (or 0 if 2D only)
        const mesh = sketch.extrudedMesh;
        const px = mesh ? mesh.position.x : 0;
        const py = mesh ? mesh.position.y : 0;
        const pz = mesh ? mesh.position.z : 0;

        this._setInput('prop-pos-x', px);
        this._setInput('prop-pos-y', py);
        this._setInput('prop-pos-z', pz);

        // Dimensions from sketch bounds
        const bounds = sketch.getBounds();
        const w = Math.abs(bounds.maxX - bounds.minX);
        const d = Math.abs(bounds.maxZ - bounds.minZ);
        const h = sketch.extrudeHeight || 0;

        this._setInput('prop-dim-w', w, true);  // read-only
        this._setInput('prop-dim-d', d, true);  // read-only
        this._setInput('prop-dim-h', h);
    }

    _set(id, text, isText = false) {
        const el = document.getElementById(id);
        if (!el) return;
        if (isText) el.textContent = text;
        else el.value = text;
    }

    _setInput(id, value, readOnly = false) {
        const el = document.getElementById(id);
        if (!el) return;
        // Don't overwrite while user is actively editing this field
        if (el === document.activeElement) return;
        el.value = parseFloat(value).toFixed(2);
        el.readOnly = readOnly;
        el.classList.toggle('readonly', readOnly);
    }

    _setupListeners() {
        // Position X / Y / Z
        ['x', 'y', 'z'].forEach(axis => {
            const el = document.getElementById(`prop-pos-${axis}`);
            if (!el) return;
            el.addEventListener('change', () => {
                const sketch = this._currentSketch;
                if (!sketch || !sketch.extrudedMesh) return;
                const val = parseFloat(el.value);
                if (!isNaN(val)) {
                    sketch.extrudedMesh.position[axis] = val;
                }
            });
        });

        // Height (H) — re-extrude with new height
        const hEl = document.getElementById('prop-dim-h');
        if (hEl) {
            hEl.addEventListener('change', () => {
                const sketch = this._currentSketch;
                if (!sketch || !sketch.isExtruded) return;
                const val = parseFloat(hEl.value);
                if (isNaN(val) || val < 0.1) return;

                const mesh = sketch.extrude(val);
                // extrudedMesh was replaced — re-add to scene via userData reference
                if (mesh && mesh.parent) {
                    // already in scene if extrude() re-used parent; otherwise caller adds it
                }
                sketch.confirmExtrusion();
                this._populate(sketch);
            });
        }

        // Close button
        const closeBtn = document.getElementById('prop-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
    }
}
