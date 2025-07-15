import * as THREE from 'three';
import { SelectionHandler } from './handlers/selectionHandler.js';
import { 
    calculateSelectionBounds, 
    calculateOriginPosition, 
    calculateDimensionLinePositions, 
    calculateExtrudedDimensionPosition,
    formatOriginCoordinates, 
    formatDimensionValue, 
    shouldShowHighlight, 
    extractSketchFromMesh,
    validateSketchObject 
} from './utils/selectionUtils.js';

export class SelectionManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
        this.selectedObject = null;
        this.selectionDimensions = [];
        this.originDisplay = null;
        this.hoveredObject = null;
        this.hoverHighlight = null;
        
        // Initialize selection handler
        this.selectionHandler = new SelectionHandler(sceneManager.sceneHandler);
    }

    selectObject(meshObject) {
        // Clear previous selection display
        this.clearSelectionDisplay();
        
        // Extract sketch from mesh object using pure function
        const sketch = extractSketchFromMesh(meshObject);
        
        this.selectedObject = sketch;
        
        if (sketch && validateSketchObject(sketch) && this.stateManager.dimensionsEnabled) {
            this.showObjectDimensions(sketch);
            this.showObjectOrigin(sketch);
        }
        
        // Update state manager's selected object to the mesh
        this.stateManager.selectedObject = meshObject;
        
        // Note: TransformControls attach is handled by InteractionManager or ObjectListManager
    }

    clearSelection() {
        this.clearSelectionDisplay();
        this.selectedObject = null;
        this.stateManager.selectedObject = null;
        
        // Note: TransformControls detach is handled by ObjectListManager
    }

    deselectAll() {
        this.clearSelection();
    }

    setHoveredObject(meshObject) {
        // Use pure function to determine if highlighting should be shown
        if (!shouldShowHighlight(this.stateManager.selectionMode, meshObject)) {
            this.clearHoverHighlight();
            return;
        }

        // Don't highlight the same object twice
        if (this.hoveredObject === meshObject) {
            return;
        }

        // Clear previous hover highlight
        this.clearHoverHighlight();

        this.hoveredObject = meshObject;
        this.createHoverHighlight(meshObject);
    }

    clearHoverHighlight() {
        this.selectionHandler.clearHoverHighlight();
        this.hoverHighlight = null;
        this.hoveredObject = null;
    }

    createHoverHighlight(meshObject) {
        if (!meshObject || !meshObject.geometry) return;

        const highlight = this.selectionHandler.createHoverHighlight(meshObject);
        this.hoverHighlight = highlight;
        this.selectionHandler.setHoverHighlight(highlight);
    }

    showObjectDimensions(sketch) {
        if (!sketch) return;

        const bounds = calculateSelectionBounds(sketch);
        if (!bounds) return;
        
        // Calculate dimension line positions using pure functions
        const dimensionPositions = calculateDimensionLinePositions(bounds, sketch.isExtruded);
        
        // Create dimension lines
        dimensionPositions.forEach(position => {
            const dimensionSet = this.selectionHandler.createDimensionLine(
                position.startPoint, 
                position.endPoint, 
                formatDimensionValue(position.value), 
                position.color
            );
            this.selectionHandler.addSelectionElement([
                dimensionSet.line, 
                dimensionSet.startTick, 
                dimensionSet.endTick, 
                dimensionSet.textSprite
            ]);
        });
        
        // Add extruded height dimension if needed
        if (sketch.isExtruded) {
            const extrudedDimension = calculateExtrudedDimensionPosition(bounds, sketch.extrudeHeight);
            if (extrudedDimension) {
                const dimensionSet = this.selectionHandler.createDimensionLine(
                    extrudedDimension.startPoint, 
                    extrudedDimension.endPoint, 
                    formatDimensionValue(extrudedDimension.value), 
                    extrudedDimension.color
                );
                this.selectionHandler.addSelectionElement([
                    dimensionSet.line, 
                    dimensionSet.startTick, 
                    dimensionSet.endTick, 
                    dimensionSet.textSprite
                ]);
            }
        }
    }



    showObjectOrigin(sketch) {
        if (!sketch) return;

        // Calculate origin position using pure function
        const originPosition = calculateOriginPosition(sketch);
        
        // Create origin marker
        const originElements = this.selectionHandler.createOriginMarker(originPosition);
        this.selectionHandler.addSelectionElement(originElements);
        
        // Create coordinate text
        const coordText = formatOriginCoordinates(originPosition);
        const textPosition = originPosition.clone();
        textPosition.y += 0.5;
        const originText = this.selectionHandler.createOriginText(coordText, textPosition);
        this.selectionHandler.setOriginDisplay(originText);
    }


    clearSelectionDisplay() {
        // Use selection handler to clear all selection elements
        this.selectionHandler.clearAll();
        
        // Clear local references
        this.selectionDimensions = [];
        this.originDisplay = null;
    }

    toggleDimensionsVisibility(visible) {
        if (visible && this.selectedObject) {
            this.showObjectDimensions(this.selectedObject);
            this.showObjectOrigin(this.selectedObject);
        } else {
            this.clearSelectionDisplay();
        }
    }
}