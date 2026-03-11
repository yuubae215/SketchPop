import * as THREE from 'three';
import { ExtrusionManager } from './ExtrusionManager.js';
import { SketchRectangle } from './SketchRectangle.js';
import { SelectionManager } from './SelectionManager.js';
import { TransformManager } from './TransformManager.js';
import { StatusBarManager } from './StatusBarManager.js';
import { CommandManager } from './CommandManager.js';
import { PropertyPanelManager } from './PropertyPanelManager.js';

export class InteractionManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
        this.extrusionManager = new ExtrusionManager(sceneManager, stateManager);
        this.selectionManager = new SelectionManager(sceneManager, stateManager);
        this.transformManager = new TransformManager(sceneManager, stateManager);
        this.statusBarManager = new StatusBarManager();
        this.commandManager = new CommandManager();
        this.propertyPanelManager = new PropertyPanelManager();
        this.mouse = new THREE.Vector2();
        this.sketchExtrusionDimensions = [];
        this._numericInput = '';
        this._numericOverlay = null;

        // Set managers in state manager
        this.stateManager.setSelectionManager(this.selectionManager);
        this.stateManager.setTransformManager(this.transformManager);
        this.stateManager.setStatusBarManager(this.statusBarManager);

        this.setupEventListeners();
        this.setupControls();

        // Property panel (after DOM ready)
        this.propertyPanelManager.init();

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

        // Hook into TransformControls to refresh property panel on move
        if (this.transformManager.transformControls) {
            this.transformManager.transformControls.addEventListener('objectChange', () => {
                this.propertyPanelManager.refresh();
            });
        }
    }

    setupControls() {
        // Mode buttons — set mode AND update context hint
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
            this.propertyPanelManager.hide();
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

    // ── Click handler (context-sensitive) ────────────────────────────────

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        if (this.transformManager.isTransformActive()) return;

        const intersection = this.sceneManager.getMouseIntersection(event);

        // Priority 1: Continue active operations
        if (this.stateManager.isDrawing) {
            this.handleSketchClick(intersection);
            return;
        }

        if (this.stateManager.isExtruding || this.stateManager.isFaceExtruding) {
            this.handleActiveExtrudeClick(intersection, event);
            return;
        }

        // Priority 2: Context-sensitive action based on what's under the cursor
        const context = this._detectContext(event, intersection);

        switch (context.type) {
            case 'face':
                // Start face extrusion
                this.stateManager.startFaceExtrusion(this.stateManager.hoveredFace, intersection);
                this.stateManager.setMode('face-extrude');
                this.updateSidebarIcons();
                break;

            case 'object':
                // Select the 3D object
                this._contextSelectObject(context.mesh, event);
                break;

            case 'sketch2d':
                // Start extrusion of 2D sketch
                this.stateManager.startExtrusion(context.sketch, intersection);
                this.stateManager.setMode('extrude');
                this.updateSidebarIcons();
                break;

            case 'empty':
            default:
                // Start new sketch on ground plane
                this.stateManager.setMode('sketch');
                this.updateSidebarIcons();
                this.handleSketchClick(intersection);
                break;
        }
    }

    /**
     * Detect what's under the cursor and return an action context.
     * Priority: hovered face → 3D extruded mesh → 2D sketch → empty
     */
    _detectContext(event, intersection) {
        // 1. Face hovered (set by updateFaceHighlight on mousemove)
        if (this.stateManager.hoveredFace) {
            return { type: 'face' };
        }

        // 2. Raycast for 3D extruded meshes
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.sceneManager.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        const extrudedMeshes = this.stateManager.sketches
            .filter(s => s.isExtruded && s.extrudedMesh)
            .map(s => s.extrudedMesh);

        if (extrudedMeshes.length > 0) {
            const hits = this.sceneManager.raycaster.intersectObjects(extrudedMeshes, false);
            if (hits.length > 0 && hits[0].object.userData.sketchRectangle) {
                return { type: 'object', mesh: hits[0].object, sketch: hits[0].object.userData.sketchRectangle };
            }
        }

        // 3. Check for 2D sketch at ground intersection
        if (intersection) {
            for (const sketch of this.stateManager.sketches) {
                if (!sketch.isExtruded && sketch.containsPoint(intersection)) {
                    return { type: 'sketch2d', sketch };
                }
            }
        }

        return { type: 'empty' };
    }

    /** Select a mesh in context mode (no explicit select mode needed) */
    _contextSelectObject(mesh, event) {
        if (!mesh) return;
        this.selectionManager.selectObject(mesh);
        this.stateManager.selectObject(mesh);
        this.transformManager.attachToObject(mesh);

        const sketch = mesh.userData.sketchRectangle;
        if (sketch) {
            this.propertyPanelManager.show(sketch);
        }

        // Switch to select mode visually
        this.stateManager.setMode('select');
        this.updateSidebarIcons();
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
                // Record undo command
                this.commandManager.push(
                    CommandManager.createAddSketch(completedSketch, this.sceneManager, this.stateManager)
                );
                // Auto-transition: extrude mode
                this.stateManager.setMode('extrude');
                this.updateSidebarIcons();
                this.stateManager.startExtrusion(completedSketch, intersection);
            }
        }
    }

    /** Handle clicks when face extrusion or sketch extrusion is active */
    handleActiveExtrudeClick(intersection, event) {
        if (this.stateManager.isFaceExtruding && this.stateManager.currentFaceExtrusion) {
            if (Math.abs(this.stateManager.currentFaceExtrusion.extrudeDistance) > 0.1) {
                this._confirmFaceExtrusionWithUndo();
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
            this.stateManager.finishExtrusion();
            this.clearSketchExtrusionDimensions();
            this._clearNumericInput();
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

    /** Confirm face extrusion and push undo command */
    _confirmFaceExtrusionWithUndo() {
        const faceExtrusion = this.stateManager.currentFaceExtrusion;
        const originalSketch = faceExtrusion ? faceExtrusion.originalSketch : null;

        let snapshot = null;
        if (originalSketch && originalSketch.extrudedMesh) {
            snapshot = {
                sketch: originalSketch,
                oldGeometry: originalSketch.extrudedMesh.geometry.clone(),
                oldMeshPosition: originalSketch.extrudedMesh.position.clone(),
                oldExtrudeHeight: originalSketch.extrudeHeight,
                oldStartPoint: originalSketch.startPoint.clone(),
                oldEndPoint: originalSketch.endPoint.clone(),
                stateManager: this.stateManager
            };
        }

        this.extrusionManager.confirmFaceExtrusion();

        if (snapshot && originalSketch && originalSketch.extrudedMesh) {
            this.commandManager.push(CommandManager.createFaceExtrude(snapshot));
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
        } else if (this.stateManager.isExtruding && this.stateManager.selectedSketch && this.stateManager.extrudeStartPos) {
            event.preventDefault();
            const distance = intersection.distanceTo(this.stateManager.extrudeStartPos);
            const height = Math.max(0, distance * 0.5);
            const mesh = this.stateManager.selectedSketch.extrude(height);
            if (mesh) {
                this.sceneManager.addToScene(mesh);
            }

            if (this.stateManager.dimensionsEnabled && height > 0.1) {
                this.updateSketchExtrusionDimensions(this.stateManager.selectedSketch, height);
            }
        } else if (this.stateManager.isFaceExtruding && this.stateManager.currentFaceExtrusion && this.stateManager.faceExtrudeStartPos && !this.stateManager.currentFaceExtrusion.isPending) {
            event.preventDefault();
            this.extrusionManager.updateFaceExtrusion(event);
        }

        // Always update face highlight (enables context-sensitive cursor)
        if (!this.stateManager.isDrawing && !this.stateManager.isExtruding && !this.stateManager.isFaceExtruding) {
            this.extrusionManager.updateFaceHighlight(event);
            this._updateContextCursor(event, intersection);
        }

        // Object hover highlighting in select mode
        if (this.stateManager.selectionMode === 'object') {
            this.updateObjectHoverHighlight(event);
        }
    }

    /** Update canvas cursor to reflect what will happen on click */
    _updateContextCursor(event, intersection) {
        const container = document.getElementById('canvas-container');
        if (!container) return;

        // Remove all context classes
        container.classList.remove('ctx-sketch', 'ctx-extrude', 'ctx-select', 'ctx-face');

        if (this.stateManager.hoveredFace) {
            container.classList.add('ctx-face');
            return;
        }

        // Raycast for 3D objects
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.sceneManager.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        const extrudedMeshes = this.stateManager.sketches
            .filter(s => s.isExtruded && s.extrudedMesh)
            .map(s => s.extrudedMesh);

        if (extrudedMeshes.length > 0) {
            const hits = this.sceneManager.raycaster.intersectObjects(extrudedMeshes, false);
            if (hits.length > 0) {
                container.classList.add('ctx-select');
                return;
            }
        }

        // Check for 2D sketch
        if (intersection) {
            for (const sketch of this.stateManager.sketches) {
                if (!sketch.isExtruded && sketch.containsPoint(intersection)) {
                    container.classList.add('ctx-extrude');
                    return;
                }
            }
        }

        container.classList.add('ctx-sketch');
    }

    onRightClick(event) {
        event.preventDefault();
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
                this._confirmFaceExtrusionWithUndo();
            } else {
                this.extrusionManager.cancelFaceExtrusion();
            }
            this.clearSketchExtrusionDimensions();
            this._clearNumericInput();
        }
    }

    // ── Touch helpers ─────────────────────────────────────────────────────

    _touchToFakeEvent(touch) {
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: touch.target,
        };
    }

    onTouchStart(event) {
        if (event.touches.length !== 1) return;

        const mode = this.stateManager.currentMode;
        const isActivelyWorking = this.stateManager.isDrawing
            || this.stateManager.isExtruding
            || this.stateManager.isFaceExtruding;

        if (mode === 'sketch' || mode === 'extrude' || mode === 'face-extrude' || isActivelyWorking) {
            event.preventDefault();
            this.sceneManager.setTouchDrawingMode(true);
        } else {
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

        if (Math.sqrt(dx * dx + dy * dy) > 8) {
            this._touchMoved = true;
        }

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
        if (event.changedTouches.length !== 1) return;

        this.sceneManager.setTouchDrawingMode(false);

        if (this._touchMoved) {
            this._touchMoved = false;
            return;
        }

        event.preventDefault();
        const fakeEvent = this._touchToFakeEvent(event.changedTouches[0]);
        const intersection = this._touchStartIntersection ?? this.sceneManager.getMouseIntersection(fakeEvent);

        // Use context-sensitive handler
        this.onClick({ ...fakeEvent, preventDefault: () => {}, stopPropagation: () => {} });

        this._touchMoved = false;
    }

    onKeyDown(event) {
        // Undo: Ctrl+Z / Cmd+Z
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
            event.preventDefault();
            this.commandManager.undo();
            return;
        }

        // Redo: Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z
        if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
            event.preventDefault();
            this.commandManager.redo();
            return;
        }

        // Numeric input during active extrusion
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

        // Mode shortcuts
        switch (event.key.toLowerCase()) {
            case 's':
                if (!event.ctrlKey) {
                    this.stateManager.setMode('sketch');
                    this.updateSidebarIcons();
                }
                break;
            case 'e':
                if (!event.ctrlKey) {
                    this.stateManager.setMode('extrude');
                    this.updateSidebarIcons();
                }
                break;
            case 'v':
                this.stateManager.setMode('select');
                this.updateSidebarIcons();
                break;
            case 'f':
                this.sceneManager.fitAllObjects();
                break;
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
                    this.propertyPanelManager.hide();
                }
                break;
            case 'delete':
                this.handleDeleteSelected();
                break;
        }

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
            this.stateManager.currentFaceExtrusion.extrudeDistance = value;
            this.extrusionManager.createFaceExtrusionMesh(this.stateManager.currentFaceExtrusion, value);
            this._confirmFaceExtrusionWithUndo();
            this.clearSketchExtrusionDimensions();
            this._clearNumericInput();
        }
    }

    // ── Extrusion confirm / cancel ─────────────────────────────────────────

    confirmExtrusion() {
        if (this.stateManager.isExtruding && this.stateManager.selectedSketch) {
            this.stateManager.finishExtrusion();
        } else if (this.stateManager.isFaceExtruding && this.stateManager.currentFaceExtrusion) {
            this._confirmFaceExtrusionWithUndo();
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

        const startPoint = new THREE.Vector3(bounds.maxX + offset, 0, centerZ);
        const endPoint = new THREE.Vector3(bounds.maxX + offset, height, centerZ);

        const points = [startPoint, endPoint];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xff9500, linewidth: 2 });

        const dimensionLine = new THREE.Line(geometry, material);
        this.sketchExtrusionDimensions.push(dimensionLine);
        this.sceneManager.addToScene(dimensionLine);

        const tickLength = 0.2;

        const bottomTick1 = new THREE.Vector3(bounds.maxX + offset - tickLength, 0, centerZ);
        const bottomTick2 = new THREE.Vector3(bounds.maxX + offset + tickLength, 0, centerZ);
        const bottomTickGeometry = new THREE.BufferGeometry().setFromPoints([bottomTick1, bottomTick2]);
        const bottomTick = new THREE.Line(bottomTickGeometry, material);
        this.sketchExtrusionDimensions.push(bottomTick);
        this.sceneManager.addToScene(bottomTick);

        const topTick1 = new THREE.Vector3(bounds.maxX + offset - tickLength, height, centerZ);
        const topTick2 = new THREE.Vector3(bounds.maxX + offset + tickLength, height, centerZ);
        const topTickGeometry = new THREE.BufferGeometry().setFromPoints([topTick1, topTick2]);
        const topTick = new THREE.Line(topTickGeometry, material);
        this.sketchExtrusionDimensions.push(topTick);
        this.sceneManager.addToScene(topTick);

        const textPosition = new THREE.Vector3(bounds.maxX + offset + 0.4, height / 2, centerZ);
        this.createSketchExtrusionDimensionText(height.toFixed(2), textPosition);
    }

    createSketchExtrusionDimensionText(text, position) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

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

    // ── Object selection ──────────────────────────────────────────────────

    handleSelectClick(intersection, event) {
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (intersection) {
            const meshObjects = this.sceneManager.scene.children.filter(child =>
                child.type === 'Mesh' || (child.type === 'Group' && child.children.some(subchild => subchild.type === 'Mesh'))
            );

            this.sceneManager.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
            const intersects = this.sceneManager.raycaster.intersectObjects(meshObjects, true);

            for (const intersect of intersects) {
                if (intersect.object.userData.sketchRectangle) {
                    if (this.stateManager.selectionMode === 'object') {
                        this.selectionManager.selectObject(intersect.object);
                        this.stateManager.selectObject(intersect.object);
                        this.transformManager.attachToObject(intersect.object);

                        const sketch = intersect.object.userData.sketchRectangle;
                        if (sketch) this.propertyPanelManager.show(sketch);

                        return;
                    } else if (this.stateManager.selectionMode === 'face') {
                        const faceInfo = this.getFaceFromIntersection(intersect);
                        if (faceInfo) {
                            this.stateManager.selectFace(faceInfo.face, intersect.object, intersect.point);
                        }
                    }
                    return;
                }
            }
        }

        // Nothing hit — clear selection
        this.selectionManager.deselectAll();
        this.stateManager.clearSelections();
        this.propertyPanelManager.hide();
    }

    handleDeleteSelected() {
        if (this.stateManager.selectedObject) {
            const sketch = this.stateManager.selectedObject.userData.sketchRectangle;
            if (sketch) {
                const deleteCmd = CommandManager.createDelete(sketch, this.sceneManager, this.stateManager);

                if (sketch.mesh) this.sceneManager.removeFromScene(sketch.mesh);
                if (sketch.extrudedMesh) this.sceneManager.removeFromScene(sketch.extrudedMesh);
                sketch.clearDimensions();
                this.stateManager.removeSketch(sketch);

                if (this.transformManager.currentTransformObject === this.stateManager.selectedObject) {
                    this.transformManager.detachFromObject();
                }

                this.selectionManager.deselectAll();
                this.propertyPanelManager.hide();
                this.commandManager.push(deleteCmd);
            }
        }
    }

    getFaceFromIntersection(intersect) {
        if (!intersect.face || !intersect.object.geometry) return null;

        const face = intersect.face;
        const worldNormal = face.normal.clone();
        worldNormal.transformDirection(intersect.object.matrixWorld);
        worldNormal.normalize();

        let faceType = 'unknown';
        const tolerance = 0.1;

        if (Math.abs(worldNormal.y - 1) < tolerance) faceType = 'top';
        else if (Math.abs(worldNormal.y + 1) < tolerance) faceType = 'bottom';
        else if (Math.abs(worldNormal.x - 1) < tolerance) faceType = 'right';
        else if (Math.abs(worldNormal.x + 1) < tolerance) faceType = 'left';
        else if (Math.abs(worldNormal.z - 1) < tolerance) faceType = 'front';
        else if (Math.abs(worldNormal.z + 1) < tolerance) faceType = 'back';

        return {
            face: { index: intersect.faceIndex, normal: worldNormal, type: faceType },
            intersection: intersect.point
        };
    }

    updateObjectHoverHighlight(event) {
        const intersection = this.sceneManager.getMouseIntersection(event);

        if (intersection) {
            const meshObjects = this.sceneManager.scene.children.filter(child =>
                child.type === 'Mesh' || (child.type === 'Group' && child.children.some(subchild => subchild.type === 'Mesh'))
            );

            const intersects = this.sceneManager.raycaster.intersectObjects(meshObjects, true);

            for (const intersect of intersects) {
                if (intersect.object.userData.sketchRectangle) {
                    this.selectionManager.setHoveredObject(intersect.object);
                    return;
                }
            }
        }

        this.selectionManager.setHoveredObject(null);
    }
}
