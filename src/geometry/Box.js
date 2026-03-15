import * as THREE from 'three';

/**
 * Box class for managing 3D space data
 * Handles position, dimensions, rotation, material properties, and 3D mesh generation
 */
export class Box {
    constructor(rectangleData, height = 1.0) {
        this.rectangleId = rectangleData.id;
        this.width = rectangleData.getDimensions().width;
        this.height = height;
        this.depth = rectangleData.getDimensions().height;
        
        // 3D position (center of the box)
        const rectCenter = rectangleData.getCenter();
        this.position = new THREE.Vector3(rectCenter.x, height / 2, rectCenter.y);
        
        // 3D rotation
        this.rotation = new THREE.Euler(0, rectangleData.rotation, 0);
        
        // Material properties
        this.color = 0x4a90e2;
        this.opacity = 0.8;
        this.transparent = true;
        this.wireframe = false;
        
        // State properties
        this.isPending = false;
        this.isHovered = false;
        this.isSelected = false;
        this.isVisible = true;
        
        // 3D objects
        this.mesh = null;
        this.wireframeMesh = null;
        this.boundingBox = null;
        
        this.id = this.generateId();
    }

    generateId() {
        return `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Update box dimensions
    updateDimensions(width, height, depth) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        
        // Update position Y to keep bottom at the same level
        this.position.y = height / 2;
        
        if (this.mesh) {
            this.regenerateMesh();
        }
    }

    // Update box height only
    updateHeight(height) {
        this.height = height;
        this.position.y = height / 2;
        
        if (this.mesh) {
            this.regenerateMesh();
        }
    }

    // Set 3D position
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
        if (this.wireframeMesh) {
            this.wireframeMesh.position.copy(this.position);
        }
    }

    // Set 3D rotation
    setRotation(x, y, z) {
        this.rotation.set(x, y, z);
        if (this.mesh) {
            this.mesh.rotation.copy(this.rotation);
        }
        if (this.wireframeMesh) {
            this.wireframeMesh.rotation.copy(this.rotation);
        }
    }

    // Set material color
    setColor(color) {
        this.color = color;
        if (this.mesh && this.mesh.material) {
            this.mesh.material.color.setHex(color);
        }
    }

    // Set material opacity
    setOpacity(opacity) {
        this.opacity = opacity;
        if (this.mesh && this.mesh.material) {
            this.mesh.material.opacity = opacity;
        }
    }

    // Toggle wireframe mode
    setWireframe(wireframe) {
        this.wireframe = wireframe;
        if (this.mesh && this.mesh.material) {
            this.mesh.material.wireframe = wireframe;
        }
    }

    // Create 3D mesh
    createMesh() {
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = new THREE.MeshPhongMaterial({
            color: this.getDisplayColor(),
            transparent: this.transparent,
            opacity: this.getDisplayOpacity(),
            wireframe: this.wireframe
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.copy(this.rotation);
        
        // Set userData for selection and identification
        this.mesh.userData.box = this;
        this.mesh.userData.boxId = this.id;
        this.mesh.userData.rectangleId = this.rectangleId;
        
        return this.mesh;
    }

    // Create wireframe mesh
    createWireframeMesh() {
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });

        this.wireframeMesh = new THREE.Mesh(geometry, material);
        this.wireframeMesh.position.copy(this.position);
        this.wireframeMesh.rotation.copy(this.rotation);
        
        return this.wireframeMesh;
    }

    // Regenerate mesh with current properties
    regenerateMesh() {
        if (this.mesh) {
            const parent = this.mesh.parent;
            if (parent) {
                parent.remove(this.mesh);
            }
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }

        if (this.wireframeMesh) {
            const parent = this.wireframeMesh.parent;
            if (parent) {
                parent.remove(this.wireframeMesh);
            }
            this.wireframeMesh.geometry.dispose();
            this.wireframeMesh.material.dispose();
        }

        this.createMesh();
        if (this.wireframeMesh) {
            this.createWireframeMesh();
        }
    }

    // Get display color based on state
    getDisplayColor() {
        if (this.isPending) return 0xff9500;
        if (this.isSelected) return 0x00ff00;
        if (this.isHovered) return 0x66aaff;
        return this.color;
    }

    // Get display opacity based on state
    getDisplayOpacity() {
        if (this.isPending) return 0.6;
        return this.opacity;
    }

    // Set state methods
    setPending(pending = true) {
        this.isPending = pending;
        this.updateVisualState();
    }

    setHovered(hovered = true) {
        this.isHovered = hovered;
        this.updateVisualState();
    }

    setSelected(selected = true) {
        this.isSelected = selected;
        this.updateVisualState();
    }

    setVisible(visible = true) {
        this.isVisible = visible;
        if (this.mesh) {
            this.mesh.visible = visible;
        }
        if (this.wireframeMesh) {
            this.wireframeMesh.visible = visible;
        }
    }

    // Update visual state
    updateVisualState() {
        if (this.mesh && this.mesh.material) {
            this.mesh.material.color.setHex(this.getDisplayColor());
            this.mesh.material.opacity = this.getDisplayOpacity();
        }
    }

    // Get bounding box
    getBoundingBox() {
        if (!this.boundingBox) {
            this.boundingBox = new THREE.Box3();
        }
        
        if (this.mesh) {
            this.boundingBox.setFromObject(this.mesh);
        } else {
            // Calculate bounding box manually
            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;
            const halfDepth = this.depth / 2;
            
            this.boundingBox.min.set(
                this.position.x - halfWidth,
                this.position.y - halfHeight,
                this.position.z - halfDepth
            );
            this.boundingBox.max.set(
                this.position.x + halfWidth,
                this.position.y + halfHeight,
                this.position.z + halfDepth
            );
        }
        
        return this.boundingBox;
    }

    // Get volume
    getVolume() {
        return this.width * this.height * this.depth;
    }

    // Scale box
    scale(scaleX, scaleY = scaleX, scaleZ = scaleX) {
        this.width *= scaleX;
        this.height *= scaleY;
        this.depth *= scaleZ;
        
        // Update position Y to maintain bottom level
        this.position.y = this.height / 2;
        
        if (this.mesh) {
            this.regenerateMesh();
        }
    }

    // Check if point is inside box
    containsPoint(point) {
        const bounds = this.getBoundingBox();
        return bounds.containsPoint(point);
    }

    // Remove from scene
    remove() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        if (this.wireframeMesh && this.wireframeMesh.parent) {
            this.wireframeMesh.parent.remove(this.wireframeMesh);
        }
        
        // Dispose geometry and materials
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        if (this.wireframeMesh) {
            this.wireframeMesh.geometry.dispose();
            this.wireframeMesh.material.dispose();
        }
    }

    // Clone box
    clone() {
        const cloned = new Box(
            { 
                id: this.rectangleId, 
                getDimensions: () => ({ width: this.width, height: this.depth }),
                getCenter: () => ({ x: this.position.x, y: this.position.z }),
                rotation: this.rotation.y
            }, 
            this.height
        );
        
        cloned.color = this.color;
        cloned.opacity = this.opacity;
        cloned.transparent = this.transparent;
        cloned.wireframe = this.wireframe;
        
        return cloned;
    }

    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            rectangleId: this.rectangleId,
            width: this.width,
            height: this.height,
            depth: this.depth,
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            rotation: {
                x: this.rotation.x,
                y: this.rotation.y,
                z: this.rotation.z
            },
            color: this.color,
            opacity: this.opacity,
            transparent: this.transparent,
            wireframe: this.wireframe,
            isVisible: this.isVisible
        };
    }

    // Create from JSON
    static fromJSON(data) {
        const fakeRectangle = {
            id: data.rectangleId,
            getDimensions: () => ({ width: data.width, height: data.depth }),
            getCenter: () => ({ x: data.position.x, y: data.position.z }),
            rotation: data.rotation.y
        };
        
        const box = new Box(fakeRectangle, data.height);
        box.id = data.id;
        box.position.set(data.position.x, data.position.y, data.position.z);
        box.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
        box.color = data.color;
        box.opacity = data.opacity;
        box.transparent = data.transparent;
        box.wireframe = data.wireframe;
        box.isVisible = data.isVisible;
        
        return box;
    }
}