import { SceneManager } from './managers/SceneManager.js';
import { StateManager } from './managers/StateManager.js';
import { InteractionManager } from './managers/InteractionManager.js';
import './styles.css';

class SketchPopApp {
    constructor() {
        this.sceneManager = new SceneManager();
        this.stateManager = new StateManager();
        this.interactionManager = null;
    }

    init() {
        const sceneObjects = this.sceneManager.init();
        this.stateManager.init();
        this.interactionManager = new InteractionManager(this.sceneManager, this.stateManager);
        
        // Initialize TransformManager after SceneManager is ready
        if (this.interactionManager.transformManager) {
            this.interactionManager.transformManager.initializeTransformControls();
        }
        
        // Expose interactionManager globally for sidebar updates
        window.interactionManager = this.interactionManager;
        
        this.sceneManager.animate();
        
        console.log('SketchPop application initialized with modular architecture');
    }
}

const app = new SketchPopApp();

app.init();