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

        // Axis constraint state
        this.axisConstraint = null;          // 'x' | 'y' | 'z' | null
        this.constraintBasePosition = null;  // THREE.Vector3 saved when constraint applied

        this.init();
    }

    init() {
        if (!this.sceneManager.camera || !this.sceneManager.renderer) {
            console.warn('TransformManager: Camera or renderer not available yet, deferring initialization');
            return;
        }

        this.transformControls = new TransformControls(
            this.sceneManager.camera,
            this.sceneManager.renderer.domElement
        );

        this.transformControls.setMode(this.transformMode);
        this.transformControls.setSpace('world');

        const gizmo = this.transformControls.getHelper();
        this.sceneManager.addToScene(gizmo);

        this.transformControls.visible = false;

        this.setupEventListeners();
    }

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

        this.transformControls.addEventListener('dragging-changed', (event) => {
            if (this.sceneManager.controls) {
                this.sceneManager.controls.enabled = !event.value;
            }
            this.isTransforming = event.value;

            if (event.value) {
                this.storeOriginalObjectData();
                // Update constraint base position when drag starts
                if (this.axisConstraint && this.currentTransformObject) {
                    this.constraintBasePosition = this.currentTransformObject.position.clone();
                }
            } else {
                this.updateObjectInStateManager();
            }
        });

        this.transformControls.addEventListener('objectChange', () => {
            // Apply axis constraint during movement
            if (this.axisConstraint && this.constraintBasePosition && this.currentTransformObject && this.transformMode === 'translate') {
                const pos = this.currentTransformObject.position;
                if (this.axisConstraint === 'x') {
                    pos.y = this.constraintBasePosition.y;
                    pos.z = this.constraintBasePosition.z;
                } else if (this.axisConstraint === 'y') {
                    pos.x = this.constraintBasePosition.x;
                    pos.z = this.constraintBasePosition.z;
                } else if (this.axisConstraint === 'z') {
                    pos.x = this.constraintBasePosition.x;
                    pos.y = this.constraintBasePosition.y;
                }
            }

            if (this.currentTransformObject && this.currentTransformObject.userData.sketchRectangle) {
                this.updateSketchRectangleDimensions();
            }
        });
    }

    attachToObject(object) {
        if (!this.transformControls) {
            console.warn('TransformControls not initialized, cannot attach to object');
            return;
        }

        if (!object) {
            this.detachFromObject();
            return;
        }

        this.currentTransformObject = object;
        this.transformControls.attach(object);
        this.transformControls.visible = true;

        this.storeOriginalObjectData();
        this._clearAxisConstraint();
    }

    detachFromObject() {
        if (!this.transformControls) {
            console.warn('TransformControls not initialized, cannot detach');
            return;
        }

        if (!this.currentTransformObject && !this.transformControls.object) {
            return;
        }

        if (this.transformControls.object) {
            this.transformControls.detach();
        }
        this.transformControls.visible = false;
        this.currentTransformObject = null;
        this.originalObjectData = null;
        this._clearAxisConstraint();
    }

    setMode(mode) {
        if (['translate', 'rotate', 'scale'].includes(mode)) {
            this.transformMode = mode;
            if (this.transformControls) {
                this.transformControls.setMode(mode);
            }
        }
    }

    getMode() {
        return this.transformMode;
    }

    // Merged keyboard shortcut handler (axis constraints + transform modes)
    handleKeyboardShortcut(key) {
        if (!this.transformControls) return;

        switch (key.toLowerCase()) {
            // Transform modes (active when object is selected)
            case 'g': // Grab/Move (translate)
                this.setMode('translate');
                break;
            case 'w': // also translate
                // Note: 'w' is used for display mode cycle globally; only handle here if transform active
                this.setMode('translate');
                break;
            case 'e': // Rotate
                this.setMode('rotate');
                break;
            case 's': // Scale
                this.setMode('scale');
                break;
            case 'q':
                // Toggle world/local space
                if (this.transformControls) {
                    const newSpace = this.transformControls.space === 'local' ? 'world' : 'local';
                    this.transformControls.setSpace(newSpace);
                }
                break;

            // Axis constraints (X/Y/Z key = lock to that axis; same key again = unlock)
            case 'x':
                this._toggleAxisConstraint('x');
                break;
            case 'y':
                this._toggleAxisConstraint('y');
                break;
            case 'z':
                this._toggleAxisConstraint('z');
                break;

            case '+':
            case '=':
                this.transformControls.setSize(this.transformControls.size * 1.1);
                break;
            case '-':
            case '_':
                this.transformControls.setSize(this.transformControls.size * 0.9);
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

    /**
     * Toggle axis constraint.
     * Pressing the same axis key again releases the constraint.
     */
    _toggleAxisConstraint(axis) {
        if (!this.currentTransformObject) return;

        if (this.axisConstraint === axis) {
            // Release constraint
            this._clearAxisConstraint();
        } else {
            // Set new constraint
            this.axisConstraint = axis;
            this.constraintBasePosition = this.currentTransformObject.position.clone();

            // Show only the constrained axis handle
            this.transformControls.showX = (axis === 'x');
            this.transformControls.showY = (axis === 'y');
            this.transformControls.showZ = (axis === 'z');

            // Update status bar
            if (this.stateManager.statusBarManager) {
                this.stateManager.statusBarManager.setHint(
                    `Axis lock: ${axis.toUpperCase()}  (press ${axis.toUpperCase()} again to unlock)`
                );
            }
        }
    }

    _clearAxisConstraint() {
        this.axisConstraint = null;
        this.constraintBasePosition = null;
        if (this.transformControls) {
            this.transformControls.showX = true;
            this.transformControls.showY = true;
            this.transformControls.showZ = true;
        }
        // Clear status bar axis hint if still showing one
        if (this.stateManager.statusBarManager) {
            this.stateManager.statusBarManager.setHint('');
        }
    }

    isTransformActive() {
        return this.isTransforming;
    }

    storeOriginalObjectData() {
        if (this.currentTransformObject) {
            this.originalObjectData = {
                position: this.currentTransformObject.position.clone(),
                rotation: this.currentTransformObject.rotation.clone(),
                scale: this.currentTransformObject.scale.clone()
            };
        }
    }

    restoreOriginalState() {
        if (this.currentTransformObject && this.originalObjectData) {
            this.currentTransformObject.position.copy(this.originalObjectData.position);
            this.currentTransformObject.rotation.copy(this.originalObjectData.rotation);
            this.currentTransformObject.scale.copy(this.originalObjectData.scale);
            this.updateObjectInStateManager();
        }
    }

    updateObjectInStateManager() {
        if (this.currentTransformObject && this.currentTransformObject.userData.sketchRectangle) {
            const sketchRectangle = this.currentTransformObject.userData.sketchRectangle;
            this.updateSketchRectangleFromTransform(sketchRectangle);

            if (this.stateManager.objectListManager) {
                this.stateManager.objectListManager.updateSketchObject(sketchRectangle);
            }
        }
    }

    updateSketchRectangleFromTransform(sketchRectangle) {
        if (!this.currentTransformObject) return;

        const position = this.currentTransformObject.position;
        const scale = this.currentTransformObject.scale;

        const width = Math.abs(sketchRectangle.endPoint.x - sketchRectangle.startPoint.x) * scale.x;
        const depth = Math.abs(sketchRectangle.endPoint.z - sketchRectangle.startPoint.z) * scale.z;

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

        if (sketchRectangle.isExtruded && sketchRectangle.extrudedMesh) {
            sketchRectangle.extrudeHeight *= scale.y;
        }

        if (sketchRectangle.showDimensions && this.stateManager.dimensionsEnabled) {
            sketchRectangle.updateDimensions();
        }
    }

    updateSketchRectangleDimensions() {
        if (this.currentTransformObject && this.currentTransformObject.userData.sketchRectangle) {
            const sketchRectangle = this.currentTransformObject.userData.sketchRectangle;

            if (sketchRectangle.showDimensions && this.stateManager.dimensionsEnabled) {
                sketchRectangle.updateDimensions();
            }
        }
    }

    setEnabled(enabled) {
        this.transformControls.enabled = enabled;
        if (!enabled) {
            this.detachFromObject();
        }
    }

    setVisible(visible) {
        this.transformControls.visible = visible && this.currentTransformObject !== null;
    }

    handleObjectSelection(object) {
        if (object && object.userData.sketchRectangle) {
            this.attachToObject(object);
            return true;
        } else {
            this.detachFromObject();
            return false;
        }
    }

    getTransformSummary() {
        if (!this.currentTransformObject) return null;

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

    dispose() {
        if (this.transformControls) {
            this.detachFromObject();
            this.sceneManager.removeFromScene(this.transformControls);
            this.transformControls.dispose();
            this.transformControls = null;
        }
    }
}
