// State management pure functions

export const VALID_MODES = ['sketch', 'extrude', 'face-extrude', 'select'];
export const VALID_SELECTION_MODES = ['object', 'face'];

export function calculateModeFlags(mode) {
    if (!VALID_MODES.includes(mode)) {
        return null;
    }
    
    return {
        isSketchMode: mode === 'sketch',
        isExtrudeMode: mode === 'extrude',
        isFaceExtrudeMode: mode === 'face-extrude',
        isSelectMode: mode === 'select'
    };
}

export function validateMode(mode) {
    return VALID_MODES.includes(mode);
}

export function validateSelectionMode(mode) {
    return VALID_SELECTION_MODES.includes(mode);
}

export function calculateNextMode(currentMode, requestedMode) {
    if (!validateMode(currentMode) || !validateMode(requestedMode)) {
        return null;
    }
    
    return {
        previousMode: currentMode,
        newMode: requestedMode,
        requiresCleanup: currentMode !== requestedMode
    };
}

export function shouldClearActiveOperations(oldMode, newMode) {
    if (oldMode === newMode) {
        return false;
    }
    
    const operationClearMap = {
        'sketch': ['extrude', 'face-extrude'],
        'extrude': ['sketch', 'face-extrude', 'select'],
        'face-extrude': ['sketch', 'extrude', 'select'],
        'select': ['sketch', 'extrude', 'face-extrude']
    };
    
    return operationClearMap[oldMode]?.includes(newMode) || false;
}

export function calculateStateAfterOperation(currentState, operation) {
    const newState = { ...currentState };
    
    switch (operation.type) {
        case 'START_DRAWING':
            newState.isDrawing = true;
            newState.currentSketch = operation.sketch;
            break;
            
        case 'FINISH_DRAWING':
            newState.isDrawing = false;
            newState.currentSketch = null;
            if (operation.success) {
                newState.sketches = [...newState.sketches, operation.sketch];
            }
            break;
            
        case 'START_EXTRUSION':
            newState.isExtruding = true;
            newState.selectedSketch = operation.sketch;
            newState.extrudeStartPos = operation.startPos;
            break;
            
        case 'FINISH_EXTRUSION':
            newState.isExtruding = false;
            newState.selectedSketch = null;
            newState.extrudeStartPos = null;
            if (operation.success) {
                newState.pendingExtrusion = operation.sketch;
            }
            break;
            
        case 'START_FACE_EXTRUSION':
            newState.isFaceExtruding = true;
            newState.currentFaceExtrusion = operation.faceExtrusion;
            newState.faceExtrudeStartPos = operation.startPos;
            break;
            
        case 'FINISH_FACE_EXTRUSION':
            newState.isFaceExtruding = false;
            newState.faceExtrudeStartPos = null;
            if (operation.success) {
                newState.currentFaceExtrusion.isPending = true;
            } else {
                newState.currentFaceExtrusion = null;
            }
            break;
            
        case 'CLEAR_ALL':
            newState.sketches = [];
            newState.currentSketch = null;
            newState.selectedSketch = null;
            newState.pendingExtrusion = null;
            newState.hoveredSketch = null;
            newState.hoveredFace = null;
            newState.isDrawing = false;
            newState.isExtruding = false;
            newState.isFaceExtruding = false;
            newState.extrudeStartPos = null;
            newState.faceExtrudeStartPos = null;
            newState.currentFaceExtrusion = null;
            newState.selectedObject = null;
            newState.selectedFace = null;
            break;
            
        case 'ADD_SKETCH':
            newState.sketches = [...newState.sketches, operation.sketch];
            break;
            
        case 'REMOVE_SKETCH':
            newState.sketches = newState.sketches.filter(sketch => sketch !== operation.sketch);
            break;
            
        case 'SELECT_OBJECT':
            newState.selectedObject = operation.object;
            if (operation.clearFace) {
                newState.selectedFace = null;
            }
            break;
            
        case 'SELECT_FACE':
            newState.selectedFace = operation.face;
            if (operation.clearObject) {
                newState.selectedObject = null;
            }
            break;
            
        case 'CLEAR_SELECTIONS':
            newState.selectedObject = null;
            newState.selectedFace = null;
            break;
            
        default:
            // Return unchanged state for unknown operations
            break;
    }
    
    return newState;
}

export function validateDrawingOperation(currentState, bounds) {
    if (!currentState.isDrawing || !currentState.currentSketch) {
        return {
            isValid: false,
            reason: 'Not in drawing state'
        };
    }
    
    if (!bounds || bounds.width < 0.1 || bounds.height < 0.1) {
        return {
            isValid: false,
            reason: 'Sketch too small'
        };
    }
    
    return {
        isValid: true,
        reason: 'Valid drawing operation'
    };
}

export function validateExtrusionOperation(currentState, extrudeHeight) {
    if (!currentState.isExtruding || !currentState.selectedSketch) {
        return {
            isValid: false,
            reason: 'Not in extrusion state'
        };
    }
    
    if (!extrudeHeight || Math.abs(extrudeHeight) < 0.1) {
        return {
            isValid: false,
            reason: 'Extrusion height too small'
        };
    }
    
    return {
        isValid: true,
        reason: 'Valid extrusion operation'
    };
}

