import * as THREE from 'three';

class TransformHandler {
    constructor(sceneHandler, camera, renderer) {
        this.sceneHandler = sceneHandler;
        this.camera = camera;
        this.renderer = renderer;
        this.transformControls = null;
        this.currentObject = null;
        this.eventListeners = new Map();
    }

    initializeTransformControls() {
        if (!this.transformControls) {
            const { TransformControls } = await import('three/examples/jsm/controls/TransformControls.js');
            this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
            this.sceneHandler.addToScene(this.transformControls);
            
            this.transformControls.addEventListener('dragging-changed', (event) => {
                if (this.eventListeners.has('dragging-changed')) {
                    this.eventListeners.get('dragging-changed')(event);
                }
            });
            
            this.transformControls.addEventListener('change', (event) => {
                if (this.eventListeners.has('change')) {
                    this.eventListeners.get('change')(event);
                }
            });
        }
        
        return this.transformControls;
    }

    attachToObject(object) {
        if (this.transformControls && object) {
            this.currentObject = object;
            this.transformControls.attach(object);
            this.transformControls.visible = true;
        }
    }

    detachFromObject() {
        if (this.transformControls) {
            this.transformControls.detach();
            this.transformControls.visible = false;
            this.currentObject = null;
        }
    }

    setTransformMode(mode) {
        if (this.transformControls) {
            this.transformControls.setMode(mode);
        }
    }

    setTransformSpace(space) {
        if (this.transformControls) {
            this.transformControls.setSpace(space);
        }
    }

    setTransformSize(size) {
        if (this.transformControls) {
            this.transformControls.setSize(size);
        }
    }

    toggleTransformControls(visible) {
        if (this.transformControls) {
            this.transformControls.visible = visible;
        }
    }

    transformObject(object, transformation) {
        if (!object) return;

        if (transformation.position) {
            object.position.set(
                transformation.position.x ?? object.position.x,
                transformation.position.y ?? object.position.y,
                transformation.position.z ?? object.position.z
            );
        }

        if (transformation.rotation) {
            object.rotation.set(
                transformation.rotation.x ?? object.rotation.x,
                transformation.rotation.y ?? object.rotation.y,
                transformation.rotation.z ?? object.rotation.z
            );
        }

        if (transformation.scale) {
            object.scale.set(
                transformation.scale.x ?? object.scale.x,
                transformation.scale.y ?? object.scale.y,
                transformation.scale.z ?? object.scale.z
            );
        }
    }

    getObjectTransform(object) {
        if (!object) return null;

        return {
            position: {
                x: object.position.x,
                y: object.position.y,
                z: object.position.z
            },
            rotation: {
                x: object.rotation.x,
                y: object.rotation.y,
                z: object.rotation.z
            },
            scale: {
                x: object.scale.x,
                y: object.scale.y,
                z: object.scale.z
            }
        };
    }

    resetObjectTransform(object) {
        if (object) {
            object.position.set(0, 0, 0);
            object.rotation.set(0, 0, 0);
            object.scale.set(1, 1, 1);
        }
    }

    cloneObjectTransform(sourceObject, targetObject) {
        if (sourceObject && targetObject) {
            targetObject.position.copy(sourceObject.position);
            targetObject.rotation.copy(sourceObject.rotation);
            targetObject.scale.copy(sourceObject.scale);
        }
    }

    addEventListener(event, callback) {
        this.eventListeners.set(event, callback);
    }

    removeEventListener(event) {
        this.eventListeners.delete(event);
    }

    dispose() {
        if (this.transformControls) {
            this.transformControls.dispose();
            this.sceneHandler.removeFromScene(this.transformControls);
            this.transformControls = null;
        }
        
        this.eventListeners.clear();
        this.currentObject = null;
    }
}

export { TransformHandler };