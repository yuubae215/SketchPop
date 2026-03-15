/**
 * CommandManager: Undo/Redo stack using Command pattern.
 *
 * Supported commands:
 *   AddSketchCommand    - undo removes the sketch from the scene/state
 *   ExtrudeCommand      - undo cancels the extrusion, restoring the 2-D sketch
 *   DeleteSketchCommand - undo restores the sketch to the scene/state
 *   FaceExtrudeCommand  - undo reverts the merged geometry to a snapshot
 *   BooleanCommand      - undo restores both operand meshes and removes result
 *   FilletCommand       - undo restores the original geometry before fillet/chamfer
 */

import { CommandControlsDOMHandler } from './handlers/domHandlers.js';

const MAX_HISTORY = 50;

// ─────────────────────────────────────────────
// Command: add a new 2-D sketch
// ─────────────────────────────────────────────
class AddSketchCommand {
    constructor(sketch, sceneManager, stateManager) {
        this.sketch = sketch;
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
    }

    undo() {
        const sketch = this.sketch;

        // Remove Three.js meshes
        if (sketch.mesh) this.sceneManager.removeFromScene(sketch.mesh);
        if (sketch.extrudedMesh) this.sceneManager.removeFromScene(sketch.extrudedMesh);
        sketch.clearDimensions();

        // Remove from state
        this.stateManager.removeSketch(sketch);
    }

    redo() {
        const sketch = this.sketch;

        // Re-add 2D mesh to scene
        if (sketch.mesh) this.sceneManager.addToScene(sketch.mesh);

        // Re-add to state without re-generating objectId
        if (!this.stateManager.sketches.includes(sketch)) {
            this.stateManager.sketches.push(sketch);
            this.stateManager.updateShapeCount();
            if (this.stateManager.objectListManager) {
                this.stateManager.objectListManager.restoreSketchObject(sketch);
            }
        }
    }
}

// ─────────────────────────────────────────────
// Command: confirm a sketch extrusion
// ─────────────────────────────────────────────
class ExtrudeCommand {
    constructor(sketch, sceneManager, stateManager) {
        this.sketch = sketch;
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
        // Snapshot the height at push time (before any undo changes it)
        this.savedHeight = sketch.extrudeHeight;
    }

    undo() {
        const sketch = this.sketch;

        // Remove the 3-D mesh and revert to 2-D state
        if (sketch.extrudedMesh) {
            this.sceneManager.removeFromScene(sketch.extrudedMesh);
            sketch.extrudedMesh = null;
        }
        sketch.isExtruded = false;
        sketch.isPending = false;
        sketch.extrudeHeight = 0;

        // Restore the 2-D line colour
        if (sketch.mesh) {
            sketch.mesh.material.color.setHex(0x007acc);
            this.sceneManager.addToScene(sketch.mesh);
        }

        // Refresh the object list entry
        this.stateManager.updateSketchInObjectList(sketch);
    }

    redo() {
        const sketch = this.sketch;

        // Re-extrude to the saved height
        const mesh = sketch.extrude(this.savedHeight);
        if (mesh) this.sceneManager.addToScene(mesh);

        // Apply confirmed visual state (colors, opacity)
        sketch.confirmExtrusion();

        this.stateManager.updateSketchInObjectList(sketch);
    }
}

// ─────────────────────────────────────────────
// Command: delete a sketch
// ─────────────────────────────────────────────
class DeleteSketchCommand {
    constructor(sketch, sceneManager, stateManager) {
        this.sketch = sketch;
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
        // Snapshot whether it was extruded at the moment of deletion
        this.wasExtruded = sketch.isExtruded;
    }

    undo() {
        const sketch = this.sketch;

        // Re-add to internal sketches array directly — bypass addSketch() which
        // would overwrite sketch.objectId via addSketchObject().
        if (!this.stateManager.sketches.includes(sketch)) {
            this.stateManager.sketches.push(sketch);
            this.stateManager.updateShapeCount();
            if (this.stateManager.objectListManager) {
                // restoreSketchObject() preserves the existing objectId in the DOM
                this.stateManager.objectListManager.restoreSketchObject(sketch);
            }
        }

        // Restore meshes to the scene
        if (sketch.mesh) this.sceneManager.addToScene(sketch.mesh);
        if (this.wasExtruded && sketch.extrudedMesh) {
            this.sceneManager.addToScene(sketch.extrudedMesh);
        }
    }

    redo() {
        const sketch = this.sketch;

        // Re-delete: remove from scene and state
        if (sketch.mesh) this.sceneManager.removeFromScene(sketch.mesh);
        if (sketch.extrudedMesh) this.sceneManager.removeFromScene(sketch.extrudedMesh);
        sketch.clearDimensions();
        this.stateManager.removeSketch(sketch);
    }
}

