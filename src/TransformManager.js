import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class TransformManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
        this.transformControls = null;
        this.currentTransformObject = null;
        this.transformMode = 'translate'; // 'translate', 'rotate', 'scale'
        this.isTransforming = false;
        this.originalObjectData = null; // Store original position/rotation/scale for undo
        
        this.init();
    }

    init() {
        // Check if camera and renderer are available
        if (!this.sceneManager.camera || !this.sceneManager.renderer) {
            console.warn('TransformManager: Camera or renderer not available yet, deferring initialization');
            return;
        }
        
        // Create TransformControls
        this.transformControls = new TransformControls(
            this.sceneManager.camera, 
            this.sceneManager.renderer.domElement
        );
        
        // Set initial mode and space
        this.transformControls.setMode(this.transformMode);
        this.transformControls.setSpace('world');
        
        // Add the helper/gizmo to scene (as per official documentation)
        const gizmo = this.transformControls.getHelper();
        this.sceneManager.addToScene(gizmo);
        
        // Initially hide the controls
        this.transformControls.visible = false;
        
        this.setupEventListeners();
    }

    // Method to initialize TransformControls after SceneManager is ready
    initializeTransformControls() {
        if (this.transformControls) {
            console.warn('TransformControls already initialized');
            return;
        }
        
        if (!this.sceneManager.camera || !this.sceneManager.renderer) {
            console.error('TransformManager: Camera or renderer still not available');
            return;
        }
        
        this.init();
    }

    setupEventListeners() {
        if (!this.transformControls) {
            console.warn('TransformControls not initialized, skipping event listeners');
            return;
        }
        
        // Change event - fires on any transformation change
        // Note: Manual rendering is not needed when animation loop is running
        // this.transformControls.addEventListener('change', () => {
        //     // The scene is automatically rendered by the animation loop
        // });
        
        // Dragging changed event - official way to handle orbit controls
        this.transformControls.addEventListener('dragging-changed', (event) => {
            if (this.sceneManager.controls) {
                this.sceneManager.controls.enabled = !event.value;
            }
            this.isTransforming = event.value;
            
            if (event.value) {
                this.storeOriginalObjectData();
                console.log('Transform started');
            } else {
                console.log('Transform ended');
                this.updateObjectInStateManager();
            }
        });

        // Object change event - fires when the controlled object changes
        this.transformControls.addEventListener('objectChange', () => {
            if (this.currentTransformObject && this.currentTransformObject.userData.sketchRectangle) {
                this.updateSketchRectangleDimensions();
            }
        });
    }

    // Attach transform controls to an object
    attachToObject(object) {
        console.log('TransformManager: attachToObject called with:', object);
        
        if (!this.transformControls) {
            console.warn('TransformControls not initialized, cannot attach to object');
            return;
        }
        
        if (!object) {
            this.detachFromObject();
            return;
        }

        console.log('TransformManager: Attaching controls to object:', object);
        this.currentTransformObject = object;
        this.transformControls.attach(object);
        this.transformControls.visible = true;
        
        // Store original data for potential undo
        this.storeOriginalObjectData();
        
        console.log('TransformControls attached to object:', object.userData ? object.userData.objectId : 'no userData');
    }

    // Detach transform controls
    detachFromObject() {
        if (!this.transformControls) {
            console.warn('TransformControls not initialized, cannot detach');
            return;
        }
        
        // Skip if already detached
        if (!this.currentTransformObject && !this.transformControls.object) {
            console.log('TransformControls already detached, skipping');
            return;
        }
        
        if (this.transformControls.object) {
            this.transformControls.detach();
        }
        this.transformControls.visible = false;
        this.currentTransformObject = null;
        this.originalObjectData = null;
        
        console.log('TransformControls detached');
        console.trace('detachFromObject called from:');
    }

    // Set transform mode
    setMode(mode) {
        if (['translate', 'rotate', 'scale'].includes(mode)) {
            this.transformMode = mode;
            if (this.transformControls) {
                this.transformControls.setMode(mode);
            }
            console.log('Transform mode set to:', mode);
        }
    }

    // Get current transform mode
    getMode() {
        return this.transformMode;
    }

    // Handle keyboard shortcuts for transform controls
    handleKeyboardShortcut(key) {
        if (!this.transformControls) {
            return;
        }

        switch (key.toLowerCase()) {
            case 'w':
                this.setMode('translate');
                break;
            case 'e':
                this.setMode('rotate');
                break;
            case 'r':
                this.setMode('scale');
                break;
            case 'q':
                // Toggle between world and local space
                const newSpace = this.transformControls.space === 'local' ? 'world' : 'local';
                this.transformControls.setSpace(newSpace);
                console.log('Transform space set to:', newSpace);
                break;
            case 'x':
                // Toggle X axis visibility
                this.transformControls.showX = !this.transformControls.showX;
                console.log('X axis visibility:', this.transformControls.showX);
                break;
            case 'y':
                // Toggle Y axis visibility
                this.transformControls.showY = !this.transformControls.showY;
                console.log('Y axis visibility:', this.transformControls.showY);
                break;
            case 'z':
                // Toggle Z axis visibility
                this.transformControls.showZ = !this.transformControls.showZ;
                console.log('Z axis visibility:', this.transformControls.showZ);
                break;
            case '+':
            case '=':
                // Increase control size
                this.transformControls.setSize(this.transformControls.size * 1.1);
                console.log('Transform controls size:', this.transformControls.size);
                break;
            case '-':
            case '_':
                // Decrease control size
                this.transformControls.setSize(this.transformControls.size * 0.9);
                console.log('Transform controls size:', this.transformControls.size);
                break;
            case 'escape':
                // Reset transformation
                if (this.transformControls.object) {
                    this.transformControls.reset();
                    console.log('Transform reset');
                }
                break;
        }
    }

    // Check if currently transforming
    isTransformActive() {
        return this.isTransforming;
    }

    // Store original object data for undo functionality
    storeOriginalObjectData() {
        if (this.currentTransformObject) {
            this.originalObjectData = {
                position: this.currentTransformObject.position.clone(),
                rotation: this.currentTransformObject.rotation.clone(),
                scale: this.currentTransformObject.scale.clone()
            };
        }
    }

    // Restore object to original state
    restoreOriginalState() {
        if (this.currentTransformObject && this.originalObjectData) {
            this.currentTransformObject.position.copy(this.originalObjectData.position);
            this.currentTransformObject.rotation.copy(this.originalObjectData.rotation);
            this.currentTransformObject.scale.copy(this.originalObjectData.scale);
            
            this.updateObjectInStateManager();
            console.log('Object restored to original state');
        }
    }

    // Update object in state manager after transformation
    updateObjectInStateManager() {
        if (this.currentTransformObject && this.currentTransformObject.userData.sketchRectangle) {
            const sketchRectangle = this.currentTransformObject.userData.sketchRectangle;
            
            // Update sketch rectangle's internal data if needed
            // This might involve updating startPoint, endPoint based on new position
            this.updateSketchRectangleFromTransform(sketchRectangle);
            
            // Update object list if needed
            if (this.stateManager.objectListManager) {
                this.stateManager.objectListManager.updateSketchObject(sketchRectangle);
            }
        }
    }

    // Update sketch rectangle data from transform
    updateSketchRectangleFromTransform(sketchRectangle) {
        if (!this.currentTransformObject) return;

        const position = this.currentTransformObject.position;
        const scale = this.currentTransformObject.scale;
        
        // Calculate new start and end points based on position and scale
        const width = Math.abs(sketchRectangle.endPoint.x - sketchRectangle.startPoint.x) * scale.x;
        const depth = Math.abs(sketchRectangle.endPoint.z - sketchRectangle.startPoint.z) * scale.z;
        
        // Update the sketch rectangle's points to match the new transform
        sketchRectangle.startPoint.set(
            position.x - width / 2,
            position.y,
            position.z - depth / 2
        );
        
        sketchRectangle.endPoint.set(
            position.x + width / 2,
            position.y,
            position.z + depth / 2
        );

        // If the object has been extruded, update the height
        if (sketchRectangle.isExtruded && sketchRectangle.extrudedMesh) {
            sketchRectangle.extrudeHeight *= scale.y;
        }

        // Update dimensions if they are displayed
        if (sketchRectangle.showDimensions && this.stateManager.dimensionsEnabled) {
            sketchRectangle.updateDimensions();
        }
    }

    // Update dimensions during transformation
    updateSketchRectangleDimensions() {
        if (this.currentTransformObject && this.currentTransformObject.userData.sketchRectangle) {
            const sketchRectangle = this.currentTransformObject.userData.sketchRectangle;
            
            if (sketchRectangle.showDimensions && this.stateManager.dimensionsEnabled) {
                sketchRectangle.updateDimensions();
            }
        }
    }

    // Enable/disable transform controls
    setEnabled(enabled) {
        this.transformControls.enabled = enabled;
        
        if (!enabled) {
            this.detachFromObject();
        }
    }

    // Set transform controls visibility
    setVisible(visible) {
        this.transformControls.visible = visible && this.currentTransformObject !== null;
    }

    // Handle object selection for transformation
    handleObjectSelection(object) {
        if (object && object.userData.sketchRectangle) {
            this.attachToObject(object);
            return true;
        } else {
            this.detachFromObject();
            return false;
        }
    }

    // Cleanup
    dispose() {
        if (this.transformControls) {
            this.detachFromObject();
            this.sceneManager.removeFromScene(this.transformControls);
            this.transformControls.dispose();
            this.transformControls = null;
        }
    }

    // Keyboard shortcuts for transform modes
    handleKeyboardShortcut(key) {
        switch (key.toLowerCase()) {
            case 'g': // Grab/Move (translate)
                this.setMode('translate');
                break;
            case 'r': // Rotate
                this.setMode('rotate');
                break;
            case 's': // Scale
                this.setMode('scale');
                break;
            case 'escape':
                if (this.isTransforming) {
                    this.restoreOriginalState();
                } else {
                    this.detachFromObject();
                }
                break;
        }
    }

    // Get transform summary for UI display
    getTransformSummary() {
        if (!this.currentTransformObject) {
            return null;
        }

        const pos = this.currentTransformObject.position;
        const rot = this.currentTransformObject.rotation;
        const scale = this.currentTransformObject.scale;

        return {
            position: { x: pos.x.toFixed(2), y: pos.y.toFixed(2), z: pos.z.toFixed(2) },
            rotation: { 
                x: (rot.x * 180 / Math.PI).toFixed(1), 
                y: (rot.y * 180 / Math.PI).toFixed(1), 
                z: (rot.z * 180 / Math.PI).toFixed(1) 
            },
            scale: { x: scale.x.toFixed(2), y: scale.y.toFixed(2), z: scale.z.toFixed(2) }
        };
    }
}