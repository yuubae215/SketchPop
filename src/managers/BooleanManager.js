import * as THREE from 'three';
import { CSG } from 'three-csg-ts';
import { ToastManager } from './ToastManager.js';

/**
 * BooleanManager — CSG Boolean operations (Union / Difference / Intersect).
 *
 * Requires two selected extruded objects.
 * Uses three-csg-ts under the hood.
 *
 * Usage:
 *   booleanManager.operate('union',      sketchA, sketchB)
 *   booleanManager.operate('difference', sketchA, sketchB)
 *   booleanManager.operate('intersect',  sketchA, sketchB)
 *
 * On success the result mesh replaces meshA in the scene; meshB is removed.
 * Returns the resulting SketchRectangle-like object or null on failure.
 */
export class BooleanManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
    }

    /**
     * Perform a CSG operation on two sketches.
     * @param {'union'|'difference'|'intersect'} type
     * @param {SketchRectangle} sketchA  — base object (kept / modified)
     * @param {SketchRectangle} sketchB  — tool object (subtracted/intersected/unioned)
     * @returns {THREE.Mesh|null}  resulting mesh, or null on failure
     */
    operate(type, sketchA, sketchB) {
        if (!sketchA || !sketchB) {
            ToastManager.show('Select two objects for boolean operation', 'warning');
            return null;
        }
        if (!sketchA.extrudedMesh || !sketchB.extrudedMesh) {
            ToastManager.show('Both objects must be extruded', 'warning');
            return null;
        }
        if (sketchA === sketchB) {
            ToastManager.show('Select two different objects', 'warning');
            return null;
        }

        try {
            const meshA = sketchA.extrudedMesh;
            const meshB = sketchB.extrudedMesh;

            // CSG requires world-space matrices to be up-to-date
            meshA.updateMatrixWorld(true);
            meshB.updateMatrixWorld(true);

            let resultMesh;
            switch (type) {
                case 'union':
                    resultMesh = CSG.union(meshA, meshB);
                    break;
                case 'difference':
                    resultMesh = CSG.subtract(meshA, meshB);
                    break;
                case 'intersect':
                    resultMesh = CSG.intersect(meshA, meshB);
                    break;
                default:
                    ToastManager.show(`Unknown boolean type: ${type}`, 'error');
                    return null;
            }

            if (!resultMesh) {
                ToastManager.show('Boolean operation produced empty result', 'warning');
                return null;
            }

            // Copy appearance from meshA
            resultMesh.material = meshA.material.clone();
            resultMesh.userData.sketchRectangle = sketchA;
            resultMesh.userData.objectId = sketchA.objectId;
            resultMesh.userData.isBooleanResult = true;
            resultMesh.userData.booleanType = type;

            // Remove old meshes from scene
            this.sceneManager.removeFromScene(meshA);
            this.sceneManager.removeFromScene(meshB);

            // Remove meshB from state
            this.stateManager.removeSketch(sketchB);

            // Replace meshA's mesh in the sketch
            sketchA.extrudedMesh = resultMesh;
            sketchA.isExtruded = true;

            // Add result to scene
            this.sceneManager.addToScene(resultMesh);

            // Update object list
            if (this.stateManager.objectListManager) {
                this.stateManager.objectListManager.updateSketchObject(sketchA);
            }

            const labels = { union: 'Union', difference: 'Difference', intersect: 'Intersect' };
            ToastManager.show(`Boolean ${labels[type]} applied`, 'success');
            return resultMesh;

        } catch (err) {
            console.error('BooleanManager.operate error:', err);
            ToastManager.show('Boolean operation failed — see console', 'error');
            return null;
        }
    }

    /**
     * Convenience method: requires exactly 2 selected sketches.
     * Returns { ok: bool, resultMesh }.
     */
    operateSelected(type) {
        const selected = this.stateManager.selectedObjects || [];
        if (selected.length !== 2) {
            ToastManager.show('Select exactly 2 objects for boolean operation', 'warning');
            return { ok: false, resultMesh: null };
        }

        const sketchA = selected[0].userData?.sketchRectangle;
        const sketchB = selected[1].userData?.sketchRectangle;

        const resultMesh = this.operate(type, sketchA, sketchB);
        return { ok: resultMesh !== null, resultMesh };
    }
}
