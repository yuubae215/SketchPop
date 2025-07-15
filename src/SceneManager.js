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
        this.scene.background = new THREE.Color(0x1e1e1e);
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
            ONE: null,
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
        }
        
        this.interactionHandler.updateMousePosition(event, this.renderer.domElement);
        return this.interactionHandler.getIntersectionPoint(this.camera);
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
        this.renderHandler.render(this.scene, this.camera);
    }

    // Manual render method for external components
    render() {
        if (this.renderHandler && this.scene && this.camera) {
            this.renderHandler.render(this.scene, this.camera);
        }
    }
}