export function validateFaceExtrusionOperation(currentState, extrudeDistance) {
    if (!currentState.isFaceExtruding || !currentState.currentFaceExtrusion) {
        return {
            isValid: false,
            reason: 'Not in face extrusion state'
        };
    }
    
    if (!extrudeDistance || Math.abs(extrudeDistance) < 0.1) {
        return {
            isValid: false,
            reason: 'Face extrusion distance too small'
        };
    }
    
    return {
        isValid: true,
        reason: 'Valid face extrusion operation'
    };
}

export function calculateHoverState(currentState, intersection, sketches) {
    let newHoveredSketch = null;
    
    if (intersection && sketches) {
        for (let sketch of sketches) {
            if (!sketch.isExtruded && sketch.containsPoint && sketch.containsPoint(intersection)) {
                newHoveredSketch = sketch;
                break;
            }
        }
    }
    
    return {
        previousHovered: currentState.hoveredSketch,
        newHovered: newHoveredSketch,
        hasChanged: currentState.hoveredSketch !== newHoveredSketch
    };
}

export function calculateSelectionChange(currentSelectionMode, newSelectionMode) {
    if (currentSelectionMode === newSelectionMode) {
        return {
            hasChanged: false,
            requiresClear: false
        };
    }
    
    return {
        hasChanged: true,
        requiresClear: true,
        previousMode: currentSelectionMode,
        newMode: newSelectionMode
    };
}

export function calculateDimensionToggleEffect(currentState, dimensionsEnabled) {
    return {
        newDimensionsEnabled: !dimensionsEnabled,
        affectedSketches: currentState.sketches.filter(sketch => sketch && sketch.setDimensionsVisible),
        requiresSelectionUpdate: !!currentState.selectedObject,
        requiresExtrusionClear: !dimensionsEnabled
    };
}

export function shouldShowConfirmationControls(operation, state) {
    switch (operation) {
        case 'extrusion':
            return state.pendingExtrusion && !state.pendingExtrusion.isPending;
        case 'face-extrusion':
            return state.currentFaceExtrusion && state.currentFaceExtrusion.isPending;
        default:
            return false;
    }
}

export function calculateSketchCount(sketches) {
    if (!Array.isArray(sketches)) {
        return 0;
    }
    
    return sketches.filter(sketch => sketch && !sketch.isRemoved).length;
}

export function findSketchByPoint(sketches, point) {
    if (!Array.isArray(sketches) || !point) {
        return null;
    }
    
    return sketches.find(sketch => 
        sketch && 
        !sketch.isExtruded && 
        sketch.containsPoint && 
        sketch.containsPoint(point)
    ) || null;
}

export function validateStateTransition(fromState, toState, operation) {
    const validTransitions = {
        'sketch': {
            'START_DRAWING': (state) => !state.isDrawing,
            'FINISH_DRAWING': (state) => state.isDrawing,
            'START_EXTRUSION': (state) => !state.isExtruding && !state.isDrawing
        },
        'extrude': {
            'START_EXTRUSION': (state) => !state.isExtruding,
            'FINISH_EXTRUSION': (state) => state.isExtruding
        },
        'face-extrude': {
            'START_FACE_EXTRUSION': (state) => !state.isFaceExtruding,
            'FINISH_FACE_EXTRUSION': (state) => state.isFaceExtruding
        }
    };
    
    const modeTransitions = validTransitions[fromState.currentMode];
    if (!modeTransitions || !modeTransitions[operation.type]) {
        return {
            isValid: true, // Allow transition if not explicitly restricted
            reason: 'No restriction defined'
        };
    }
    
    const validator = modeTransitions[operation.type];
    const isValid = validator(fromState);
    
    return {
        isValid,
        reason: isValid ? 'Valid transition' : `Invalid transition from ${fromState.currentMode} with operation ${operation.type}`
    };
}

export function createInitialState() {
    return {
        currentMode: 'sketch',
        isSketchMode: true,
        isDrawing: false,
        isExtruding: false,
        isTransforming: false,
        isFaceExtruding: false,
        currentSketch: null,
        sketches: [],
        selectedSketch: null,
        extrudeStartPos: null,
        pendingExtrusion: null,
        hoveredSketch: null,
        hoveredFace: null,
        faceHighlightMesh: null,
        currentFaceExtrusion: null,
        faceExtrudeStartPos: null,
        dimensionsEnabled: true,
        selectedObject: null,
        selectionMode: 'object',
        selectedFace: null
    };
}

export function validateState(state) {
    const errors = [];
    
    if (!validateMode(state.currentMode)) {
        errors.push(`Invalid mode: ${state.currentMode}`);
    }
    
    if (!validateSelectionMode(state.selectionMode)) {
        errors.push(`Invalid selection mode: ${state.selectionMode}`);
    }
    
    if (state.isDrawing && !state.currentSketch) {
        errors.push('Drawing state inconsistent: isDrawing=true but no currentSketch');
    }
    
    if (state.isExtruding && !state.selectedSketch) {
        errors.push('Extrusion state inconsistent: isExtruding=true but no selectedSketch');
    }
    
    if (state.isFaceExtruding && !state.currentFaceExtrusion) {
        errors.push('Face extrusion state inconsistent: isFaceExtruding=true but no currentFaceExtrusion');
    }
    
    if (!Array.isArray(state.sketches)) {
        errors.push('sketches must be an array');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}