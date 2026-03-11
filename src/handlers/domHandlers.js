/**
 * DOM manipulation handlers (side effects)
 * These functions perform actual DOM operations and have side effects
 */

/**
 * DOM Handler for object list operations
 */
export class ObjectListDOMHandler {
    constructor(objectListElement, objectCountElement) {
        this.objectList = objectListElement;
        this.objectCount = objectCountElement;
    }

    /**
     * Create and append object item to the list
     * @param {Object} itemData - object item data
     * @param {string} htmlContent - HTML content for the item
     */
    addObjectItem(itemData, htmlContent) {
        if (!this.objectList) return;
        const objectItem = document.createElement('div');
        objectItem.className = `object-item ${itemData.className}`;
        objectItem.dataset.objectId = itemData.id;
        objectItem.innerHTML = htmlContent;

        this.objectList.appendChild(objectItem);
        this.updateObjectCount();
    }

    /**
     * Update object item content
     * @param {string} objectId - object ID to update
     * @param {Object} itemData - new item data
     */
    updateObjectItem(objectId, itemData) {
        if (!this.objectList) return;
        const objectItem = this.objectList.querySelector(`[data-object-id="${objectId}"]`);
        if (!objectItem) return;

        const nameEl = objectItem.querySelector('.object-name');
        const dimsEl = objectItem.querySelector('.object-dims');
        const visBtn  = objectItem.querySelector('.object-vis-btn');

        if (nameEl) nameEl.textContent = itemData.name;

        if (dimsEl && itemData.dims) {
            dimsEl.textContent = itemData.dims;
        } else if (!dimsEl && itemData.dims) {
            const info = objectItem.querySelector('.object-info');
            if (info) {
                const span = document.createElement('span');
                span.className = 'object-dims';
                span.textContent = itemData.dims;
                info.appendChild(span);
            }
        }

        if (visBtn) {
            visBtn.classList.toggle('object-vis-btn--hidden', itemData.isVisible === false);
        }

        // Update class names
        objectItem.classList.remove('sketch', 'extruded');
        objectItem.classList.add(itemData.className);
        objectItem.classList.toggle('obj-hidden', itemData.isVisible === false);
    }

    /**
     * Remove object item from the list
     * @param {string} objectId - object ID to remove
     */
    removeObjectItem(objectId) {
        if (!this.objectList) return;
        const objectItem = this.objectList.querySelector(`[data-object-id="${objectId}"]`);
        if (objectItem) {
            objectItem.remove();
            this.updateObjectCount();
        }
    }

    /**
     * Update selection state
     * @param {Object} selectionChanges - selection change operations
     */
    updateSelection(selectionChanges) {
        if (!this.objectList) return;
        // Remove previous selection
        if (selectionChanges.shouldRemoveSelection && selectionChanges.removeFromId) {
            const previousSelected = this.objectList.querySelector('.object-item.selected');
            if (previousSelected) {
                previousSelected.classList.remove('selected');
            }
        }

        // Add new selection
        if (selectionChanges.shouldAddSelection && selectionChanges.addToId) {
            const objectItem = this.objectList.querySelector(`[data-object-id="${selectionChanges.addToId}"]`);
            if (objectItem) {
                objectItem.classList.add('selected');
            }
        }
    }

    /**
     * Clear all object items
     */
    clearAllItems() {
        if (!this.objectList) return;
        this.objectList.innerHTML = '';
        this.updateObjectCount();
    }

    /**
     * Update object count display
     */
    updateObjectCount() {
        if (!this.objectList || !this.objectCount) return;
        const count = this.objectList.children.length;
        this.objectCount.textContent = count;
    }

    /**
     * Add click event listener to the object list
     * @param {Function} clickHandler - function to handle clicks
     */
    addClickListener(clickHandler) {
        if (!this.objectList) return;
        this.objectList.addEventListener('click', clickHandler);
    }

    /**
     * Add dblclick event listener to the object list
     * @param {Function} handler
     */
    addDblClickListener(handler) {
        if (!this.objectList) return;
        this.objectList.addEventListener('dblclick', handler);
    }
}

/**
 * DOM Handler for selection mode buttons
 */
export class SelectionModeDOMHandler {
    constructor() {
        this.objectSelectBtn = document.getElementById('object-select-btn');
        this.faceSelectBtn = document.getElementById('face-select-btn');
    }

    /**
     * Update selection mode button states
     * @param {string} activeMode - 'object' or 'face'
     */
    updateSelectionModeButtons(activeMode) {
        if (this.objectSelectBtn && this.faceSelectBtn) {
            this.objectSelectBtn.classList.toggle('active', activeMode === 'object');
            this.faceSelectBtn.classList.toggle('active', activeMode === 'face');
        }
    }

    /**
     * Add click listeners to selection mode buttons
     * @param {Function} objectClickHandler - handler for object selection button
     * @param {Function} faceClickHandler - handler for face selection button
     */
    addSelectionModeListeners(objectClickHandler, faceClickHandler) {
        if (this.objectSelectBtn) {
            this.objectSelectBtn.addEventListener('click', objectClickHandler);
        }
        if (this.faceSelectBtn) {
            this.faceSelectBtn.addEventListener('click', faceClickHandler);
        }
    }
}

/**
 * DOM Handler for confirmation controls
 */
export class ConfirmationControlsDOMHandler {
    constructor() {
        this.confirmationControls = document.getElementById('confirmationControls');
        this.confirmButton = document.getElementById('confirmShape');
        this.cancelButton = document.getElementById('cancelShape');
    }

    /**
     * Show confirmation controls
     */
    show() {
        if (this.confirmationControls) {
            this.confirmationControls.style.display = 'block';
        }
    }

    /**
     * Hide confirmation controls
     */
    hide() {
        if (this.confirmationControls) {
            this.confirmationControls.style.display = 'none';
        }
    }

    /**
     * Add event listeners to confirmation buttons
     * @param {Function} confirmHandler - handler for confirm button
     * @param {Function} cancelHandler - handler for cancel button
     */
    addEventListeners(confirmHandler, cancelHandler) {
        if (this.confirmButton) {
            this.confirmButton.addEventListener('click', confirmHandler);
        }
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', cancelHandler);
        }
    }
}