// ─────────────────────────────────────────────
// Command: face extrusion (integrates new geometry into original mesh)
// ─────────────────────────────────────────────
class FaceExtrudeCommand {
    /**
     * @param {object} snapshot  Plain object with the state BEFORE face-extrude:
     *   { sketch, oldGeometry, oldMeshPosition, oldExtrudeHeight,
     *     oldStartPoint, oldEndPoint, stateManager }
     *
     * Called AFTER integrateExtrusionWithOriginal() has run, so sketch.extrudedMesh
     * already holds the new geometry/position — we snapshot that as "new" state.
     */
    constructor(snapshot) {
        this.snapshot = snapshot;

        // Capture new state (integration already happened at push time)
        const sketch = snapshot.sketch;
        if (sketch && sketch.extrudedMesh) {
            this.newGeometry = sketch.extrudedMesh.geometry.clone();
            this.newMeshPosition = sketch.extrudedMesh.position.clone();
        }
        this.newExtrudeHeight = sketch ? sketch.extrudeHeight : 0;
        this.newStartPoint = sketch && sketch.startPoint ? sketch.startPoint.clone() : null;
        this.newEndPoint = sketch && sketch.endPoint ? sketch.endPoint.clone() : null;
    }

    undo() {
        const { sketch, oldGeometry, oldMeshPosition, oldExtrudeHeight,
                oldStartPoint, oldEndPoint,
                stateManager } = this.snapshot;

        if (!sketch || !sketch.extrudedMesh) return;

        // Swap geometry back to pre-face-extrude state
        sketch.extrudedMesh.geometry.dispose();
        sketch.extrudedMesh.geometry = oldGeometry.clone();

        // Restore mesh position
        if (oldMeshPosition) sketch.extrudedMesh.position.copy(oldMeshPosition);

        // Restore sketch dimensions
        sketch.extrudeHeight = oldExtrudeHeight;
        if (oldStartPoint) sketch.startPoint.copy(oldStartPoint);
        if (oldEndPoint) sketch.endPoint.copy(oldEndPoint);

        stateManager.updateSketchInObjectList(sketch);
    }

    redo() {
        const { sketch, stateManager } = this.snapshot;
        if (!sketch || !sketch.extrudedMesh || !this.newGeometry) return;

        // Swap geometry forward to post-face-extrude state
        sketch.extrudedMesh.geometry.dispose();
        sketch.extrudedMesh.geometry = this.newGeometry.clone();

        if (this.newMeshPosition) sketch.extrudedMesh.position.copy(this.newMeshPosition);

        sketch.extrudeHeight = this.newExtrudeHeight;
        if (this.newStartPoint) sketch.startPoint.copy(this.newStartPoint);
        if (this.newEndPoint) sketch.endPoint.copy(this.newEndPoint);

        stateManager.updateSketchInObjectList(sketch);
    }
}

// ─────────────────────────────────────────────
// Command: duplicate a sketch (2-D or extruded)
// ─────────────────────────────────────────────
class DuplicateCommand {
    constructor(original, duplicate, sceneManager, stateManager) {
        this.original = original;
        this.duplicate = duplicate;
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
    }

    undo() {
        const dup = this.duplicate;
        if (dup.mesh) this.sceneManager.removeFromScene(dup.mesh);
        if (dup.extrudedMesh) this.sceneManager.removeFromScene(dup.extrudedMesh);
        dup.clearDimensions();
        this.stateManager.removeSketch(dup);
    }

    redo() {
        const dup = this.duplicate;
        if (dup.mesh) this.sceneManager.addToScene(dup.mesh);
        if (dup.isExtruded && dup.extrudedMesh) this.sceneManager.addToScene(dup.extrudedMesh);
        if (!this.stateManager.sketches.includes(dup)) {
            this.stateManager.sketches.push(dup);
            this.stateManager.updateShapeCount();
            if (this.stateManager.objectListManager) {
                this.stateManager.objectListManager.restoreSketchObject(dup);
            }
        }
    }
}

// ─────────────────────────────────────────────
// Command: CSG Boolean operation (union / difference / intersect)
// ─────────────────────────────────────────────
class BooleanCommand {
    /**
     * @param {object} snapshot
     *   {
     *     sketchA, sketchB,          — original SketchRectangle operands
     *     oldMeshA, oldMeshB,        — THREE.Mesh references before the operation
     *     resultMesh,                — THREE.Mesh produced by the operation
     *     sceneManager, stateManager
     *   }
     */
    constructor(snapshot) {
        this.snapshot = snapshot;
    }

