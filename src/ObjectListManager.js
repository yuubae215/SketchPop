import { generateObjectItemData, generateObjectItemHTML, calculateSelectionChanges, generateObjectId } from './utils/domUtils.js';
import { ObjectListDOMHandler } from './handlers/domHandlers.js';

export class ObjectListManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.selectedObjectId = null;
        
        // Initialize DOM handler
        this.domHandler = new ObjectListDOMHandler(
            document.getElementById('object-list'),
            document.getElementById('object-count')
        );
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for clicks on object items
        this.domHandler.addClickListener(this.onObjectClick.bind(this));
    }

    onObjectClick(event) {
        const objectItem = event.target.closest('.object-item');
        if (!objectItem) return;

        const objectId = objectItem.dataset.objectId;
        this.selectObject(objectId);
    }

    selectObject(objectIdOrMesh) {
        // Extract objectId from different input types
        let objectId = null;
        if (typeof objectIdOrMesh === 'string') {
            objectId = objectIdOrMesh;
        } else if (objectIdOrMesh && objectIdOrMesh.userData && objectIdOrMesh.userData.sketchRectangle) {
            const sketch = objectIdOrMesh.userData.sketchRectangle;
            objectId = sketch.objectId;
        }

        // Calculate selection changes using pure function
        const selectionChanges = calculateSelectionChanges(this.selectedObjectId, objectId);
        
        // Apply DOM changes using handler
        this.domHandler.updateSelection(selectionChanges);
        
        // Update internal state
        this.selectedObjectId = objectId;
        
        // Handle selection manager interaction
        if (objectId) {
            const selectedMesh = this.getSelectedMesh();
            console.log('ObjectListManager: Selected mesh from hierarchy:', selectedMesh);
            if (selectedMesh && this.stateManager.selectionManager) {
                this.stateManager.selectionManager.selectObject(selectedMesh);
                
                // Also attach TransformControls when selecting from hierarchy
                if (this.stateManager.transformManager) {
                    this.stateManager.transformManager.attachToObject(selectedMesh);
                }
                
                console.log('ObjectListManager: Selected object with dimensions and transform controls');
            } else {
                console.warn('ObjectListManager: No mesh found for selected object ID:', objectId);
            }
        } else {
            if (this.stateManager.selectionManager) {
                this.stateManager.selectionManager.clearSelection();
            }
            
            // Detach TransformControls when clearing selection
            if (this.stateManager.transformManager) {
                this.stateManager.transformManager.detachFromObject();
            }
        }
    }

    clearSelection() {
        this.selectObject(null);
    }

    addSketchObject(sketch) {
        const objectId = generateObjectId();
        sketch.objectId = objectId;
        
        // Generate object item data using pure function
        const itemData = generateObjectItemData(sketch, this.getObjectIndex(sketch));
        const htmlContent = generateObjectItemHTML(itemData);
        
        // Add to DOM using handler
        this.domHandler.addObjectItem(itemData, htmlContent);
        
        return objectId;
    }

    updateSketchObject(sketch) {
        if (!sketch.objectId) return;
        
        // Generate updated object item data using pure function
        const itemData = generateObjectItemData(sketch, this.getObjectIndex(sketch));
        
        // Update DOM using handler
        this.domHandler.updateObjectItem(sketch.objectId, itemData);
    }
    
    updateObjectList() {
        // Update all objects in the list (useful after transformations)
        this.stateManager.sketches.forEach(sketch => {
            this.updateSketchObject(sketch);
        });
    }

    removeSketchObject(sketch) {
        if (!sketch.objectId) return;

        // Remove from DOM using handler
        this.domHandler.removeObjectItem(sketch.objectId);
    }

    /**
     * Re-add a sketch that already has an objectId (used by redo of AddSketchCommand).
     * Unlike addSketchObject(), this preserves the existing objectId.
     */
    restoreSketchObject(sketch) {
        if (!sketch.objectId) return;
        const itemData = generateObjectItemData(sketch, this.getObjectIndex(sketch));
        const htmlContent = generateObjectItemHTML(itemData);
        this.domHandler.addObjectItem(itemData, htmlContent);
    }

    clearAllObjects() {
        // Clear DOM using handler
        this.domHandler.clearAllItems();
        this.selectedObjectId = null;
        
        // Clear selection display
        if (this.stateManager.selectionManager) {
            this.stateManager.selectionManager.clearSelection();
        }
    }


    getObjectIndex(sketch) {
        const sketches = this.stateManager.sketches;
        return sketches.indexOf(sketch) + 1;
    }


    getSelectedObject() {
        if (!this.selectedObjectId) return null;
        
        // Find the sketch object by ID
        return this.stateManager.sketches.find(sketch => sketch.objectId === this.selectedObjectId);
    }

    getSelectedMesh() {
        const selectedSketch = this.getSelectedObject();
        if (!selectedSketch) return null;
        
        // Return the extruded mesh from the sketch
        return selectedSketch.extrudedMesh || null;
    }
}
    // Note: restoreSketchObject added below via patch
