import { SketchRectangle } from './SketchRectangle.js';
import { ObjectListManager } from './ObjectListManager.js';
import { SelectionManager } from './SelectionManager.js';
import { validateRectangleSize } from './utils/geometry.js';
import { SelectionModeDOMHandler } from './handlers/domHandlers.js';
import { StateHandler } from './handlers/stateHandler.js';
import {
    validateMode,
    validateSelectionMode,
    calculateModeFlags,
    calculateNextMode,
    shouldClearActiveOperations,
    calculateStateAfterOperation,
    validateDrawingOperation,
    validateExtrusionOperation,
    validateFaceExtrusionOperation,
    calculateHoverState,
    calculateSelectionChange,
    calculateDimensionToggleEffect,
    shouldShowConfirmationControls,
    createInitialState,
    validateState
} from './utils/stateUtils.js';

export class StateManager {
    constructor() {
        // Initialize state using pure function
        const initialState = createInitialState();
        Object.assign(this, initialState);
        
        // Managers and handlers
        this.objectListManager = null;
        this.selectionManager = null;
        this.transformManager = null;
        
        // Handlers for side effects
        this.stateHandler = new StateHandler();
        this.selectionModeDOMHandler = new SelectionModeDOMHandler();
        
        // Initialize handler state
        this.stateHandler.setState(initialState);
    }

    init() {
        this.updateModeButtons();
        this.updateShapeCount();
        this.objectListManager = new ObjectListManager(this);
        this.setupSelectionModeButtons();
        
        // Fix existing objects userData (temporary fix)
        this.fixExistingObjectsUserData();
        
        // Make debug function available globally for manual fixing
        window.fixUserData = () => this.fixExistingObjectsUserData();
    }
    
    fixExistingObjectsUserData() {
        console.log('Fixing existing objects userData...');
        console.log('Current sketches array:', this.sketches);
        
        this.sketches.forEach(sketch => {
            console.log('Processing sketch:', sketch);
            if (sketch.mesh && !sketch.mesh.userData.sketchRectangle) {
                sketch.mesh.userData.sketchRectangle = sketch;
                sketch.mesh.userData.objectId = sketch.objectId;
                console.log('Fixed 2D mesh userData for sketch:', sketch.objectId);
            }
            if (sketch.extrudedMesh && !sketch.extrudedMesh.userData.sketchRectangle) {
                sketch.extrudedMesh.userData.sketchRectangle = sketch;
                sketch.extrudedMesh.userData.objectId = sketch.objectId;
                console.log('Fixed 3D mesh userData for sketch:', sketch.objectId);
            }
        });
    }

    setSelectionManager(selectionManager) {
        this.selectionManager = selectionManager;
    }

    setTransformManager(transformManager) {
        this.transformManager = transformManager;
    }

    setStatusBarManager(statusBarManager) {
        this.statusBarManager = statusBarManager;
    }

    setMode(mode) {
        // Use pure function to validate and calculate mode change
        if (!validateMode(mode)) {
            return false;
        }

        const modeChange = calculateNextMode(this.currentMode, mode);
        if (!modeChange) {
            return false;
        }

        // Update mode and flags using pure function
        const modeFlags = calculateModeFlags(mode);
        this.currentMode = mode;
        this.isSketchMode = modeFlags.isSketchMode;

        // Clear operations if needed
        if (shouldClearActiveOperations(modeChange.previousMode, modeChange.newMode)) {
            this.clearActiveOperations();
        }

        // Update UI and trigger side effects
        this.updateModeButtons();
        this.stateHandler.updateSidebarIcons(window.interactionManager);
        this.stateHandler.handleModeChange(mode);

        // Update status bar
        if (this.statusBarManager) {
            this.statusBarManager.updateMode(mode);
        }

        return true;
    }

    clearActiveOperations() {
        // Use state handler for side effects
        if (this.pendingExtrusion) {
            this.stateHandler.cancelPendingExtrusion(this.pendingExtrusion);
            this.pendingExtrusion = null;
        }
        
        if (this.isFaceExtruding) {
            this.stateHandler.cancelFaceExtrusion(window.interactionManager);
            this.isFaceExtruding = false;
        }
        
    }

    setSketchMode(isSketch) {
        this.isSketchMode = isSketch;
        this.updateModeButtons();
        
        // Update sidebar icons if updateSidebarIcons method exists
        if (window.interactionManager && window.interactionManager.updateSidebarIcons) {
            window.interactionManager.updateSidebarIcons();
        }
    }

    toggleDimensions() {
        // Use pure function to calculate toggle effects
        const toggleEffect = calculateDimensionToggleEffect(this, this.dimensionsEnabled);
        
        this.dimensionsEnabled = toggleEffect.newDimensionsEnabled;
        
        // Apply side effects using state handler
        this.stateHandler.updateDimensionsOnSketches(toggleEffect.affectedSketches, this.dimensionsEnabled);
        
        if (toggleEffect.requiresSelectionUpdate) {
            this.stateHandler.updateSelectionManagerDimensions(this.selectionManager, this.dimensionsEnabled);
        }
        
        if (toggleEffect.requiresExtrusionClear) {
            this.stateHandler.clearExtrusionDimensions(window.interactionManager);
        }
        
        this.stateHandler.handleDimensionsToggle(this.dimensionsEnabled);
    }

