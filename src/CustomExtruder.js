import * as THREE from 'three';
import { Rectangle } from './Rectangle.js';
import { Box } from './Box.js';

/**
 * CustomExtruder class for converting Rectangle to Box
 * Handles the extrusion process from 2D rectangles to 3D boxes
 */
export class CustomExtruder {
    constructor() {
        this.extrudedBoxes = new Map(); // rectangleId -> Box
        this.rectangles = new Map(); // rectangleId -> Rectangle
    }

    /**
     * Create a rectangle from start and end points
     * @param {THREE.Vector2} startPoint - Start point in 2D space
     * @param {THREE.Vector2} endPoint - End point in 2D space
     * @returns {Rectangle} - Created rectangle
     */
    createRectangle(startPoint, endPoint) {
        const rectangle = new Rectangle(startPoint, endPoint);
        this.rectangles.set(rectangle.id, rectangle);
        return rectangle;
    }

    /**
     * Update rectangle dimensions
     * @param {string} rectangleId - Rectangle ID
     * @param {THREE.Vector2} endPoint - New end point
     * @returns {Rectangle|null} - Updated rectangle or null if not found
     */
    updateRectangle(rectangleId, endPoint) {
        const rectangle = this.rectangles.get(rectangleId);
        if (rectangle) {
            rectangle.update(endPoint);
            
            // If this rectangle has been extruded, update the box as well
            const box = this.extrudedBoxes.get(rectangleId);
            if (box) {
                const dimensions = rectangle.getDimensions();
                box.updateDimensions(dimensions.width, box.height, dimensions.height);
            }
        }
        return rectangle;
    }

    /**
     * Extrude a rectangle to create a 3D box
     * @param {string} rectangleId - Rectangle ID to extrude
     * @param {number} height - Extrusion height
     * @returns {Box|null} - Created box or null if rectangle not found
     */
    extrudeRectangle(rectangleId, height = 1.0) {
        const rectangle = this.rectangles.get(rectangleId);
        if (!rectangle || !rectangle.isValid()) {
            console.warn('Invalid or non-existent rectangle for extrusion:', rectangleId);
            return null;
        }

        // Remove existing box if it exists
        if (this.extrudedBoxes.has(rectangleId)) {
            this.removeExtrudedBox(rectangleId);
        }

        // Create new box from rectangle
        const box = new Box(rectangle, height);
        this.extrudedBoxes.set(rectangleId, box);

        return box;
    }

    /**
     * Update extrusion height of an existing box
     * @param {string} rectangleId - Rectangle ID
     * @param {number} height - New height
     * @returns {Box|null} - Updated box or null if not found
     */
    updateExtrusionHeight(rectangleId, height) {
        const box = this.extrudedBoxes.get(rectangleId);
        if (box) {
            box.updateHeight(height);
        }
        return box;
    }

    /**
     * Remove extruded box for a rectangle
     * @param {string} rectangleId - Rectangle ID
     * @returns {boolean} - True if box was removed
     */
    removeExtrudedBox(rectangleId) {
        const box = this.extrudedBoxes.get(rectangleId);
        if (box) {
            box.remove();
            this.extrudedBoxes.delete(rectangleId);
            return true;
        }
        return false;
    }

    /**
     * Remove rectangle and its associated box
     * @param {string} rectangleId - Rectangle ID
     * @returns {boolean} - True if rectangle was removed
     */
    removeRectangle(rectangleId) {
        // Remove associated box first
        this.removeExtrudedBox(rectangleId);
        
        // Remove rectangle
        const rectangle = this.rectangles.get(rectangleId);
        if (rectangle) {
            this.rectangles.delete(rectangleId);
            return true;
        }
        return false;
    }

    /**
     * Get rectangle by ID
     * @param {string} rectangleId - Rectangle ID
     * @returns {Rectangle|null} - Rectangle or null if not found
     */
    getRectangle(rectangleId) {
        return this.rectangles.get(rectangleId) || null;
    }

    /**
     * Get box by rectangle ID
     * @param {string} rectangleId - Rectangle ID
     * @returns {Box|null} - Box or null if not found
     */
    getBox(rectangleId) {
        return this.extrudedBoxes.get(rectangleId) || null;
    }

    /**
     * Check if rectangle is extruded
     * @param {string} rectangleId - Rectangle ID
     * @returns {boolean} - True if rectangle is extruded
     */
    isExtruded(rectangleId) {
        return this.extrudedBoxes.has(rectangleId);
    }

    /**
     * Get all rectangles
     * @returns {Array<Rectangle>} - Array of all rectangles
     */
    getAllRectangles() {
        return Array.from(this.rectangles.values());
    }

    /**
     * Get all boxes
     * @returns {Array<Box>} - Array of all boxes
     */
    getAllBoxes() {
        return Array.from(this.extrudedBoxes.values());
    }

    /**
     * Get all extruded rectangle IDs
     * @returns {Array<string>} - Array of rectangle IDs that have been extruded
     */
    getExtrudedRectangleIds() {
        return Array.from(this.extrudedBoxes.keys());
    }

