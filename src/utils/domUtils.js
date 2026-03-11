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
    let dims = null;
    if (sketch.getBounds) {
        const b = sketch.getBounds();
        const w = Math.abs(b.maxX - b.minX).toFixed(1);
        const d = Math.abs(b.maxZ - b.minZ).toFixed(1);
        const h = sketch.isExtruded ? Number(sketch.extrudeHeight || 0).toFixed(1) : null;
        dims = sketch.isExtruded ? `${w} × ${d} × ${h}` : `${w} × ${d}`;
    }
    return {
        id: sketch.objectId,
        name: sketch.objectName || (sketch.isExtruded ? `Box ${index}` : `Rectangle ${index}`),
        type: sketch.isExtruded ? 'EXTRUDED' : 'SKETCH',
        isExtruded: sketch.isExtruded,
        className: sketch.isExtruded ? 'extruded' : 'sketch',
        dims,
        isVisible: sketch.extrudedMesh ? sketch.extrudedMesh.visible : true
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
    const dimsHtml = itemData.dims
        ? `<span class="object-dims">${itemData.dims}</span>`
        : '';
    const eyeIcon = itemData.isVisible !== false
        ? `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z" fill="currentColor"/></svg>`
        : `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/></svg>`;

    return `
        <svg class="object-icon" viewBox="0 0 24 24">
            ${iconSvg}
        </svg>
        <div class="object-info">
            <span class="object-name">${itemData.name}</span>
            ${dimsHtml}
        </div>
        <button class="object-vis-btn" title="Toggle visibility" data-action="toggle-vis">
            ${eyeIcon}
        </button>
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