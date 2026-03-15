import * as THREE from 'three';
import { SketchRectangle } from '../geometry/SketchRectangle.js';

const LS_KEY = 'sketchpop_autosave';
const AUTOSAVE_DELAY_MS = 1500;

/**
 * ProjectManager — serialise / deserialise the scene.
 *
 * Public API:
 *   saveToFile()            — download scene as sketchpop.json
 *   loadFromFile()          — open file-picker and restore scene
 *   triggerAutoSave()       — debounced write to localStorage
 *   loadAutoSave()          — restore from localStorage (returns true on success)
 *   hasAutoSave()           — true if localStorage has a saved scene
 */
export class ProjectManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
        this._autoSaveTimer = null;
    }

    // ── Serialisation ────────────────────────────────────────────────────

    _serialize() {
        const sketches = this.stateManager.sketches.map(sk => ({
            objectId:     sk.objectId,
            startPoint:   { x: sk.startPoint.x, y: sk.startPoint.y, z: sk.startPoint.z },
            endPoint:     { x: sk.endPoint.x,   y: sk.endPoint.y,   z: sk.endPoint.z   },
            isExtruded:   sk.isExtruded,
            extrudeHeight: sk.extrudeHeight,
        }));
        return JSON.stringify({ version: 1, sketches });
    }

    // ── Save ─────────────────────────────────────────────────────────────

    saveToFile() {
        const json = this._serialize();
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'sketchpop.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    triggerAutoSave() {
        if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer);
        this._autoSaveTimer = setTimeout(() => {
            try {
                localStorage.setItem(LS_KEY, this._serialize());
            } catch (_) { /* quota exceeded — ignore */ }
        }, AUTOSAVE_DELAY_MS);
    }

    // ── Load ─────────────────────────────────────────────────────────────

    loadFromFile() {
        const input    = document.createElement('input');
        input.type     = 'file';
        input.accept   = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    this._restore(data);
                } catch (err) {
                    console.error('SketchPop: failed to load project', err);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    hasAutoSave() {
        return !!localStorage.getItem(LS_KEY);
    }

    loadAutoSave() {
        const json = localStorage.getItem(LS_KEY);
        if (!json) return false;
        try {
            this._restore(JSON.parse(json));
            return true;
        } catch (err) {
            console.error('SketchPop: failed to load auto-save', err);
            return false;
        }
    }

    // ── Restore ──────────────────────────────────────────────────────────

    _restore(data) {
        if (!data || !Array.isArray(data.sketches)) return;

        // Wipe existing scene
        this.stateManager.clearAll(this.sceneManager);

        for (const sd of data.sketches) {
            const sp = new THREE.Vector3(sd.startPoint.x, sd.startPoint.y, sd.startPoint.z);
            const ep = new THREE.Vector3(sd.endPoint.x,   sd.endPoint.y,   sd.endPoint.z);

            const sketch = new SketchRectangle(sp, ep, this.sceneManager.sceneHandler);
            sketch.setStateManager(this.stateManager);

            // 2-D outline
            const mesh2d = sketch.createMesh();
            this.sceneManager.addToScene(mesh2d);

            // Extrusion (if saved)
            if (sd.isExtruded && sd.extrudeHeight > 0.1) {
                const mesh3d = sketch.extrude(sd.extrudeHeight);
                if (mesh3d) {
                    this.sceneManager.addToScene(mesh3d);
                    sketch.confirmExtrusion();
                }
            }

            // Set saved objectId before addSketch so the DOM item is registered with the correct ID
            if (sd.objectId) sketch.objectId = sd.objectId;
            this.stateManager.addSketch(sketch);
        }
    }
}