    updateModeButtons() {
        // Mode buttons have been removed, only sidebar icons remain
        // This method is kept for backward compatibility but does nothing
    }

    addSketch(sketch) {
        // Set sketch properties using state handler
        this.stateHandler.setSketchProperties(sketch, {
            stateManager: this,
            dimensionsVisible: this.dimensionsEnabled
        });
        
        // Update state using pure function
        const newState = calculateStateAfterOperation(this, {
            type: 'ADD_SKETCH',
            sketch: sketch
        });
        this.sketches = newState.sketches;
        
        this.updateShapeCount();
        
        // Handle side effects
        this.stateHandler.addSketchToObjectList(this.objectListManager, sketch);
        this.stateHandler.handleSketchAdded(sketch);
    }

    removeSketch(sketch) {
        const index = this.sketches.indexOf(sketch);
        if (index > -1) {
            // Update state using pure function
            const newState = calculateStateAfterOperation(this, {
                type: 'REMOVE_SKETCH',
                sketch: sketch
            });
            this.sketches = newState.sketches;
            
            this.updateShapeCount();
            
            // Handle side effects
            this.stateHandler.removeSketchFromObjectList(this.objectListManager, sketch);
            this.stateHandler.handleSketchRemoved(sketch);
        }
    }

    clearAll(sceneManager) {
        this.sketches.forEach(sketch => sketch.remove());
        this.sketches = [];
        
        this.currentSketch = null;
        this.selectedSketch = null;
        this.pendingExtrusion = null;
        this.hoveredSketch = null;
        this.hoveredFace = null;
        this.isDrawing = false;
        this.isExtruding = false;
        this.isFaceExtruding = false;
        this.extrudeStartPos = null;
        this.faceExtrudeStartPos = null;
        
        if (this.currentFaceExtrusion && this.currentFaceExtrusion.newMesh) {
            sceneManager.removeFromScene(this.currentFaceExtrusion.newMesh);
        }
        this.currentFaceExtrusion = null;
        
        if (this.faceHighlightMesh) {
            sceneManager.removeFromScene(this.faceHighlightMesh);
            this.faceHighlightMesh = null;
        }
        
        // Clear object list
        if (this.objectListManager) {
            this.objectListManager.clearAllObjects();
        }
        
        this.updateShapeCount();
    }

    updateShapeCount() {
        // Update status bar with current object count
        if (this.statusBarManager) {
            this.statusBarManager.updateObjectCount(this.sketches.length);
        }
    }

    showConfirmationControls() {
        document.getElementById('confirmationControls').style.display = 'block';
    }

    hideConfirmationControls() {
        document.getElementById('confirmationControls').style.display = 'none';
    }

    startDrawing(startPoint) {
        this.isDrawing = true;
        this.currentSketch = new SketchRectangle(startPoint, startPoint);
        return this.currentSketch;
    }

    finishDrawing() {
        if (!this.currentSketch) {
            this.isDrawing = false;
            return false;
        }
        
        const bounds = this.currentSketch.getBounds();
        
        // Use pure function to validate drawing operation
        const validation = validateDrawingOperation(this, bounds);
        
        if (validation.isValid) {
            this.addSketch(this.currentSketch);
            
            // Update state using pure function
            const newState = calculateStateAfterOperation(this, {
                type: 'FINISH_DRAWING',
                sketch: this.currentSketch,
                success: true
            });
            this.isDrawing = newState.isDrawing;
            this.currentSketch = newState.currentSketch;
            
            return true;
        } else {
            this.stateHandler.removeSketchFromScene(this.currentSketch);
            this.stateHandler.logStateChange('Sketch too small, removed');
            
            // Update state using pure function
            const newState = calculateStateAfterOperation(this, {
                type: 'FINISH_DRAWING',
                sketch: this.currentSketch,
                success: false
            });
            this.isDrawing = newState.isDrawing;
            this.currentSketch = newState.currentSketch;
            
            return false;
        }
    }

    startExtrusion(sketch, startPos) {
        this.selectedSketch = sketch;
        this.isExtruding = true;
        this.extrudeStartPos = startPos.clone();
    }

    finishExtrusion() {
        if (this.isExtruding && this.selectedSketch && this.selectedSketch.extrudeHeight > 0.1) {
            this.selectedSketch.setPending();
            this.pendingExtrusion = this.selectedSketch;
            this.showConfirmationControls();
            console.log('Extrusion finished, awaiting confirmation');
        }
        this.isExtruding = false;
        this.selectedSketch = null;
        this.extrudeStartPos = null;
    }

