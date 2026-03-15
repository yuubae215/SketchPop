import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SceneHandler, RenderHandler, InteractionHandler } from './handlers/threeHandlers.js';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.perspectiveCamera = null;
        this.orthographicCamera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.sketchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.isPerspective = true;

        // Initialize handlers
        this.sceneHandler = new SceneHandler();
        this.renderHandler = new RenderHandler();
        this.interactionHandler = null;
    }

    init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createControls();
        this.createLights();
        this.createGroundPlane();
        this.setupEventListeners();

        return {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer,
            controls: this.controls,
            raycaster: this.raycaster,
            sketchPlane: this.sketchPlane
        };
    }

    createScene() {
        this.scene = this.sceneHandler.initializeScene();

        // Create gradient background using shader
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            varying vec2 vUv;
            uniform vec3 colorTop;
            uniform vec3 colorBottom;
            void main() {
                gl_FragColor = vec4(mix(colorBottom, colorTop, vUv.y), 1.0);
            }
        `;

        const uniforms = {
            colorTop: { value: new THREE.Color(0x2a2a35) },    // Dark blue-gray
            colorBottom: { value: new THREE.Color(0x1a1a1e) }  // Very dark gray
        };

        const gradientGeometry = new THREE.PlaneGeometry(2, 2);
        const gradientMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            depthWrite: false,
            depthTest: false
        });

        const gradientMesh = new THREE.Mesh(gradientGeometry, gradientMaterial);
        gradientMesh.name = 'background-gradient';

        // Create a separate scene for the background
        this.backgroundScene = new THREE.Scene();
        this.backgroundCamera = new THREE.Camera();
        this.backgroundScene.add(gradientMesh);
    }

    createCamera() {
        const container = document.getElementById('canvas-container');
        const aspect = container.clientWidth / container.clientHeight;
        
        // Create perspective camera
        this.perspectiveCamera = this.renderHandler.createPerspectiveCamera(75, aspect, 0.1, 1000);
        this.perspectiveCamera.position.set(5, 5, 5);
        this.perspectiveCamera.lookAt(0, 0, 0);
        
        // Create orthographic camera
        const frustumSize = 10;
        this.orthographicCamera = this.renderHandler.createOrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        this.orthographicCamera.position.set(5, 5, 5);
        this.orthographicCamera.lookAt(0, 0, 0);
        
        // Set default camera to perspective
        this.camera = this.perspectiveCamera;
    }

    createRenderer() {
        const container = document.getElementById('canvas-container');
        const canvas = document.createElement('canvas');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        container.appendChild(canvas);
        
        this.renderer = this.renderHandler.createRenderer(canvas);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    createControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        
        this.controls.mouseButtons = {
            LEFT: null,
            MIDDLE: THREE.MOUSE.ROTATE,
            RIGHT: null
        };
        
        this.controls.touches = {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
        };
    }

    createLights() {
        const { ambientLight, directionalLight } = this.sceneHandler.setupLighting();
        directionalLight.castShadow = true;
    }

    createGroundPlane() {
        const { gridHelper, axesHelper } = this.sceneHandler.setupHelpers();
        
        const groundPlane = this.sceneHandler.setupGroundPlane();
        groundPlane.material.color.setHex(0x00ff00);
        groundPlane.material.opacity = 0.1;
        groundPlane.material.side = THREE.DoubleSide;
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Projection toggle button listeners
        const perspectiveBtn = document.getElementById('perspective-btn');
        const orthographicBtn = document.getElementById('orthographic-btn');
        
        perspectiveBtn.addEventListener('click', () => {
            if (!this.isPerspective) {
                this.toggleProjection();
            }
        });
        
        orthographicBtn.addEventListener('click', () => {
            if (this.isPerspective) {
                this.toggleProjection();
            }
        });
    }

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        const aspect = container.clientWidth / container.clientHeight;
        
        // Update perspective camera
        this.perspectiveCamera.aspect = aspect;
        this.perspectiveCamera.updateProjectionMatrix();
        
        // Update orthographic camera
        const frustumSize = 10;
        this.orthographicCamera.left = frustumSize * aspect / -2;
        this.orthographicCamera.right = frustumSize * aspect / 2;
        this.orthographicCamera.top = frustumSize / 2;
        this.orthographicCamera.bottom = frustumSize / -2;
        this.orthographicCamera.updateProjectionMatrix();
        
        this.renderHandler.updateRendererSize(container.clientWidth, container.clientHeight);
    }

    toggleProjection() {
        // Store current camera position and target
        const position = this.camera.position.clone();
        const target = this.controls.target.clone();

        // Switch camera
        this.isPerspective = !this.isPerspective;
        this.camera = this.isPerspective ? this.perspectiveCamera : this.orthographicCamera;

        // Apply stored position and target to new camera
        this.camera.position.copy(position);
        this.camera.lookAt(target);

        // Update controls to use new camera
        this.controls.object = this.camera;
        this.controls.target.copy(target);
        this.controls.update();

        // Update UI buttons
        this.updateProjectionButtons();

        console.log(`Switched to ${this.isPerspective ? 'Perspective' : 'Orthographic'} projection`);
    }

    updateProjectionButtons() {
        const perspectiveBtn = document.getElementById('perspective-btn');
        const orthographicBtn = document.getElementById('orthographic-btn');
        
        if (this.isPerspective) {
            perspectiveBtn.classList.add('active');
            orthographicBtn.classList.remove('active');
        } else {
            perspectiveBtn.classList.remove('active');
            orthographicBtn.classList.add('active');
        }
    }

    getMouseIntersection(event) {
        if (!this.interactionHandler) {
            this.interactionHandler = new InteractionHandler(this.sceneHandler, this.camera);
            // Apply pending construction plane set before first use
            if (this._pendingConstructionPlane) {
                this.interactionHandler.intersectionPlane.copy(this._pendingConstructionPlane);
                this._pendingConstructionPlane = null;
            }
        }

        this.interactionHandler.updateMousePosition(event, this.renderer.domElement);
        return this.interactionHandler.getIntersectionPoint(this.camera);
    }

    /**
     * When the user is actively drawing or extruding, disable ONE-finger orbit
     * so that touch events reach the canvas for drawing.  Re-enable when idle.
     */
    setTouchDrawingMode(enabled) {
        if (enabled) {
            this.controls.touches.ONE = null;   // Disable orbit; app handles the touch
        } else {
            this.controls.touches.ONE = THREE.TOUCH.ROTATE;
        }
    }

    addToScene(object) {
        this.sceneHandler.addToScene(object);
    }

    removeFromScene(object) {
        this.sceneHandler.removeFromScene(object);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();

        // Render background gradient first
        if (this.backgroundScene && this.backgroundCamera) {
            this.renderer.autoClear = false;
            this.renderer.clear();
            this.renderer.render(this.backgroundScene, this.backgroundCamera);
        }

        // Render main scene
        this.renderHandler.render(this.scene, this.camera);
    }

    // Manual render method for external components
    render() {
        if (this.renderHandler && this.scene && this.camera) {
            // Render background gradient first
            if (this.backgroundScene && this.backgroundCamera) {
                this.renderer.autoClear = false;
                this.renderer.clear();
                this.renderer.render(this.backgroundScene, this.backgroundCamera);
            }

            this.renderHandler.render(this.scene, this.camera);
        }
    }

    /**
     * Fit all objects in the scene to the camera view
     */
    fitAllObjects() {
        const box = new THREE.Box3();

        // Calculate bounding box for all mesh objects in the scene
        let objectCount = 0;
        this.scene.traverse((object) => {
            if (object.isMesh && object.visible && object.name !== 'ground') {
                box.expandByObject(object);
                objectCount++;
            }
        });

        // If no objects, reset to default view
        if (objectCount === 0) {
            this.camera.position.set(5, 5, 5);
            this.camera.lookAt(0, 0, 0);
            this.controls.target.set(0, 0, 0);
            this.controls.update();
            return;
        }

        // Calculate center and size of bounding box
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Get the max dimension
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.isPerspective ? this.perspectiveCamera.fov : 45;
        const fovRad = (fov * Math.PI) / 180;

        // Calculate distance to fit all objects
        let cameraDistance = Math.abs(maxDim / Math.sin(fovRad / 2)) * 0.6;

        // For orthographic camera
        if (!this.isPerspective) {
            const aspect = this.orthographicCamera.right / this.orthographicCamera.top;
            cameraDistance = maxDim * 1.5;
        }

        // Set camera position (maintain relative angle)
        const direction = new THREE.Vector3();
        direction.subVectors(this.camera.position, this.controls.target).normalize();

        this.camera.position.copy(center).add(direction.multiplyScalar(cameraDistance));
        this.controls.target.copy(center);
        this.controls.update();

        console.log(`Fitted ${objectCount} objects to view`);
    }

    /**
     * Jump to a named standard camera view.
     * Supported names: 'front' (key 1), 'right' (key 3), 'top' (key 7)
     */
    setCameraView(viewName) {
        const target = this.controls.target.clone();
        const dist = this.camera.position.distanceTo(target) || 10;

        const positions = {
            front: new THREE.Vector3(0, 0, dist),
            right:  new THREE.Vector3(dist, 0, 0),
            top:    new THREE.Vector3(0, dist, 0),
        };

        const pos = positions[viewName];
        if (!pos) return;

        // Offset from the current orbit target so the scene stays centered
        this.camera.position.copy(target).add(pos);
        this.camera.lookAt(target);
        this.controls.target.copy(target);
        this.controls.update();

        console.log(`Camera set to ${viewName} view`);
    }
}