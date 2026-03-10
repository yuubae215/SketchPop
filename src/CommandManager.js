/**
 * CommandManager: Undo/Redo stack using Command pattern.
 *
 * Supported commands:
 *   AddSketchCommand   - undo removes the sketch from the scene/state
 *   ExtrudeCommand     - undo cancels the extrusion, restoring the 2-D sketch
 *   DeleteSketchCommand - undo restores the sketch to the scene/state
 *   FaceExtrudeCommand - undo reverts the merged geometry to a snapshot
 */

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
}

// ─────────────────────────────────────────────
// Command: confirm a sketch extrusion
// ─────────────────────────────────────────────
class ExtrudeCommand {
    constructor(sketch, sceneManager, stateManager) {
        this.sketch = sketch;
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
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

        // Re-add the sketch to state (fires the object-list side-effect)
        this.stateManager.addSketch(sketch);

        // Restore meshes to the scene
        if (sketch.mesh) this.sceneManager.addToScene(sketch.mesh);
        if (this.wasExtruded && sketch.extrudedMesh) {
            this.sceneManager.addToScene(sketch.extrudedMesh);
        }
    }
}

// ─────────────────────────────────────────────
// Command: face extrusion (integrates new geometry into original mesh)
// ─────────────────────────────────────────────
class FaceExtrudeCommand {
    /**
     * @param {object} snapshot  Plain object with the state before face-extrude:
     *   { sketch, oldGeometry, oldExtrudeHeight,
     *     oldStartPoint, oldEndPoint, sceneManager, stateManager }
     */
    constructor(snapshot) {
        this.snapshot = snapshot;
    }

    undo() {
        const { sketch, oldGeometry, oldExtrudeHeight,
                oldStartPoint, oldEndPoint,
                sceneManager, stateManager } = this.snapshot;

        if (!sketch || !sketch.extrudedMesh) return;

        // Swap geometry back
        sketch.extrudedMesh.geometry.dispose();
        sketch.extrudedMesh.geometry = oldGeometry;

        // Restore sketch dimensions
        sketch.extrudeHeight = oldExtrudeHeight;
        sketch.startPoint.copy(oldStartPoint);
        sketch.endPoint.copy(oldEndPoint);

        stateManager.updateSketchInObjectList(sketch);
    }
}

// ─────────────────────────────────────────────
// CommandManager
// ─────────────────────────────────────────────
export class CommandManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
    }

    // Push a command that has already been executed
    push(command) {
        this.undoStack.push(command);
        if (this.undoStack.length > MAX_HISTORY) {
            this.undoStack.shift();
        }
        // New action clears any redo history
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

    // Redo is not implemented in this sprint – placeholder only
    redo() {
        this._updateUI();
        return false;
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }

    _updateUI() {
        // Optional: update button states if elements exist
        const undoBtn = document.getElementById('sidebar-undo');
        if (undoBtn) {
            undoBtn.classList.toggle('disabled', !this.canUndo());
            undoBtn.title = `Undo (Ctrl+Z)${this.canUndo() ? '' : ' — nothing to undo'}`;
        }
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
}