    undo() {
        const { sketchA, sketchB, oldMeshA, oldMeshB, resultMesh,
                sceneManager, stateManager } = this.snapshot;

        // Remove result from scene
        sceneManager.removeFromScene(resultMesh);

        // Restore sketchA's original mesh
        sketchA.extrudedMesh = oldMeshA;
        sceneManager.addToScene(oldMeshA);

        // Restore sketchB to state and scene
        sketchB.extrudedMesh = oldMeshB;
        sceneManager.addToScene(oldMeshB);
        if (!stateManager.sketches.includes(sketchB)) {
            stateManager.sketches.push(sketchB);
            stateManager.updateShapeCount();
            if (stateManager.objectListManager) {
                stateManager.objectListManager.restoreSketchObject(sketchB);
            }
        }

        stateManager.updateSketchInObjectList(sketchA);
    }

    redo() {
        const { sketchA, sketchB, oldMeshA, oldMeshB, resultMesh,
                sceneManager, stateManager } = this.snapshot;

        // Remove original meshes
        sceneManager.removeFromScene(oldMeshA);
        sceneManager.removeFromScene(oldMeshB);

        // Re-apply result
        sketchA.extrudedMesh = resultMesh;
        sceneManager.addToScene(resultMesh);

        // Remove sketchB from state again
        stateManager.removeSketch(sketchB);

        stateManager.updateSketchInObjectList(sketchA);
    }
}

// ─────────────────────────────────────────────
// Command: fillet or chamfer geometry replacement
// ─────────────────────────────────────────────
class FilletCommand {
    /**
     * @param {object} snapshot
     *   { sketch, oldGeometry, newGeometry, filletOp }
     *   filletOp: { type: 'chamfer'|'fillet', amount: number } | null (for reset)
     */
    constructor(snapshot) {
        this.snapshot = snapshot;
    }

    undo() {
        const { sketch, oldGeometry } = this.snapshot;
        if (!sketch || !sketch.extrudedMesh) return;
        sketch.extrudedMesh.geometry.dispose();
        sketch.extrudedMesh.geometry = oldGeometry.clone();
        // Restore original-geometry marker so FilletManager.hasOperation() works correctly
        delete sketch.extrudedMesh.userData._originalGeometry;
        delete sketch.extrudedMesh.userData._filletOp;
    }

    redo() {
        const { sketch, newGeometry, filletOp } = this.snapshot;
        if (!sketch || !sketch.extrudedMesh) return;
        // Save original for another potential undo
        if (!sketch.extrudedMesh.userData._originalGeometry) {
            sketch.extrudedMesh.userData._originalGeometry = this.snapshot.oldGeometry.clone();
        }
        sketch.extrudedMesh.geometry.dispose();
        sketch.extrudedMesh.geometry = newGeometry.clone();
        if (filletOp) sketch.extrudedMesh.userData._filletOp = filletOp;
    }
}

// ─────────────────────────────────────────────
// CommandManager
// ─────────────────────────────────────────────
export class CommandManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this._domHandler = new CommandControlsDOMHandler();
    }

    // Push a command that has already been executed
    push(command) {
        this.undoStack.push(command);
        if (this.undoStack.length > MAX_HISTORY) {
            this.undoStack.shift();
        }
        // New action clears redo history
        this.redoStack = [];
        this._updateUI();
    }

    undo() {
        if (this.undoStack.length === 0) return false;
        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);
        this._updateUI();
        return true;
    }

    redo() {
        if (this.redoStack.length === 0) return false;
        const command = this.redoStack.pop();
        command.redo();
        this.undoStack.push(command);
        if (this.undoStack.length > MAX_HISTORY) {
            this.undoStack.shift();
        }
        this._updateUI();
        return true;
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }

    _updateUI() {
        this._domHandler.updateUndoRedo(this.canUndo(), this.canRedo());
    }

    // ── Factories (convenience) ──────────────────────────

    static createAddSketch(sketch, sceneManager, stateManager) {
        return new AddSketchCommand(sketch, sceneManager, stateManager);
    }

    static createExtrude(sketch, sceneManager, stateManager) {
        return new ExtrudeCommand(sketch, sceneManager, stateManager);
    }

    static createDelete(sketch, sceneManager, stateManager) {
        return new DeleteSketchCommand(sketch, sceneManager, stateManager);
    }

    static createFaceExtrude(snapshot) {
        return new FaceExtrudeCommand(snapshot);
    }

    static createDuplicate(original, duplicate, sceneManager, stateManager) {
        return new DuplicateCommand(original, duplicate, sceneManager, stateManager);
    }

    static createBoolean(snapshot) {
        return new BooleanCommand(snapshot);
    }

    static createFillet(snapshot) {
        return new FilletCommand(snapshot);
    }
}
