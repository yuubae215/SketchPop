import * as THREE from 'three';
import { ExtrusionManager } from './ExtrusionManager.js';
import { SketchRectangle } from './SketchRectangle.js';
import { SelectionManager } from './SelectionManager.js';
import { TransformManager } from './TransformManager.js';
import { StatusBarManager } from './StatusBarManager.js';

export class InteractionManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
        this.extrusionManager = new ExtrusionManager(sceneManager, stateManager);
        this.selectionManager = new SelectionManager(sceneManager, stateManager);
        this.transformManager = new TransformManager(sceneManager, stateManager);
        this.statusBarManager = new StatusBarManager();
        this.mouse = new THREE.Vector2();
        this.sketchExtrusionDimensions = [];

        // Set managers in state manager
        this.stateManager.setSelectionManager(this.selectionManager);
        this.stateManager.setTransformManager(this.transformManager);
        this.stateManager.setStatusBarManager(this.statusBarManager);

        this.setupEventListeners();
        this.setupControls();

        // Initialize status bar
        this.statusBarManager.updateMode('sketch');
    }

    setupEventListeners() {
        const canvas = this.sceneManager.renderer.domElement;
        
        canvas.addEventListener('click', this.onClick.bind(this), false);
        canvas.addEventListener('contextmenu', this.onRightClick.bind(this), false);
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        
        window.addEventListener('keydown', this.onKeyDown.bind(this));
    }

    setupControls() {
        // Sidebar controls
        document.getElementById('sidebar-sketch').addEventListener('click', () => {
            this.stateManager.setMode('sketch');
            this.updateSidebarIcons();
        });

        document.getElementById('sidebar-extrude').addEventListener('click', () => {
            this.stateManager.setMode('extrude');
            this.updateSidebarIcons();
        });

        document.getElementById('sidebar-select').addEventListener('click', () => {
            this.stateManager.setMode('select');
            this.updateSidebarIcons();
        });

        // Projection toggle controls
        document.getElementById('perspective-btn').addEventListener('click', () => {
            if (this.sceneManager.isPerspective) return;
            this.statusBarManager.updateCameraType('perspective');
        });

        document.getElementById('orthographic-btn').addEventListener('click', () => {
            if (!this.sceneManager.isPerspective) return;
            this.statusBarManager.updateCameraType('orthographic');
        });

        // Home button - Fit all objects
        document.getElementById('home-btn').addEventListener('click', () => {
            this.sceneManager.fitAllObjects();
        });

        document.getElementById('sidebar-clear').addEventListener('click', () => {
            this.stateManager.clearAll(this.sceneManager);
            this.stateManager.hideConfirmationControls();
            console.log('All shapes and states cleared from sidebar');
        });

        document.getElementById('sidebar-dimensions').addEventListener('click', () => {
            this.stateManager.toggleDimensions();
            this.updateSidebarIcons();
        });

        // Confirmation controls
        document.getElementById('confirmShape').addEventListener('click', () => {
            this.confirmExtrusion();
        });

        document.getElementById('cancelShape').addEventListener('click', () => {
            this.cancelExtrusion();
        });
        
        // Initialize sidebar icons
        this.updateSidebarIcons();
    }

    updateSidebarIcons() {
        const sketchIcon = document.getElementById('sidebar-sketch');
        const extrudeIcon = document.getElementById('sidebar-extrude');
        const selectIcon = document.getElementById('sidebar-select');
        const dimensionsIcon = document.getElementById('sidebar-dimensions');
        
        // Remove active class from all mode icons
        [sketchIcon, extrudeIcon, selectIcon].forEach(icon => {
            if (icon) icon.classList.remove('active');
        });
        
        // Add active class to current mode
        switch (this.stateManager.currentMode) {
            case 'sketch':
                if (sketchIcon) sketchIcon.classList.add('active');
                break;
            case 'extrude':
            case 'face-extrude':  // Both use same UI button
                if (extrudeIcon) extrudeIcon.classList.add('active');
                break;
            case 'select':
                if (selectIcon) selectIcon.classList.add('active');
                break;
        }
        
        // Update dimensions icon
        if (dimensionsIcon) {
            if (this.stateManager.dimensionsEnabled) {
                dimensionsIcon.classList.add('active');
            } else {
                dimensionsIcon.classList.remove('active');
            }
        }
    }

    onClick(event) {
        console.log('Click event received:', event);
        
        event.preventDefault();
        event.stopPropagation();
        
        // Don't handle clicks if transform controls are being used
        if (this.transformManager.isTransformActive()) {
            return;
        }
        
        const intersection = this.sceneManager.getMouseIntersection(event);
        console.log('Mouse intersection:', intersection);
        
        switch (this.stateManager.currentMode) {
            case 'sketch':
                this.handleSketchClick(intersection);
                break;
            case 'extrude':
            case 'face-extrude':
                this.handleExtrudeClick(intersection, event);
                break;
            case 'select':
                this.handleSelectClick(intersection, event);
                break;
        }
        
        // Clear selection when clicking empty space (not in sketching/extruding state, and not in select mode)
        if (!this.stateManager.isDrawing && !this.stateManager.isExtruding && !this.stateManager.isFaceExtruding && this.stateManager.currentMode !== 'select') {
            const intersectedSketch = this.stateManager.sketches.find(sketch => 
                !sketch.isExtruded && sketch.containsPoint(intersection)
            );
            if (!intersectedSketch && this.stateManager.objectListManager) {
                this.stateManager.objectListManager.selectObject(null);
            }
        }
    }

    handleSketchClick(intersection) {
        if (!this.stateManager.isDrawing) {
            this.stateManager.isDrawing = true;
            this.stateManager.currentSketch = new SketchRectangle(intersection, intersection);
            this.stateManager.currentSketch.setStateManager(this.stateManager);
            const mesh = this.stateManager.currentSketch.createMesh();
            this.sceneManager.addToScene(mesh);
            console.log('Started sketching at:', intersection);
        } else {
            this.stateManager.finishDrawing();
        }
    }

    handleExtrudeClick(intersection, event) {
        console.log('Click in extrude mode. hoveredFace:', this.stateManager.hoveredFace, 'pendingExtrusion:', this.stateManager.pendingExtrusion);
        
        // Check if there's already a pending extrusion (orange shape)
        const hasPendingExtrusion = this.stateManager.pendingExtrusion || 
                                   (this.stateManager.currentFaceExtrusion && this.stateManager.currentFaceExtrusion.isPending);
        
        if (hasPendingExtrusion) {
            console.log('Cannot start new extrusion - there is already a pending extrusion that needs to be confirmed or cancelled');
            return;
        }
        
        // Priority: Face extrusion over sketch extrusion
        if (this.stateManager.hoveredFace && !this.stateManager.isExtruding && !this.stateManager.isFaceExtruding) {
            this.stateManager.startFaceExtrusion(this.stateManager.hoveredFace, intersection);
            console.log('Started face extrusion on face with normal:', this.stateManager.hoveredFace.face.normal);
        } else if (this.stateManager.isFaceExtruding && this.stateManager.currentFaceExtrusion && !this.stateManager.currentFaceExtrusion.isPending) {
            this.stateManager.finishFaceExtrusion();
        } else {
            // Fall back to regular sketch extrusion
            this.handleRegularExtrudeClick(intersection);
        }
    }

    handleRegularExtrudeClick(intersection) {
        // Check if there's already a pending extrusion (orange shape)
        const hasPendingExtrusion = this.stateManager.pendingExtrusion || 
                                   (this.stateManager.currentFaceExtrusion && this.stateManager.currentFaceExtrusion.isPending);
        
        if (this.stateManager.isExtruding && this.stateManager.selectedSketch) {
            this.stateManager.finishExtrusion();
        } else if (!hasPendingExtrusion) {
            for (let sketch of this.stateManager.sketches) {
                if (!sketch.isExtruded && sketch.containsPoint(intersection)) {
                    this.stateManager.startExtrusion(sketch, intersection);
                    console.log('Started extruding sketch:', sketch);
                    break;
                }
            }
        } else {
            console.log('Cannot start new extrusion - there is already a pending extrusion that needs to be confirmed or cancelled');
        }
    }

    onMouseMove(event) {
        const intersection = this.sceneManager.getMouseIntersection(event);

        // Update cursor coordinates in status bar
        if (intersection) {
            this.statusBarManager.updateCursorPosition(intersection.x, intersection.y, intersection.z);
        }

        if (this.stateManager.isDrawing && this.stateManager.currentSketch) {
            event.preventDefault();
            const mesh = this.stateManager.currentSketch.update(intersection);
            if (mesh) {
                this.sceneManager.addToScene(mesh);
            }
            console.log('Updating sketch to:', intersection);
        } else if (this.stateManager.isExtruding && this.stateManager.selectedSketch && this.stateManager.extrudeStartPos) {
            event.preventDefault();
            const distance = intersection.distanceTo(this.stateManager.extrudeStartPos);
            const height = Math.max(0, distance * 0.5);
            const mesh = this.stateManager.selectedSketch.extrude(height);
            if (mesh) {
                this.sceneManager.addToScene(mesh);
            }
            
            // Update dimension display for 2D sketch extrusion
            if (this.stateManager.dimensionsEnabled && height > 0.1) {
                this.updateSketchExtrusionDimensions(this.stateManager.selectedSketch, height);
            }
        } else if (this.stateManager.isFaceExtruding && this.stateManager.currentFaceExtrusion && this.stateManager.faceExtrudeStartPos && !this.stateManager.currentFaceExtrusion.isPending) {
            event.preventDefault();
            this.extrusionManager.updateFaceExtrusion(event);
        } else if ((this.stateManager.currentMode === 'extrude' || this.stateManager.currentMode === 'face-extrude') && !this.stateManager.isExtruding && !this.stateManager.pendingExtrusion && !this.stateManager.isFaceExtruding) {
            this.stateManager.updateHoverHighlight(intersection);
        }
        
        // Update face highlight in extrude mode (for both sketch and face extrusion)
        if (!this.stateManager.isDrawing && !this.stateManager.isExtruding && (this.stateManager.currentMode === 'extrude' || this.stateManager.currentMode === 'face-extrude')) {
            this.extrusionManager.updateFaceHighlight(event);
        }
        
        // Handle object hover highlighting in object selection mode
        if (this.stateManager.selectionMode === 'object') {
            this.updateObjectHoverHighlight(event);
        }
    }

    onRightClick(event) {
        event.preventDefault();
        if (this.stateManager.pendingExtrusion || (this.stateManager.currentFaceExtrusion && this.stateManager.currentFaceExtrusion.isPending)) {
            this.confirmExtrusion();
        }
    }

    onKeyDown(event) {
        // Mode switching shortcuts
        switch (event.key.toLowerCase()) {
            case 's':
                if (!event.ctrlKey) {
                    this.stateManager.setMode('sketch');
                    this.updateSidebarIcons();
                }
                break;
            case 'e':
                this.stateManager.setMode('extrude');
                this.updateSidebarIcons();
                break;
            case 'v':
                this.stateManager.setMode('select');
                this.updateSidebarIcons();
                break;
            case 'f':
                // Fit all objects to view
                this.sceneManager.fitAllObjects();
                break;
            case 'escape':
                if (this.stateManager.pendingExtrusion || this.stateManager.currentFaceExtrusion) {
                    this.cancelExtrusion();
                } else {
                    // Detach transform controls on escape
                    this.transformManager.detachFromObject();
                }
                break;
            case 'delete':
                this.handleDeleteSelected();
                break;
        }

        // Handle transform controls keyboard shortcuts if transform controls are active
        if (this.transformManager.isTransformActive()) {
            this.transformManager.handleKeyboardShortcut(event.key);
        }
    }

    confirmExtrusion() {
        if (this.stateManager.pendingExtrusion) {
            this.stateManager.pendingExtrusion.confirmExtrusion();
            this.stateManager.pendingExtrusion = null;
            this.stateManager.selectedSketch = null;
            this.stateManager.isExtruding = false;
            this.stateManager.extrudeStartPos = null;
            this.stateManager.hideConfirmationControls();
            console.log('Shape confirmed via right-click');
        } else if (this.stateManager.currentFaceExtrusion && this.stateManager.currentFaceExtrusion.isPending) {
            this.extrusionManager.confirmFaceExtrusion();
        }
        
        // Clear sketch extrusion dimensions
        this.clearSketchExtrusionDimensions();
    }

    cancelExtrusion() {
        if (this.stateManager.pendingExtrusion) {
            this.stateManager.pendingExtrusion.cancelExtrusion();
            this.stateManager.pendingExtrusion = null;
            this.stateManager.selectedSketch = null;
            this.stateManager.isExtruding = false;
            this.stateManager.extrudeStartPos = null;
            this.stateManager.hideConfirmationControls();
            console.log('Shape cancelled via ESC');
        } else if (this.stateManager.currentFaceExtrusion) {
            this.extrusionManager.cancelFaceExtrusion();
        }
        
        // Clear sketch extrusion dimensions
        this.clearSketchExtrusionDimensions();
    }

    updateSketchExtrusionDimensions(sketch, height) {
        this.clearSketchExtrusionDimensions();
        
        if (!sketch || height <= 0.1) return;
        
        const bounds = sketch.getBounds();
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerZ = (bounds.minZ + bounds.maxZ) / 2;
        const offset = 1.0;
        
        // Create vertical dimension line showing height
        const startPoint = new THREE.Vector3(bounds.maxX + offset, 0, centerZ);
        const endPoint = new THREE.Vector3(bounds.maxX + offset, height, centerZ);
        
        const points = [startPoint, endPoint];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0xff9500,
            linewidth: 2
        });
        
        const dimensionLine = new THREE.Line(geometry, material);
        this.sketchExtrusionDimensions.push(dimensionLine);
        this.sceneManager.addToScene(dimensionLine);
        
        // Create tick marks
        const tickLength = 0.2;
        
        // Bottom tick
        const bottomTick1 = new THREE.Vector3(bounds.maxX + offset - tickLength, 0, centerZ);
        const bottomTick2 = new THREE.Vector3(bounds.maxX + offset + tickLength, 0, centerZ);
        const bottomTickGeometry = new THREE.BufferGeometry().setFromPoints([bottomTick1, bottomTick2]);
        const bottomTick = new THREE.Line(bottomTickGeometry, material);
        this.sketchExtrusionDimensions.push(bottomTick);
        this.sceneManager.addToScene(bottomTick);
        
        // Top tick
        const topTick1 = new THREE.Vector3(bounds.maxX + offset - tickLength, height, centerZ);
        const topTick2 = new THREE.Vector3(bounds.maxX + offset + tickLength, height, centerZ);
        const topTickGeometry = new THREE.BufferGeometry().setFromPoints([topTick1, topTick2]);
        const topTick = new THREE.Line(topTickGeometry, material);
        this.sketchExtrusionDimensions.push(topTick);
        this.sceneManager.addToScene(topTick);
        
        // Create dimension text
        const textPosition = new THREE.Vector3(bounds.maxX + offset + 0.4, height / 2, centerZ);
        this.createSketchExtrusionDimensionText(height.toFixed(2), textPosition);
    }
    
    createSketchExtrusionDimensionText(text, position) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Orange background for pending extrusion
        context.fillStyle = '#ff9500';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.strokeStyle = '#ffffff';
        context.lineWidth = 3;
        context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        
        context.fillStyle = '#ffffff';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            depthTest: false,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(material);
        
        sprite.position.copy(position);
        sprite.position.y += 0.15;
        sprite.scale.set(1.2, 0.3, 1);
        sprite.renderOrder = 1000;
        
        this.sketchExtrusionDimensions.push(sprite);
        this.sceneManager.addToScene(sprite);
    }
    
    clearSketchExtrusionDimensions() {
        this.sketchExtrusionDimensions.forEach(item => {
            this.sceneManager.removeFromScene(item);
        });
        this.sketchExtrusionDimensions = [];
    }

    // Handle object selection in select mode
    handleSelectClick(intersection, event) {
        console.log('handleSelectClick called with intersection:', intersection);
        
        // Update mouse position for raycasting
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        console.log('Mouse position updated to:', this.mouse);
        
        if (intersection) {
            // Filter out Sprite objects to avoid raycasting errors
            const meshObjects = this.sceneManager.scene.children.filter(child => 
                child.type === 'Mesh' || (child.type === 'Group' && child.children.some(subchild => subchild.type === 'Mesh'))
            );
            
            console.log('Filtered mesh objects:', meshObjects.length);
            
            // Update raycaster with current mouse position
            this.sceneManager.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
            const intersects = this.sceneManager.raycaster.intersectObjects(meshObjects, true);
            console.log('Raycast intersects:', intersects.length, intersects);
            
            for (const intersect of intersects) {
                console.log('Checking intersect object:', intersect.object.type);
                console.log('Object userData keys:', Object.keys(intersect.object.userData));
                console.log('Object userData:', intersect.object.userData);
                console.log('Has sketchRectangle?', !!intersect.object.userData.sketchRectangle);
                
                if (intersect.object.userData.sketchRectangle) {
                    console.log('Found object with sketchRectangle:', intersect.object.userData.sketchRectangle);
                    
                    // Handle selection based on current selection mode
                    if (this.stateManager.selectionMode === 'object') {
                        this.selectionManager.selectObject(intersect.object);
                        this.stateManager.selectObject(intersect.object);
                        
                        // Attach TransformControls to selected object
                        this.transformManager.attachToObject(intersect.object);
                        
                        console.log('Object selected and transform controls attached:', intersect.object.userData.objectId);
                        return; // Important: Return to prevent further processing
                    } else if (this.stateManager.selectionMode === 'face') {
                        // For face selection, we need to determine which face was clicked
                        const faceInfo = this.getFaceFromIntersection(intersect);
                        if (faceInfo) {
                            this.stateManager.selectFace(faceInfo.face, intersect.object, intersect.point);
                            console.log('Face selected:', faceInfo.face, 'on object:', intersect.object.userData.objectId);
                        }
                    }
                    return; // Object was found and handled
                }
            }
        }
        
        console.log('No object found, clearing selections');
        // Clear selection and detach transform controls if clicking empty space
        this.selectionManager.deselectAll();
        this.stateManager.clearSelections();
        // Note: TransformControls detach is handled by ObjectListManager.clearSelection() via StateManager.clearSelections()
    }


    // Handle deletion of selected objects
    handleDeleteSelected() {
        if (this.stateManager.selectedObject) {
            const sketch = this.stateManager.selectedObject.userData.sketchRectangle;
            if (sketch) {
                // Remove from scene
                if (sketch.mesh) {
                    this.sceneManager.removeFromScene(sketch.mesh);
                }
                if (sketch.extrudedMesh) {
                    this.sceneManager.removeFromScene(sketch.extrudedMesh);
                }
                
                // Remove dimensions
                sketch.clearDimensions();
                
                // Remove from state manager
                this.stateManager.removeSketch(sketch);
                
                // Detach transform controls if attached
                if (this.transformManager.currentTransformObject === this.stateManager.selectedObject) {
                    this.transformManager.detachFromObject();
                }
                
                // Clear selection
                this.selectionManager.deselectAll();
                
                console.log('Selected object deleted');
            }
        }
    }

    // Helper method to determine which face was clicked on a mesh
    getFaceFromIntersection(intersect) {
        if (!intersect.face || !intersect.object.geometry) {
            return null;
        }

        // Get the face normal in world space
        const face = intersect.face;
        const worldNormal = face.normal.clone();
        worldNormal.transformDirection(intersect.object.matrixWorld);
        worldNormal.normalize();

        // Determine face type based on normal direction
        let faceType = 'unknown';
        const tolerance = 0.1;

        if (Math.abs(worldNormal.y - 1) < tolerance) {
            faceType = 'top';
        } else if (Math.abs(worldNormal.y + 1) < tolerance) {
            faceType = 'bottom';
        } else if (Math.abs(worldNormal.x - 1) < tolerance) {
            faceType = 'right';
        } else if (Math.abs(worldNormal.x + 1) < tolerance) {
            faceType = 'left';
        } else if (Math.abs(worldNormal.z - 1) < tolerance) {
            faceType = 'front';
        } else if (Math.abs(worldNormal.z + 1) < tolerance) {
            faceType = 'back';
        }

        return {
            face: {
                index: intersect.faceIndex,
                normal: worldNormal,
                type: faceType
            },
            intersection: intersect.point
        };
    }

    updateObjectHoverHighlight(event) {
        const intersection = this.sceneManager.getMouseIntersection(event);
        
        if (intersection) {
            // Filter out Sprite objects to avoid raycasting errors
            const meshObjects = this.sceneManager.scene.children.filter(child => 
                child.type === 'Mesh' || (child.type === 'Group' && child.children.some(subchild => subchild.type === 'Mesh'))
            );
            
            const intersects = this.sceneManager.raycaster.intersectObjects(meshObjects, true);
            
            for (const intersect of intersects) {
                if (intersect.object.userData.sketchRectangle) {
                    // Set hover highlight for this object
                    this.selectionManager.setHoveredObject(intersect.object);
                    return;
                }
            }
        }
        
        // No object found, clear hover highlight
        this.selectionManager.setHoveredObject(null);
    }
}