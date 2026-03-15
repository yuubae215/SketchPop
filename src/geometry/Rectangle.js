import * as THREE from 'three';

/**
 * Rectangle class for managing 2D plane data
 * Handles width, height, position, and rotation data without 3D extrusion logic
 */
export class Rectangle {
    constructor(startPoint, endPoint) {
        this.startPoint = startPoint || new THREE.Vector2();
        this.endPoint = endPoint || new THREE.Vector2();
        this.rotation = 0; // rotation angle in radians
        this.id = this.generateId();
    }

    generateId() {
        return `rect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Update rectangle dimensions
    update(endPoint) {
        this.endPoint = endPoint.clone();
    }

    // Get rectangle bounds
    getBounds() {
        return {
            minX: Math.min(this.startPoint.x, this.endPoint.x),
            maxX: Math.max(this.startPoint.x, this.endPoint.x),
            minY: Math.min(this.startPoint.y, this.endPoint.y),
            maxY: Math.max(this.startPoint.y, this.endPoint.y)
        };
    }

    // Get rectangle dimensions
    getDimensions() {
        const bounds = this.getBounds();
        return {
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
        };
    }

    // Get rectangle center point
    getCenter() {
        const bounds = this.getBounds();
        return new THREE.Vector2(
            (bounds.minX + bounds.maxX) / 2,
            (bounds.minY + bounds.maxY) / 2
        );
    }

    // Get rectangle area
    getArea() {
        const dimensions = this.getDimensions();
        return dimensions.width * dimensions.height;
    }

    // Check if point is inside rectangle
    containsPoint(point) {
        const bounds = this.getBounds();
        return point.x >= bounds.minX && 
               point.x <= bounds.maxX && 
               point.y >= bounds.minY && 
               point.y <= bounds.maxY;
    }

    // Get rectangle corners
    getCorners() {
        const bounds = this.getBounds();
        return [
            new THREE.Vector2(bounds.minX, bounds.minY), // bottom-left
            new THREE.Vector2(bounds.maxX, bounds.minY), // bottom-right
            new THREE.Vector2(bounds.maxX, bounds.maxY), // top-right
            new THREE.Vector2(bounds.minX, bounds.maxY)  // top-left
        ];
    }

    // Validate rectangle size
    isValid() {
        const dimensions = this.getDimensions();
        return dimensions.width > 0.01 && dimensions.height > 0.01;
    }

    // Set position by center
    setPosition(center) {
        const dimensions = this.getDimensions();
        this.startPoint = new THREE.Vector2(
            center.x - dimensions.width / 2,
            center.y - dimensions.height / 2
        );
        this.endPoint = new THREE.Vector2(
            center.x + dimensions.width / 2,
            center.y + dimensions.height / 2
        );
    }

    // Scale rectangle
    scale(scaleX, scaleY = scaleX) {
        const center = this.getCenter();
        const dimensions = this.getDimensions();
        
        const newWidth = dimensions.width * scaleX;
        const newHeight = dimensions.height * scaleY;
        
        this.startPoint = new THREE.Vector2(
            center.x - newWidth / 2,
            center.y - newHeight / 2
        );
        this.endPoint = new THREE.Vector2(
            center.x + newWidth / 2,
            center.y + newHeight / 2
        );
    }

    // Rotate rectangle
    setRotation(angle) {
        this.rotation = angle;
    }

    // Clone rectangle
    clone() {
        const cloned = new Rectangle(this.startPoint.clone(), this.endPoint.clone());
        cloned.rotation = this.rotation;
        return cloned;
    }

    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            startPoint: { x: this.startPoint.x, y: this.startPoint.y },
            endPoint: { x: this.endPoint.x, y: this.endPoint.y },
            rotation: this.rotation
        };
    }

    // Create from JSON
    static fromJSON(data) {
        const rect = new Rectangle(
            new THREE.Vector2(data.startPoint.x, data.startPoint.y),
            new THREE.Vector2(data.endPoint.x, data.endPoint.y)
        );
        rect.id = data.id || rect.generateId();
        rect.rotation = data.rotation || 0;
        return rect;
    }
}