    updateSketchInObjectList(sketch) {
        if (this.objectListManager) {
            this.objectListManager.updateSketchObject(sketch);
        }
    }

    startFaceExtrusion(hoveredFace, intersection) {
        this.isFaceExtruding = true;
        this.currentFaceExtrusion = {
            originalSketch: hoveredFace.sketch,
            face: hoveredFace.face,
            object: hoveredFace.object,
            startIntersection: intersection.clone(),
            newMesh: null,
            extrudeDistance: 0,
            isPending: false
        };
        this.faceExtrudeStartPos = intersection.clone();
        
        if (this.faceHighlightMesh) {
            this.faceHighlightMesh.parent.remove(this.faceHighlightMesh);
            this.faceHighlightMesh = null;
        }
    }

    finishFaceExtrusion() {
        if (this.isFaceExtruding && this.currentFaceExtrusion && !this.currentFaceExtrusion.isPending) {
            if (Math.abs(this.currentFaceExtrusion.extrudeDistance) > 0.1) {
                this.currentFaceExtrusion.isPending = true;
                if (this.currentFaceExtrusion.newMesh) {
                    this.currentFaceExtrusion.newMesh.material.color.setHex(0xff9500);
                    this.currentFaceExtrusion.newMesh.material.opacity = 0.6;
                }
                this.showConfirmationControls();
                console.log('Face extrusion finished, awaiting confirmation');
                
                this.isFaceExtruding = false;
                this.faceExtrudeStartPos = null;
                return true;
            } else {
                if (this.currentFaceExtrusion.newMesh) {
                    this.currentFaceExtrusion.newMesh.parent.remove(this.currentFaceExtrusion.newMesh);
                }
                this.currentFaceExtrusion = null;
                this.isFaceExtruding = false;
                this.faceExtrudeStartPos = null;
                console.log('Face extrusion too small, cancelled');
                return false;
            }
        }
        return false;
    }

    updateHoverHighlight(intersection) {
        let newHoveredSketch = null;
        
        for (let sketch of this.sketches) {
            if (!sketch.isExtruded && sketch.containsPoint(intersection)) {
                newHoveredSketch = sketch;
                break;
            }
        }
        
        if (this.hoveredSketch !== newHoveredSketch) {
            if (this.hoveredSketch) {
                this.hoveredSketch.setHovered(false);
            }
            this.hoveredSketch = newHoveredSketch;
            if (this.hoveredSketch) {
                this.hoveredSketch.setHovered(true);
            }
        }
    }

    setupSelectionModeButtons() {
        this.selectionModeDOMHandler.addSelectionModeListeners(
            () => this.setSelectionMode('object'),
            () => this.setSelectionMode('face')
        );
    }

    setSelectionMode(mode) {
        // Use pure function to validate and calculate selection mode change
        if (!validateSelectionMode(mode)) {
            return false;
        }
        
        const modeChange = calculateSelectionChange(this.selectionMode, mode);
        if (!modeChange.hasChanged) {
            return true;
        }
        
        this.selectionMode = mode;
        this.updateSelectionModeButtons();
        
        // Clear selections if required
        if (modeChange.requiresClear) {
            this.clearSelections();
        }
        
        this.stateHandler.handleSelectionModeChange(mode);
        return true;
    }

    updateSelectionModeButtons() {
        this.selectionModeDOMHandler.updateSelectionModeButtons(this.selectionMode);
    }

    clearSelections() {
        // Update state using pure function
        const newState = calculateStateAfterOperation(this, {
            type: 'CLEAR_SELECTIONS'
        });
        this.selectedObject = newState.selectedObject;
        this.selectedFace = newState.selectedFace;
        
        // Handle side effects
        this.stateHandler.clearSelectionInList(this.objectListManager);
        
        if (this.faceHighlightMesh) {
            this.stateHandler.removeMeshFromScene(this.faceHighlightMesh, { 
                removeFromScene: (mesh) => {
                    if (mesh.parent) {
                        mesh.parent.remove(mesh);
                    }
                }
            });
            this.faceHighlightMesh = null;
        }
    }

    selectObject(object) {
        if (this.selectionMode === 'object') {
            this.selectedObject = object;
            console.log('Object selected:', object);
            
            // Update object list to show selection
            if (this.objectListManager) {
                this.objectListManager.selectObject(object);
            }
        }
    }

    selectFace(face, object, intersection) {
        if (this.selectionMode === 'face') {
            this.selectedFace = { face, object, intersection };
            console.log('Face selected:', face, 'on object:', object);
            
            // Add visual feedback for face selection
            this.highlightSelectedFace(face, object);
        }
    }

    highlightSelectedFace(face, object) {
        // Remove previous highlight
        if (this.faceHighlightMesh) {
            this.faceHighlightMesh.parent.remove(this.faceHighlightMesh);
            this.faceHighlightMesh = null;
        }

        // Create highlight mesh for selected face
        // This would need to be implemented based on your face highlighting system
        console.log('Face highlight would be created here for face:', face);
    }
}