import { ConfirmationControlsDOMHandler } from './domHandlers.js';

export class StateHandler {
    constructor() {
        this.confirmationHandler = new ConfirmationControlsDOMHandler();
        this.callbacks = new Map();
        this.state = {};
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
    }

    getState() {
        return { ...this.state };
    }

    registerCallback(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }

    unregisterCallback(event, callback) {
        if (this.callbacks.has(event)) {
            const callbacks = this.callbacks.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    triggerCallback(event, ...args) {
        if (this.callbacks.has(event)) {
            this.callbacks.get(event).forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in callback for event ${event}:`, error);
                }
            });
        }
    }

    updateDimensionsOnSketches(sketches, dimensionsEnabled) {
        if (!Array.isArray(sketches)) {
            return;
        }

        sketches.forEach(sketch => {
            if (sketch && typeof sketch.setDimensionsVisible === 'function') {
                sketch.setDimensionsVisible(dimensionsEnabled);
            }
        });
    }

    updateSelectionManagerDimensions(selectionManager, dimensionsEnabled) {
        if (selectionManager && typeof selectionManager.toggleDimensionsVisibility === 'function') {
            selectionManager.toggleDimensionsVisibility(dimensionsEnabled);
        }
    }

    clearExtrusionDimensions(interactionManager) {
        if (!interactionManager) return;

        if (interactionManager.extrusionManager && typeof interactionManager.extrusionManager.clearExtrusionDimensions === 'function') {
            interactionManager.extrusionManager.clearExtrusionDimensions();
        }

        if (typeof interactionManager.clearSketchExtrusionDimensions === 'function') {
            interactionManager.clearSketchExtrusionDimensions();
        }
    }

    updateSidebarIcons(interactionManager) {
        if (interactionManager && typeof interactionManager.updateSidebarIcons === 'function') {
            interactionManager.updateSidebarIcons();
        }
    }

    showConfirmationControls() {
        this.confirmationHandler.show();
    }

    hideConfirmationControls() {
        this.confirmationHandler.hide();
    }

    addSketchToObjectList(objectListManager, sketch) {
        if (objectListManager && typeof objectListManager.addSketchObject === 'function') {
            objectListManager.addSketchObject(sketch);
        }
    }

    removeSketchFromObjectList(objectListManager, sketch) {
        if (objectListManager && typeof objectListManager.removeSketchObject === 'function') {
            objectListManager.removeSketchObject(sketch);
        }
    }

    updateSketchInObjectList(objectListManager, sketch) {
        if (objectListManager && typeof objectListManager.updateSketchObject === 'function') {
            objectListManager.updateSketchObject(sketch);
        }
    }

    clearAllObjectsFromList(objectListManager) {
        if (objectListManager && typeof objectListManager.clearAllObjects === 'function') {
            objectListManager.clearAllObjects();
        }
    }

    selectObjectInList(objectListManager, object) {
        if (objectListManager && typeof objectListManager.selectObject === 'function') {
            objectListManager.selectObject(object);
        }
    }

    clearSelectionInList(objectListManager) {
        if (objectListManager && typeof objectListManager.clearSelection === 'function') {
            objectListManager.clearSelection();
        }
    }

    detachTransformControls(transformManager) {
        if (transformManager && typeof transformManager.detachFromObject === 'function') {
            transformManager.detachFromObject();
        }
    }

    cancelPendingExtrusion(pendingExtrusion, sceneManager) {
        if (pendingExtrusion) {
            if (typeof pendingExtrusion.remove === 'function') {
                pendingExtrusion.remove();
            } else if (sceneManager && typeof sceneManager.removeFromScene === 'function') {
                sceneManager.removeFromScene(pendingExtrusion);
            }
        }
    }

    cancelFaceExtrusion(interactionManager) {
        if (interactionManager && 
            interactionManager.extrusionManager && 
            typeof interactionManager.extrusionManager.cancelFaceExtrusion === 'function') {
            interactionManager.extrusionManager.cancelFaceExtrusion();
        }
    }

    removeSketchFromScene(sketch) {
        if (sketch && typeof sketch.remove === 'function') {
            sketch.remove();
        }
    }

    removeMeshFromScene(mesh, sceneManager) {
        if (mesh && sceneManager && typeof sceneManager.removeFromScene === 'function') {
            sceneManager.removeFromScene(mesh);
        }
    }

    setSketchProperties(sketch, properties) {
        if (!sketch) return;

        Object.keys(properties).forEach(key => {
            if (key === 'stateManager' && typeof sketch.setStateManager === 'function') {
                sketch.setStateManager(properties[key]);
            } else if (key === 'dimensionsVisible' && typeof sketch.setDimensionsVisible === 'function') {
                sketch.setDimensionsVisible(properties[key]);
            } else if (key === 'pending' && typeof sketch.setPending === 'function') {
                sketch.setPending();
            } else if (key === 'hovered' && typeof sketch.setHovered === 'function') {
                sketch.setHovered(properties[key]);
            } else {
                sketch[key] = properties[key];
            }
        });
    }

    updateMeshMaterial(mesh, materialProperties) {
        if (!mesh || !mesh.material) return;

        Object.keys(materialProperties).forEach(key => {
            if (key === 'color' && mesh.material.color && typeof mesh.material.color.setHex === 'function') {
                mesh.material.color.setHex(materialProperties[key]);
            } else {
                mesh.material[key] = materialProperties[key];
            }
        });
    }

    logStateChange(message, data = null) {
        if (data) {
            console.log(message, data);
        } else {
            console.log(message);
        }
    }

    handleModeChange(newMode, callbacks = {}) {
        this.logStateChange('Mode changed to:', newMode);

        if (callbacks.onModeChange) {
            callbacks.onModeChange(newMode);
        }

        this.triggerCallback('modeChanged', newMode);
    }

    handleSelectionModeChange(newSelectionMode, callbacks = {}) {
        this.logStateChange('Selection mode changed to:', newSelectionMode);

        if (callbacks.onSelectionModeChange) {
            callbacks.onSelectionModeChange(newSelectionMode);
        }

        this.triggerCallback('selectionModeChanged', newSelectionMode);
    }

    handleDimensionsToggle(dimensionsEnabled, callbacks = {}) {
        this.logStateChange('Dimensions toggled:', dimensionsEnabled ? 'ON' : 'OFF');

        if (callbacks.onDimensionsToggle) {
            callbacks.onDimensionsToggle(dimensionsEnabled);
        }

        this.triggerCallback('dimensionsToggled', dimensionsEnabled);
    }

    handleSketchAdded(sketch, callbacks = {}) {
        this.logStateChange('Sketch added to collection');

        if (callbacks.onSketchAdded) {
            callbacks.onSketchAdded(sketch);
        }

        this.triggerCallback('sketchAdded', sketch);
    }

    handleSketchRemoved(sketch, callbacks = {}) {
        this.logStateChange('Sketch removed from collection');

        if (callbacks.onSketchRemoved) {
            callbacks.onSketchRemoved(sketch);
        }

        this.triggerCallback('sketchRemoved', sketch);
    }

    handleExtrusionFinished(sketch, callbacks = {}) {
        this.logStateChange('Extrusion finished, awaiting confirmation');

        if (callbacks.onExtrusionFinished) {
            callbacks.onExtrusionFinished(sketch);
        }

        this.triggerCallback('extrusionFinished', sketch);
    }

    handleFaceExtrusionFinished(faceExtrusion, callbacks = {}) {
        this.logStateChange('Face extrusion finished, awaiting confirmation');

        if (callbacks.onFaceExtrusionFinished) {
            callbacks.onFaceExtrusionFinished(faceExtrusion);
        }

        this.triggerCallback('faceExtrusionFinished', faceExtrusion);
    }

    handleObjectSelected(object, callbacks = {}) {
        this.logStateChange('Object selected:', object);

        if (callbacks.onObjectSelected) {
            callbacks.onObjectSelected(object);
        }

        this.triggerCallback('objectSelected', object);
    }

    handleFaceSelected(face, object, intersection, callbacks = {}) {
        this.logStateChange('Face selected:', face, 'on object:', object);

        if (callbacks.onFaceSelected) {
            callbacks.onFaceSelected(face, object, intersection);
        }

        this.triggerCallback('faceSelected', face, object, intersection);
    }

    validateAndExecute(operation, validator, executor) {
        const validation = validator();
        
        if (!validation.isValid) {
            this.logStateChange(`Operation ${operation} failed validation:`, validation.reason);
            return false;
        }

        try {
            const result = executor();
            this.logStateChange(`Operation ${operation} completed successfully`);
            return result;
        } catch (error) {
            this.logStateChange(`Operation ${operation} failed with error:`, error.message);
            return false;
        }
    }

    cleanup() {
        this.callbacks.clear();
        this.state = {};
    }
}