/**
 * Pure geometry utility functions
 * These functions have no side effects and always return the same output for the same input
 */

/**
 * Calculate bounds from start and end points
 * @param {THREE.Vector3} startPoint 
 * @param {THREE.Vector3} endPoint 
 * @returns {Object} bounds object with minX, maxX, minZ, maxZ
 */
export function calculateBounds(startPoint, endPoint) {
    return {
        minX: Math.min(startPoint.x, endPoint.x),
        maxX: Math.max(startPoint.x, endPoint.x),
        minZ: Math.min(startPoint.z, endPoint.z),
        maxZ: Math.max(startPoint.z, endPoint.z)
    };
}

/**
 * Calculate rectangle dimensions from bounds
 * @param {Object} bounds - bounds object with minX, maxX, minZ, maxZ
 * @returns {Object} dimensions object with width, depth
 */
export function calculateDimensions(bounds) {
    return {
        width: bounds.maxX - bounds.minX,
        depth: bounds.maxZ - bounds.minZ
    };
}

/**
 * Calculate center point from bounds
 * @param {Object} bounds - bounds object with minX, maxX, minZ, maxZ
 * @param {number} height - Y coordinate for the center point (default: 0)
 * @returns {THREE.Vector3} center point
 */
export function calculateCenter(bounds, height = 0) {
    return {
        x: (bounds.minX + bounds.maxX) / 2,
        y: height,
        z: (bounds.minZ + bounds.maxZ) / 2
    };
}

/**
 * Generate rectangle corner points from bounds
 * @param {Object} bounds - bounds object with minX, maxX, minZ, maxZ
 * @param {number} y - Y coordinate for all points (default: 0)
 * @returns {Array<Object>} array of point objects with x, y, z properties
 */
export function generateRectanglePoints(bounds, y = 0) {
    return [
        { x: bounds.minX, y, z: bounds.minZ },
        { x: bounds.maxX, y, z: bounds.minZ },
        { x: bounds.maxX, y, z: bounds.maxZ },
        { x: bounds.minX, y, z: bounds.maxZ },
        { x: bounds.minX, y, z: bounds.minZ } // Close the rectangle
    ];
}

/**
 * Check if a point is contained within bounds
 * @param {Object} point - point object with x, z properties
 * @param {Object} bounds - bounds object with minX, maxX, minZ, maxZ
 * @returns {boolean} true if point is within bounds
 */
export function pointInBounds(point, bounds) {
    return point.x >= bounds.minX && 
           point.x <= bounds.maxX && 
           point.z >= bounds.minZ && 
           point.z <= bounds.maxZ;
}

/**
 * Calculate face normal vector from three points
 * @param {Object} p1 - first point with x, y, z properties
 * @param {Object} p2 - second point with x, y, z properties  
 * @param {Object} p3 - third point with x, y, z properties
 * @returns {Object} normalized normal vector with x, y, z properties
 */
export function calculateFaceNormal(p1, p2, p3) {
    // Calculate two edge vectors
    const edge1 = {
        x: p2.x - p1.x,
        y: p2.y - p1.y,
        z: p2.z - p1.z
    };
    
    const edge2 = {
        x: p3.x - p1.x,
        y: p3.y - p1.y,
        z: p3.z - p1.z
    };
    
    // Calculate cross product
    const normal = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x
    };
    
    // Normalize
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    if (length > 0) {
        normal.x /= length;
        normal.y /= length;
        normal.z /= length;
    }
    
    return normal;
}

/**
 * Calculate distance between two points
 * @param {Object} p1 - first point with x, y, z properties
 * @param {Object} p2 - second point with x, y, z properties
 * @returns {number} distance between points
 */
export function calculateDistance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Validate if rectangle has minimum size
 * @param {Object} bounds - bounds object with minX, maxX, minZ, maxZ
 * @param {number} minSize - minimum size threshold (default: 0.2)
 * @returns {boolean} true if rectangle meets minimum size requirement
 */
export function validateRectangleSize(bounds, minSize = 0.2) {
    const dimensions = calculateDimensions(bounds);
    return dimensions.width >= minSize && dimensions.depth >= minSize;
}