    /**
     * Scale rectangle and its associated box
     * @param {string} rectangleId - Rectangle ID
     * @param {number} scaleX - Scale factor for X axis
     * @param {number} scaleY - Scale factor for Y axis
     * @param {number} scaleZ - Scale factor for Z axis (height)
     * @returns {boolean} - True if scaling was successful
     */
    scaleRectangle(rectangleId, scaleX, scaleY = scaleX, scaleZ = 1.0) {
        const rectangle = this.rectangles.get(rectangleId);
        if (!rectangle) return false;

        // Scale the 2D rectangle
        rectangle.scale(scaleX, scaleY);

        // Scale the 3D box if it exists
        const box = this.extrudedBoxes.get(rectangleId);
        if (box) {
            box.scale(scaleX, scaleZ, scaleY); // Note: Box uses X,Y,Z while Rectangle uses X,Y
        }

        return true;
    }

    /**
     * Move rectangle and its associated box
     * @param {string} rectangleId - Rectangle ID
     * @param {THREE.Vector2} newCenter - New center position for rectangle
     * @returns {boolean} - True if move was successful
     */
    moveRectangle(rectangleId, newCenter) {
        const rectangle = this.rectangles.get(rectangleId);
        if (!rectangle) return false;

        // Move the 2D rectangle
        rectangle.setPosition(newCenter);

        // Move the 3D box if it exists
        const box = this.extrudedBoxes.get(rectangleId);
        if (box) {
            box.setPosition(newCenter.x, box.position.y, newCenter.y);
        }

        return true;
    }

    /**
     * Rotate rectangle and its associated box
     * @param {string} rectangleId - Rectangle ID
     * @param {number} angle - Rotation angle in radians
     * @returns {boolean} - True if rotation was successful
     */
    rotateRectangle(rectangleId, angle) {
        const rectangle = this.rectangles.get(rectangleId);
        if (!rectangle) return false;

        // Rotate the 2D rectangle
        rectangle.setRotation(angle);

        // Rotate the 3D box if it exists
        const box = this.extrudedBoxes.get(rectangleId);
        if (box) {
            box.setRotation(0, angle, 0);
        }

        return true;
    }

    /**
     * Clear all rectangles and boxes
     */
    clear() {
        // Remove all boxes
        for (const box of this.extrudedBoxes.values()) {
            box.remove();
        }
        this.extrudedBoxes.clear();

        // Clear rectangles
        this.rectangles.clear();
    }

    /**
     * Get statistics about current state
     * @returns {Object} - Statistics object
     */
    getStatistics() {
        return {
            totalRectangles: this.rectangles.size,
            extrudedRectangles: this.extrudedBoxes.size,
            unextrudedRectangles: this.rectangles.size - this.extrudedBoxes.size,
            rectangleIds: Array.from(this.rectangles.keys()),
            extrudedIds: Array.from(this.extrudedBoxes.keys())
        };
    }

    /**
     * Validate data consistency
     * @returns {Object} - Validation result
     */
    validateConsistency() {
        const issues = [];
        
        // Check that all extruded boxes have corresponding rectangles
        for (const rectangleId of this.extrudedBoxes.keys()) {
            if (!this.rectangles.has(rectangleId)) {
                issues.push(`Box exists without corresponding rectangle: ${rectangleId}`);
            }
        }

        // Check that all rectangles are valid
        for (const [id, rectangle] of this.rectangles.entries()) {
            if (!rectangle.isValid()) {
                issues.push(`Invalid rectangle dimensions: ${id}`);
            }
        }

        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }

    /**
     * Export data to JSON
     * @returns {Object} - JSON representation
     */
    toJSON() {
        const rectanglesData = {};
        const boxesData = {};

        for (const [id, rectangle] of this.rectangles.entries()) {
            rectanglesData[id] = rectangle.toJSON();
        }

        for (const [id, box] of this.extrudedBoxes.entries()) {
            boxesData[id] = box.toJSON();
        }

        return {
            rectangles: rectanglesData,
            boxes: boxesData,
            timestamp: Date.now()
        };
    }

    /**
     * Import data from JSON
     * @param {Object} data - JSON data
     * @returns {boolean} - True if import was successful
     */
    fromJSON(data) {
        try {
            this.clear();

            // Import rectangles
            if (data.rectangles) {
                for (const [id, rectData] of Object.entries(data.rectangles)) {
                    const rectangle = Rectangle.fromJSON(rectData);
                    this.rectangles.set(id, rectangle);
                }
            }

            // Import boxes
            if (data.boxes) {
                for (const [id, boxData] of Object.entries(data.boxes)) {
                    const box = Box.fromJSON(boxData);
                    this.extrudedBoxes.set(id, box);
                }
            }

            return true;
        } catch (error) {
            console.error('Failed to import CustomExtruder data:', error);
            return false;
        }
    }
}