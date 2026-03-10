import * as THREE from 'three';
import { ExtrusionManager } from './ExtrusionManager.js';
import { SketchRectangle } from './SketchRectangle.js';
import { SelectionManager } from './SelectionManager.js';
import { TransformManager } from './TransformManager.js';
import { StatusBarManager } from './StatusBarManager.js';
import { CommandManager } from './CommandManager.js';

export class InteractionManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
        this.extrusionManager = new ExtrusionManager(sceneManager, stateManager);
        this.selectionManager = new SelectionManager(sceneManager, stateManager);
        this.transformManager = new TransformManager(sceneManager, stateManager);
        this.statusBarManager = new StatusBarManager();
        this.commandManager = new CommandManager();
        this.mouse = new THREE.Vector2();
        this.sketchExtrusionDimensions = [];
        this._numericInput = '';       // buffer for numeric extrusion input
        this._numericOverlay = null;   // DOM element (created lazily)

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

        // Mouse events
        canvas.addEventListener('click', this.onClick.bind(this), false);
        canvas.addEventListener('contextmenu', this.onRightClick.bind(this), false);
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this), false);

        // Touch events
        canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

        window.addEventListener('keydown', this.onKeyDown.bind(this));
    }

    setupControls() {
        // Mode buttons
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

        document.getElementById('sidebar-clear').addEventListener('click', () => {
            this.stateManager.clearAll(this.sceneManager);
        });

        // Projection toggle
        document.getElementById('perspective-btn').addEventListener('click', () => {
            if (this.sceneManager.isPerspective) return;
            this.statusBarManager.updateCameraType('perspective');
        });

        document.getElementById('orthographic-btn').addEventListener('click', () => {
            if (!this.sceneManager.isPerspective) return;
            this.statusBarManager.updateCameraType('orthographic');
        });

        // Home button
        document.getElementById('home-btn').addEventListener('click', () => {
            this.sceneManager.fitAllObjects();
        });

        // Initialize icons
        this.updateSidebarIcons();
    }

    updateSidebarIcons() {
        const sketchIcon = document.getElementById('sidebar-sketch');
        const extrudeIcon = document.getElementById('sidebar-extrude');
        const selectIcon = document.getElementById('sidebar-select');

        [sketchIcon, extrudeIcon, selectIcon].forEach(icon => {
            if (icon) icon.classList.remove('active');
        });

        switch (this.stateManager.currentMode) {
            case 'sketch':
                if (sketchIcon) sketchIcon.classList.add('active');
                break;
            case 'extrude':
            case 'face-extrude':
                if (extrudeIcon) extrudeIcon.classList.add('active');
                break;
            case 'select':
                if (selectIcon) selectIcon.classList.add('active');
                break;
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
        } else {
            const completedSketch = this.stateManager.currentSketch;
            const success = this.stateManager.finishDrawing();
            if (success && completedSketch) {
                // Record undo command for sketch creation
                this.commandManager.push(
                    CommandManager.createAddSketch(completedSketch, this.sceneManager, this.stateManager)
                );
                // Auto-transition: switch to extrude mode and start extruding immediately
                this.stateManager.setMode('extrude');
                this.updateSidebarIcons();
                this.stateManager.startExtrusion(completedSketch, intersection);
            }
        }
    }

    handleExtrudeClick(intersection, event) {
        // Priority: Face extrusion over sketch extrusion
        if (this.stateManager.hoveredFace && !this.stateManager.isExtruding && !this.stateManager.isFaceExtruding) {
            this.stateManager.startFaceExtrusion(this.stateManager.hoveredFace, intersection);
        } else if (this.stateManager.isFaceExtruding && this.stateManager.currentFaceExtrusion) {
            // Direct confirm face extrusion on click
            if (Math.abs(this.stateManager.currentFaceExtrusion.extrudeDistance) > 0.1) {
                this.extrusionManager.confirmFaceExtrusion();
            } else {
                this.extrusionManager.cancelFaceExtrusion();
            }
            this.clearSketchExtrusionDimensions();
            this._clearNumericInput();
        } else {
            this.handleRegularExtrudeClick(intersection);
        }
    }

    handleRegularExtrudeClick(intersection) {
        if (this.stateManager.isExtruding && this.stateManager.selectedSketch) {
            const sketchForUndo = this.stateManager.selectedSketch;
            // Direct confirm on click
            this.stateManager.finishExtrusion();
            this.clearSketchExtrusionDimensions();
            this._clearNumericInput();
            // Record undo command only if the extrusion actually went through
            if (sketchForUndo.isExtruded) {
                this.commandManager.push(
                    CommandManager.createExtrude(sketchForUndo, this.sceneManager, this.stateManager)
                );
            }
        } else {
            for (let sketch of this.stateManager.sketches) {
                if (!sketch.isExtruded && sketch.containsPoint(intersection)) {
                    this.stateManager.startExtrusion(sketch, intersection);
                    break;
                }
            }
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
        // Right-click also confirms active extrusion
        if (this.stateManager.isExtruding && this.stateManager.selectedSketch) {
            const sketchForUndo = this.stateManager.selectedSketch;
            this.stateManager.finishExtrusion();
            this.clearSketchExtrusionDimensions();
            this._clearNumericInput();
            if (sketchForUndo.isExtruded) {
                this.commandManager.push(
                    CommandManager.createExtrude(sketchForUndo, this.sceneManager, this.stateManager)
                );
            }
        } else if (this.stateManager.isFaceExtruding && this.stateManager.currentFaceExtrusion) {
            if (Math.abs(this.stateManager.currentFaceExtrusion.extrudeDistance) > 0.1) {
                this.extrusionManager.confirmFaceExtrusion();
            } else {
                this.extrusionManager.cancelFaceExtrusion();
            }
            this.clearSketchExtrusionDimensions();
            this._clearNumericInput();
        }
    }

    // ── Touch helpers ─────────────────────────────────────────────────────

    /**
     * Convert a Touch object to a synthetic mouse-like event usable by
     * existing mouse handlers (getMouseIntersection, raycaster, etc.).
     */
    _touchToFakeEvent(touch) {
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: touch.target,
        };
    }

    onTouchStart(event) {
        // Two-finger gestures are handled by OrbitControls — don't interfere.
        if (event.touches.length !== 1) return;

        const mode = this.stateManager.currentMode;
        const isActivelyWorking = this.stateManager.isDrawing
            || this.stateManager.isExtruding
            || this.stateManager.isFaceExtruding;

        // In sketch/extrude mode (or actively working), capture the touch for drawing.
        // In select mode, let OrbitControls handle orbiting.
        if (mode === 'sketch' || mode === 'extrude' || mode === 'face-extrude' || isActivelyWorking) {
            event.preventDefault();
            this.sceneManager.setTouchDrawingMode(true);
        } else {
            // Select mode: restore orbit, let OrbitControls take over
            this.sceneManager.setTouchDrawingMode(false);
        }

        const fakeEvent = this._touchToFakeEvent(event.touches[0]);
        const intersection = this.sceneManager.getMouseIntersection(fakeEvent);

        this._touchStartPos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        this._touchStartIntersection = intersection;
        this._touchMoved = false;
    }

    onTouchMove(event) {
        if (event.touches.length !== 1) return;

        const touch = event.touches[0];
        const dx = touch.clientX - (this._touchStartPos?.x ?? touch.clientX);
        const dy = touch.clientY - (this._touchStartPos?.y ?? touch.clientY);

        // Mark as moved if the finger drifted more than 8px
        if (Math.sqrt(dx * dx + dy * dy) > 8) {
            this._touchMoved = true;
        }

        // In sketch mode while drawing, update the sketch preview.
        if (!this._touchMoved && this.stateManager.isDrawing && this.stateManager.currentSketch) {
            event.preventDefault();
            const fakeEvent = this._touchToFakeEvent(touch);
            const intersection = this.sceneManager.getMouseIntersection(fakeEvent);
            if (intersection) {
                const mesh = this.stateManager.currentSketch.update(intersection);
                if (mesh) this.sceneManager.addToScene(mesh);
            }
            return;
        }

        // Extrusion drag: update extrusion height while finger moves vertically.
        if (this.stateManager.isExtruding && this.stateManager.selectedSketch && this.stateManager.extrudeStartPos) {
            event.preventDefault();
            const fakeEvent = this._touchToFakeEvent(touch);
            const intersection = this.sceneManager.getMouseIntersection(fakeEvent);
            if (intersection) {
                const distance = intersection.distanceTo(this.stateManager.extrudeStartPos);
                const height = Math.max(0, distance * 0.5);
                const mesh = this.stateManager.selectedSketch.extrude(height);
                if (mesh) this.sceneManager.addToScene(mesh);

                if (this.stateManager.dimensionsEnabled && height > 0.1) {
                    this.updateSketchExtrusionDimensions(this.stateManager.selectedSketch, height);
                }
            }
        }
    }

    onTouchEnd(event) {
        // Ignore multi-touch lifts
        if (event.changedTouches.length !== 1) return;

        // Re-enable orbit after any touch ends
        this.sceneManager.setTouchDrawingMode(false);

        // Only treat as a tap if the finger barely moved
        if (this._touchMoved) {
            this._touchMoved = false;
            return;
        }

        event.preventDefault();
        const fakeEvent = this._touchToFakeEvent(event.changedTouches[0]);
        const intersection = this._touchStartIntersection ?? this.sceneManager.getMouseIntersection(fakeEvent);

        switch (this.stateManager.currentMode) {
            case 'sketch':
                this.handleSketchClick(intersection);
                break;
            case 'extrude':
            case 'face-extrude':
                this.handleExtrudeClick(intersection, fakeEvent);
                break;
            case 'select':
                this.handleSelectClick(intersection, fakeEvent);
                break;
        }

        this._touchMoved = false;
    }

    onKeyDown(event) {
        // Undo / Redo
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            this.commandManager.undo();
            return;
        }

        // Numeric input during active extrusion (sketch or face)
        const isExtruding = this.stateManager.isExtruding || this.stateManager.isFaceExtruding;
        if (isExtruding) {
            if (/^[0-9]$/.test(event.key) || event.key === '.') {
                event.preventDefault();
                this._appendNumericInput(event.key);
                return;
            }
            if (event.key === 'Backspace') {
                event.preventDefault();
                this._numericInput = this._numericInput.slice(0, -1);
                this._renderNumericOverlay();
                return;
            }
            if (event.key === 'Enter' && this._numericInput.length > 0) {
                event.preventDefault();
                const value = parseFloat(this._numericInput);
                if (!isNaN(value) && value > 0) {
                    this._applyNumericExtrusion(value);
                }
                return;
            }
        }

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
            // Named camera views (Blender numpad convention)
            case '1':
                this.sceneManager.setCameraView('front');
                break;
            case '3':
                this.sceneManager.setCameraView('right');
                break;
            case '7':
                this.sceneManager.setCameraView('top');
                break;
            case 'escape':
                if (this.stateManager.isExtruding || this.stateManager.isFaceExtruding) {
                    this._clearNumericInput();
                    this.cancelExtrusion();
                } else {
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

    // ── Numeric extrusion input ────────────────────────────────────────────

    _getOrCreateNumericOverlay() {
        if (!this._numericOverlay) {
            const el = document.createElement('div');
            el.id = 'numeric-input-overlay';
            el.style.cssText = [
                'position:fixed',
                'bottom:60px',
                'left:50%',
                'transform:translateX(-50%)',
                'background:rgba(0,0,0,0.8)',
                'color:#fff',
                'font-family:monospace',
                'font-size:20px',
                'padding:8px 20px',
                'border-radius:6px',
                'border:2px solid #ff9500',
                'pointer-events:none',
                'z-index:9999',
                'display:none',
            ].join(';');
            document.body.appendChild(el);
            this._numericOverlay = el;
        }
        return this._numericOverlay;
    }

    _appendNumericInput(char) {
        // Allow only one decimal point
        if (char === '.' && this._numericInput.includes('.')) return;
        this._numericInput += char;
        this._renderNumericOverlay();
    }

    _renderNumericOverlay() {
        const el = this._getOrCreateNumericOverlay();
        if (this._numericInput.length > 0) {
            el.textContent = `Height: ${this._numericInput}`;
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    }

    _clearNumericInput() {
        this._numericInput = '';
        if (this._numericOverlay) this._numericOverlay.style.display = 'none';
    }

    _applyNumericExtrusion(value) {
        if (this.stateManager.isExtruding && this.stateManager.selectedSketch) {
            const sketch = this.stateManager.selectedSketch;
            // Force the sketch to the typed height and confirm
            sketch.extrude(value);
            if (sketch.extrudedMesh) {
                this.sceneManager.addToScene(sketch.extrudedMesh);
            }
            const sketchForUndo = sketch;
            this.stateManager.finishExtrusion();
            this.clearSketchExtrusionDimensions();
            this._clearNumericInput();
            if (sketchForUndo.isExtruded) {
                this.commandManager.push(
                    CommandManager.createExtrude(sketchForUndo, this.sceneManager, this.stateManager)
                );
            }
        } else if (this.stateManager.isFaceExtruding && this.stateManager.currentFaceExtrusion) {
            // Override the face extrusion distance with the typed value
            this.stateManager.currentFaceExtrusion.extrudeDistance = value;
            this.extrusionManager.createFaceExtrusionMesh(this.stateManager.currentFaceExtrusion, value);
            this.extrusionManager.confirmFaceExtrusion();
            this.clearSketchExtrusionDimensions();
            this._clearNumericInput();
        }
    }

    // ── Extrusion confirm / cancel ─────────────────────────────────────────

    confirmExtrusion() {
        if (this.stateManager.isExtruding && this.stateManager.selectedSketch) {
            this.stateManager.finishExtrusion();
        } else if (this.stateManager.isFaceExtruding && this.stateManager.currentFaceExtrusion) {
            this.extrusionManager.confirmFaceExtrusion();
        }
        this.clearSketchExtrusionDimensions();
    }

    cancelExtrusion() {
        if (this.stateManager.isExtruding && this.stateManager.selectedSketch) {
            this.stateManager.selectedSketch.cancelExtrusion();
            this.stateManager.isExtruding = false;
            this.stateManager.selectedSketch = null;
            this.stateManager.extrudeStartPos = null;
        } else if (this.stateManager.isFaceExtruding) {
            this.extrusionManager.cancelFaceExtrusion();
        }
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
                // Record undo command BEFORE removing
                const deleteCmd = CommandManager.createDelete(sketch, this.sceneManager, this.stateManager);

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

                // Push after all removal side-effects are done
                this.commandManager.push(deleteCmd);

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