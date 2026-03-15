import * as THREE from 'three';
import { SketchRectangle } from './SketchRectangle.js';

/**
 * ProceduralEngine — STEP-like parametric CAD scripting engine.
 *
 * Provides a sandboxed JavaScript DSL for building 3D models procedurally:
 *
 *   params({ width: 100, depth: 60, height: 30 });
 *   const base = sketch(0, 0, width, depth).extrude(height);
 *   const cut  = sketch(10, 10, width-10, depth-10).extrude(height);
 *   base.subtract(cut);
 *
 * Each call to execute() clears the previous run's objects and regenerates
 * the model from scratch, enabling parametric iteration.
 */
export class ProceduralEngine {
    constructor(sceneManager, stateManager, booleanManager) {
        this._scene = sceneManager;
        this._state = stateManager;
        this._boolean = booleanManager;
        /** All SketchRectangles created by the last execute() run. */
        this._objects = [];
    }

    /** Remove every object created by the last run from scene + state. */
    clearAll() {
        for (const sketch of this._objects) {
            if (sketch.mesh) this._scene.removeFromScene(sketch.mesh);
            if (sketch.extrudedMesh) this._scene.removeFromScene(sketch.extrudedMesh);
            this._state.removeSketch(sketch);
        }
        this._objects = [];
    }

    /**
     * Execute a procedural script string.
     * Returns { ok: boolean, error: string|null }.
     */
    execute(scriptText) {
        this.clearAll();

        // ── Pass 1: collect params (silent) ─────────────────────────────
        const collectedParams = {};
        const collectParams = (defs) => {
            Object.assign(collectedParams, defs);
            return defs;
        };
        // Stub DSL so pass-1 doesn't crash on unknown names
        const stubSolid = () => ({
            move: () => stubSolid(),
            subtract: () => stubSolid(),
            union: () => stubSolid(),
            intersect: () => stubSolid(),
        });
        const stubSketch = () => ({ extrude: () => stubSolid() });

        try {
            const p1 = new Function('params', 'sketch', 'THREE', scriptText);
            p1(collectParams, () => stubSketch(), THREE);
        } catch (_) { /* ignore — just collecting params */ }

        // ── Pass 2: full execution with param names in scope ─────────────
        const engine = this;

        /**
         * sketch(x1, z1, x2, z2) → SketchHandle
         * Creates a 2-D rectangle on the ground plane.
         */
        function sketchFn(x1, z1, x2, z2) {
            const startPt = new THREE.Vector3(x1, 0, z1);
            const endPt   = new THREE.Vector3(x2, 0, z2);
            const sr = new SketchRectangle(startPt, endPt);
            sr.setStateManager(engine._state);
            const mesh = sr.createMesh();
            engine._scene.addToScene(mesh);
            engine._state.addSketch(sr);
            engine._objects.push(sr);
            return new _SketchHandle(sr, engine);
        }

        const context = {
            params:  collectParams,
            sketch:  sketchFn,
            THREE,
            Math,
            ...collectedParams,   // e.g. width, depth, height as bare names
        };

        try {
            const fn = new Function(...Object.keys(context), scriptText);
            fn(...Object.values(context));
            return { ok: true, error: null };
        } catch (err) {
            this.clearAll();
            return { ok: false, error: err.message };
        }
    }
}

// ── Handle classes (returned by the DSL) ─────────────────────────────────────

class _SketchHandle {
    constructor(sketch, engine) {
        this._sketch = sketch;
        this._engine = engine;
    }

    /**
     * extrude(height) → SolidHandle
     * Extrudes the 2-D sketch into a 3-D solid.
     */
    extrude(height) {
        const mesh = this._sketch.extrude(height);
        if (mesh) {
            this._engine._scene.addToScene(mesh);
            this._sketch.confirmExtrusion();
        }
        return new _SolidHandle(this._sketch, this._engine);
    }
}

class _SolidHandle {
    constructor(sketch, engine) {
        this._sketch = sketch;
        this._engine = engine;
    }

    /**
     * move(dx, dy, dz) → this
     * Translates the solid by the given offsets.
     */
    move(dx = 0, dy = 0, dz = 0) {
        if (this._sketch.extrudedMesh) {
            this._sketch.extrudedMesh.position.x += dx;
            this._sketch.extrudedMesh.position.y += dy;
            this._sketch.extrudedMesh.position.z += dz;
        }
        return this;
    }

    /**
     * subtract(other) → this
     * Boolean difference: this − other. Other is removed from the scene.
     */
    subtract(other) {
        if (other && other._sketch) {
            this._engine._boolean.operate('difference', this._sketch, other._sketch);
            // remove from tracking (BooleanManager already removes from scene/state)
            const idx = this._engine._objects.indexOf(other._sketch);
            if (idx !== -1) this._engine._objects.splice(idx, 1);
        }
        return this;
    }

    /**
     * union(other) → this
     * Boolean union: this + other. Other is merged into this and removed.
     */
    union(other) {
        if (other && other._sketch) {
            this._engine._boolean.operate('union', this._sketch, other._sketch);
            const idx = this._engine._objects.indexOf(other._sketch);
            if (idx !== -1) this._engine._objects.splice(idx, 1);
        }
        return this;
    }

    /**
     * intersect(other) → this
     * Boolean intersect: this ∩ other.
     */
    intersect(other) {
        if (other && other._sketch) {
            this._engine._boolean.operate('intersect', this._sketch, other._sketch);
            const idx = this._engine._objects.indexOf(other._sketch);
            if (idx !== -1) this._engine._objects.splice(idx, 1);
        }
        return this;
    }
}
