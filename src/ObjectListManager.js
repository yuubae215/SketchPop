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
        this.domHandler.addClickListener(this.onObjectClick.bind(this));
        this.domHandler.addDblClickListener(this.onObjectDblClick.bind(this));
    }

    onObjectClick(event) {
        // Visibility toggle button
        if (event.target.closest('[data-action="toggle-vis"]')) {
            const objectItem = event.target.closest('.object-item');
            if (!objectItem) return;
            this.toggleVisibility(objectItem.dataset.objectId);
            return;
        }

        const objectItem = event.target.closest('.object-item');
        if (!objectItem) return;
        // Don't select if clicking on an inline rename input
        if (event.target.tagName === 'INPUT') return;
        this.selectObject(objectItem.dataset.objectId);
    }

    onObjectDblClick(event) {
        const objectItem = event.target.closest('.object-item');
        if (!objectItem) return;
        if (event.target.closest('[data-action="toggle-vis"]')) return;
        this.startRename(objectItem.dataset.objectId);
    }

    toggleVisibility(objectId) {
        const sketch = this.stateManager.sketches.find(s => s.objectId === objectId);
        if (!sketch) return;

        const mesh = sketch.extrudedMesh || sketch.mesh;
        if (!mesh) return;
        mesh.visible = !mesh.visible;

        // Also toggle 2D sketch mesh if it exists
        if (sketch.mesh && sketch.mesh !== mesh) {
            sketch.mesh.visible = mesh.visible;
        }

        this.updateSketchObject(sketch);
    }

    /**
     * Rename an object via an inline input in the object list.
     * @param {string} objectId
     */
    startRename(objectId) {
        const sketch = this.stateManager.sketches.find(s => s.objectId === objectId);
        if (!sketch) return;

        const objectItem = this.domHandler.objectList
            ? this.domHandler.objectList.querySelector(`[data-object-id="${objectId}"]`)
            : null;
        if (!objectItem) return;

        const nameEl = objectItem.querySelector('.object-name');
        if (!nameEl || objectItem.querySelector('.object-rename-input')) return;

        const currentName = nameEl.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'object-rename-input';
        input.value = currentName;
        nameEl.replaceWith(input);
        input.focus();
        input.select();

        const commit = () => {
            const newName = input.value.trim() || currentName;
            sketch.objectName = newName;
            const span = document.createElement('span');
            span.className = 'object-name';
            span.textContent = newName;
            input.replaceWith(span);
        };

        input.addEventListener('blur', commit, { once: true });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') {
                sketch.objectName = currentName; // no change
                input.value = currentName;
                input.blur();
            }
            e.stopPropagation();
        });
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
