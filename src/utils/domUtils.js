/**
 * Pure functions for DOM-related calculations and data transformations
 * These functions have no side effects and don't directly manipulate the DOM
 */

/**
 * Generate object item data structure
 * @param {Object} sketch - sketch object 
 * @param {number} index - object index
 * @returns {Object} object item data for rendering
 */
export function generateObjectItemData(sketch, index) {
    return {
        id: sketch.objectId,
        name: sketch.isExtruded ? `Box ${index}` : `Rectangle ${index}`,
        type: sketch.isExtruded ? 'EXTRUDED' : 'SKETCH',
        isExtruded: sketch.isExtruded,
        className: sketch.isExtruded ? 'extruded' : 'sketch'
    };
}

/**
 * Generate SVG icon path based on object type
 * @param {boolean} isExtruded - whether object is extruded
 * @returns {string} SVG path string
 */
export function generateObjectIcon(isExtruded) {
    if (isExtruded) {
        // Box icon for extruded objects
        return '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>';
    } else {
        // Rectangle icon for sketches
        return '<rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>';
    }
}

/**
 * Generate HTML string for object item
 * @param {Object} itemData - object item data from generateObjectItemData
 * @returns {string} HTML string for object item
 */
export function generateObjectItemHTML(itemData) {
    const iconSvg = generateObjectIcon(itemData.isExtruded);
    
    return `
        <svg class="object-icon" viewBox="0 0 24 24">
            ${iconSvg}
        </svg>
        <span class="object-name">${itemData.name}</span>
        <span class="object-type">${itemData.type}</span>
    `;
}

/**
 * Calculate selection state changes
 * @param {string|null} currentSelectedId - currently selected object ID
 * @param {string|null} newSelectedId - new object ID to select
 * @returns {Object} selection change operations
 */
export function calculateSelectionChanges(currentSelectedId, newSelectedId) {
    return {
        shouldRemoveSelection: currentSelectedId !== null,
        shouldAddSelection: newSelectedId !== null,
        removeFromId: currentSelectedId,
        addToId: newSelectedId
    };
}

/**
 * Generate unique object ID
 * @returns {string} unique object ID
 */
export function generateObjectId() {
    return 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}