import * as THREE from 'three';
import { ExtrusionManager } from './ExtrusionManager.js';
import { SketchRectangle } from '../geometry/SketchRectangle.js';
import { SelectionManager } from './SelectionManager.js';
import { TransformManager } from './TransformManager.js';
import { StatusBarManager } from './StatusBarManager.js';
import { CommandManager } from './CommandManager.js';
import { PropertyPanelManager } from './PropertyPanelManager.js';
import { ToastManager } from './ToastManager.js';
import { GridSnapManager } from './GridSnapManager.js';
import { ExportManager } from './ExportManager.js';
import { ProjectManager } from './ProjectManager.js';
import { CommandPaletteManager } from './CommandPaletteManager.js';
import { HistoryPanelManager } from './HistoryPanelManager.js';
import { DisplayModeManager } from './DisplayModeManager.js';
import { ContextMenuManager } from './ContextMenuManager.js';
import { MeasurementManager } from './MeasurementManager.js';
import { BoxSelectManager } from './BoxSelectManager.js';
import { EdgeSelectionManager } from './EdgeSelectionManager.js';
import { FilletManager } from './FilletManager.js';
import { BooleanManager } from './BooleanManager.js';
import { ConstructionPlaneManager } from './ConstructionPlaneManager.js';
import { ScriptEditorManager } from './ScriptEditorManager.js';

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
        this.gridSnapManager = new GridSnapManager(1.0);
        this.exportManager = new ExportManager(sceneManager, stateManager);
        this.projectManager = new ProjectManager(sceneManager, stateManager);
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

        // Power-user features (sprint 3)
        this.displayModeManager = new DisplayModeManager(sceneManager, stateManager);
        this.historyPanelManager = new HistoryPanelManager(this.commandManager);
        this.commandPaletteManager = new CommandPaletteManager();
        this._hookHistoryRefresh();
        this._registerPaletteCommands();

        // Polish sprint
        this.contextMenuManager = new ContextMenuManager();
        this._setupContextMenuCallbacks();
        this.measurementManager = new MeasurementManager(sceneManager, stateManager);

        // Plasticity-inspired sprint
        this.boxSelectManager = new BoxSelectManager(sceneManager, stateManager);
        this.boxSelectManager.init(this.sceneManager.renderer.domElement);
        this.boxSelectManager.onBoxSelect = (meshes, additive) => this._onBoxSelect(meshes, additive);

        this.edgeSelectionManager = new EdgeSelectionManager(sceneManager, stateManager);

        this.filletManager = new FilletManager(sceneManager, stateManager);
        this.booleanManager = new BooleanManager(sceneManager, stateManager);

        // Advanced CAD sprint
        this.constructionPlaneManager = new ConstructionPlaneManager(sceneManager, stateManager);

        // Procedural / parametric scripting
        this.scriptEditorManager = new ScriptEditorManager(sceneManager, stateManager, this.booleanManager);
        this.scriptEditorManager.init();

        // Track second selected object for boolean ops
        this._secondSelectedObject = null;

        // Orbit mode: when true, touch always rotates/pans the camera (drawing disabled)
        this.orbitMode = false;
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

        // Mobile: enable horizontal swipe on the tool strip
        this._setupToolstripScroll();

        // Hook into TransformControls to refresh property panel on move
        if (this.transformManager.transformControls) {
            this.transformManager.transformControls.addEventListener('objectChange', () => {
                this.propertyPanelManager.refresh();
            });
        }
    }

    _setupToolstripScroll() {
        const strip = document.querySelector('.top-bar__right');
        if (!strip) return;

        let startX = 0;
        let startScrollLeft = 0;
        let isScrolling = false;

        strip.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startScrollLeft = strip.scrollLeft;
            isScrolling = false;
        }, { passive: true });

        strip.addEventListener('touchmove', (e) => {
            const dx = startX - e.touches[0].clientX;
            if (!isScrolling && Math.abs(dx) > 5) {
                isScrolling = true;
            }
            if (isScrolling) {
                strip.scrollLeft = startScrollLeft + dx;
                e.stopPropagation();
            }
        }, { passive: true });

        strip.addEventListener('touchend', () => {
            isScrolling = false;
        }, { passive: true });
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
            ToastManager.show('Scene cleared', 'info');
        });

        // Undo / Redo buttons
        const undoBtn = document.getElementById('top-undo');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.commandManager.undo());
        }
        const redoBtn = document.getElementById('top-redo');
        if (redoBtn) {
            redoBtn.addEventListener('click', () => this.commandManager.redo());
        }

        // Duplicate button
        const dupBtn = document.getElementById('top-duplicate');
        if (dupBtn) {
            dupBtn.addEventListener('click', () => this.handleDuplicate());
        }

        // Projection toggle
        document.getElementById('perspective-btn').addEventListener('click', () => {
            if (this.sceneManager.isPerspective) return;
            this.statusBarManager.updateCameraType('perspective');
            this._syncProjectionButtons(true);
            ToastManager.show('Switched to perspective', 'info');
        });

        document.getElementById('orthographic-btn').addEventListener('click', () => {
            if (!this.sceneManager.isPerspective) return;
            this.statusBarManager.updateCameraType('orthographic');
            this._syncProjectionButtons(false);
            ToastManager.show('Switched to orthographic', 'info');
        });

        // Home button
        document.getElementById('home-btn').addEventListener('click', () => {
            this.sceneManager.fitAllObjects();
        });

        // Orbit mode toggle (touch-friendly camera control)
        const orbitBtn = document.getElementById('top-orbit-mode');
        if (orbitBtn) {
            orbitBtn.addEventListener('click', () => this._toggleOrbitMode());
        }

        // Save / Load
        const saveBtn = document.getElementById('top-save');
        if (saveBtn) saveBtn.addEventListener('click', () => this._handleSave());

        const loadBtn = document.getElementById('top-load');
        if (loadBtn) loadBtn.addEventListener('click', () => this._handleLoad());

        // Grid snap toggle
        const snapBtn = document.getElementById('top-snap');
        if (snapBtn) snapBtn.addEventListener('click', () => this._toggleGridSnap());

        // Measurement toggle
        const measureBtn = document.getElementById('top-measure');
        if (measureBtn) measureBtn.addEventListener('click', () => this._toggleMeasurement());

        // History panel toggle
        const histBtn = document.getElementById('top-history');
        if (histBtn) histBtn.addEventListener('click', () => this.historyPanelManager.toggle());

        // Command palette
        const paletteBtn = document.getElementById('top-command-palette');
        if (paletteBtn) paletteBtn.addEventListener('click', () => this.commandPaletteManager.open());

        // Export dropdown
        const exportBtn = document.getElementById('top-export');
        const exportMenu = document.getElementById('export-menu');
        if (exportBtn && exportMenu) {
            exportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                exportMenu.classList.toggle('open');
            });
            exportMenu.querySelectorAll('[data-export]').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    exportMenu.classList.remove('open');
                    this._handleExport(item.dataset.export);
                });
            });
            // Close on outside click
            document.addEventListener('click', () => exportMenu.classList.remove('open'));
        }

        // Edge select toggle button
        const edgeBtn = document.getElementById('top-edge-select');
        if (edgeBtn) edgeBtn.addEventListener('click', () => this._toggleEdgeSelect());

        // Construction plane button — toggle or reset
        const cpBtn = document.getElementById('top-construction-plane');
        if (cpBtn) {
            cpBtn.addEventListener('click', () => {
                if (this.constructionPlaneManager.isActive) {
                    this.constructionPlaneManager.reset();
                    cpBtn.classList.remove('active');
                    this.statusBarManager.updateOperationHint();
                    ToastManager.show('Construction plane reset', 'info');
                } else if (this.stateManager.hoveredFace) {
                    this.constructionPlaneManager.setFromFace(this.stateManager.hoveredFace);
                    cpBtn.classList.add('active');
                    this.statusBarManager.setHint('Construction plane active — Esc to reset');
                    ToastManager.show('Construction plane set', 'info');
                } else {
                    ToastManager.show('Hover a face first, then click', 'warning');
                }
            });
        }

        // Boolean / fillet dropdown
        const boolBtn  = document.getElementById('top-boolean');
        const boolMenu = document.getElementById('boolean-menu');
        if (boolBtn && boolMenu) {
            boolBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                boolMenu.classList.toggle('open');
            });
            boolMenu.querySelectorAll('[data-bool]').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    boolMenu.classList.remove('open');
                    const op = item.dataset.bool;
                    if (op === 'fillet')  this._handleFillet(0.2);
                    else if (op === 'chamfer') this._handleChamfer(0.15);
                    else this._handleBoolean(op);
                });
            });
            document.addEventListener('click', () => boolMenu.classList.remove('open'));
        }

        // Procedural script editor button
        const scriptBtn = document.getElementById('top-script-editor');
        if (scriptBtn) scriptBtn.addEventListener('click', () => this.scriptEditorManager.toggle());

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

        // Enable/disable duplicate button based on selection
        const dupBtn = document.getElementById('top-duplicate');
        if (dupBtn) {
            dupBtn.disabled = !this.stateManager.selectedObject;
        }
    }

    // ── Click handler (context-sensitive) ────────────────────────────────

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        // Edge selection click
        if (this.edgeSelectionManager && this.edgeSelectionManager.enabled) {
            this.edgeSelectionManager.onClick(event);
            return;
        }

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

        // Enable duplicate button now that something is selected
        const dupBtn = document.getElementById('top-duplicate');
        if (dupBtn) dupBtn.disabled = false;
    }

    handleSketchClick(intersection) {
        const snapped = intersection ? this.gridSnapManager.snapPoint(intersection.clone()) : intersection;
        if (!this.stateManager.isDrawing) {
            this.stateManager.isDrawing = true;
            this.stateManager.currentSketch = new SketchRectangle(snapped, snapped);
            this.stateManager.currentSketch.setStateManager(this.stateManager);
            const mesh = this.stateManager.currentSketch.createMesh();
            this.sceneManager.addToScene(mesh);
        } else {
            const completedSketch = this.stateManager.currentSketch;
            const success = this.stateManager.finishDrawing();
            if (success && completedSketch) {
                this.projectManager.triggerAutoSave();
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
                this.projectManager.triggerAutoSave();
                if (sketchForUndo.extrudedMesh) this.displayModeManager.applyToMesh(sketchForUndo.extrudedMesh);
                ToastManager.show('Object created', 'success');
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
            const snappedIntersection = intersection ? this.gridSnapManager.snapPoint(intersection.clone()) : intersection;
            const mesh = this.stateManager.currentSketch.update(snappedIntersection);
            if (mesh) {
                this.sceneManager.addToScene(mesh);
            }
        } else if (this.stateManager.isExtruding && this.stateManager.selectedSketch && this.stateManager.extrudeStartPos) {
            if (intersection) {
                event.preventDefault();
                const distance = intersection.distanceTo(this.stateManager.extrudeStartPos);
                const rawHeight = Math.max(0, distance * 0.5);
                const height = this.gridSnapManager.snapValue(rawHeight);
                const mesh = this.stateManager.selectedSketch.extrude(height);
                if (mesh) {
                    this.sceneManager.addToScene(mesh);
                }

                if (this.stateManager.dimensionsEnabled && height > 0.1) {
                    this.updateSketchExtrusionDimensions(this.stateManager.selectedSketch, height);
                }
            }
        } else if (this.stateManager.isFaceExtruding && this.stateManager.currentFaceExtrusion && this.stateManager.faceExtrudeStartPos && !this.stateManager.currentFaceExtrusion.isPending) {
            event.preventDefault();
            this.extrusionManager.updateFaceExtrusion(event);
        }

        // Edge selection hover
        if (this.edgeSelectionManager && this.edgeSelectionManager.enabled) {
            this.edgeSelectionManager.onMouseMove(event);
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

        // During active extrusion: right-click = confirm (existing behaviour)
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
            return;
        }
        if (this.stateManager.isFaceExtruding && this.stateManager.currentFaceExtrusion) {
            if (Math.abs(this.stateManager.currentFaceExtrusion.extrudeDistance) > 0.1) {
                this._confirmFaceExtrusionWithUndo();
            } else {
                this.extrusionManager.cancelFaceExtrusion();
            }
            this.clearSketchExtrusionDimensions();
            this._clearNumericInput();
            return;
        }

        // Otherwise: show context menu
        const intersection = this.sceneManager.getMouseIntersection(event);
        const context = this._detectContext(event, intersection);

        if (context.type === 'object' || context.type === 'face') {
            const sketch = context.mesh
                ? context.mesh.userData.sketchRectangle
                : (this.stateManager.selectedObject ? this.stateManager.selectedObject.userData.sketchRectangle : null);
            if (sketch) {
                this.contextMenuManager.showForObject(event, sketch);
            }
        } else {
            this.contextMenuManager.showForEmpty(event, intersection);
        }
    }

    _setupContextMenuCallbacks() {
        this.contextMenuManager.setCallbacks({
            rename: (sketch) => {
                if (this.stateManager.objectListManager) {
                    this.stateManager.objectListManager.startRename(sketch.objectId);
                }
            },
            duplicate: (sketch) => {
                // Select the sketch's mesh first so handleDuplicate works
                if (sketch.extrudedMesh) {
                    this._contextSelectObject(sketch.extrudedMesh, null);
                }
                this.handleDuplicate();
            },
            toggleVisibility: (sketch) => {
                if (this.stateManager.objectListManager) {
                    this.stateManager.objectListManager.toggleVisibility(sketch.objectId);
                }
            },
            delete: (sketch) => {
                if (sketch.extrudedMesh) {
                    this._contextSelectObject(sketch.extrudedMesh, null);
                }
                this.handleDeleteSelected();
            },
            sketchHere: (worldPos) => {
                this.stateManager.setMode('sketch');
                this.updateSidebarIcons();
                if (worldPos) {
                    const snapped = this.gridSnapManager.snapPoint(worldPos.clone());
                    this.handleSketchClick({ point: snapped });
                }
            },
            resetView: () => {
                this.sceneManager.fitAllObjects();
            },
        });
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

        // In orbit mode, hand all single-touch to OrbitControls (camera navigation)
        if (this.orbitMode) {
            this.sceneManager.setTouchDrawingMode(false);
            this.sceneManager.controls.enabled = true;
            this._touchMoved = false;
            return;
        }

        const mode = this.stateManager.currentMode;
        const isActivelyWorking = this.stateManager.isDrawing
            || this.stateManager.isExtruding
            || this.stateManager.isFaceExtruding;

        if (mode === 'sketch' || mode === 'extrude' || mode === 'face-extrude' || isActivelyWorking) {
            event.preventDefault();
            this.sceneManager.setTouchDrawingMode(true);
            this.sceneManager.controls.enabled = false;
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

        // In orbit mode, OrbitControls handles the touch — do nothing here
        if (this.orbitMode) return;

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

        // In orbit mode, OrbitControls handles everything — just re-enable and bail
        if (this.orbitMode) {
            this.sceneManager.setTouchDrawingMode(false);
            this.sceneManager.controls.enabled = true;
            this._touchMoved = false;
            return;
        }

        this.sceneManager.setTouchDrawingMode(false);
        this.sceneManager.controls.enabled = true;

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

        // Duplicate: Ctrl+D / Cmd+D
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
            event.preventDefault();
            this.handleDuplicate();
            return;
        }

        // Save: Ctrl+S / Cmd+S
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            this._handleSave();
            return;
        }

        // Procedural script editor: Ctrl+Shift+P
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
            event.preventDefault();
            this.scriptEditorManager.toggle();
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
            case 'g':
                if (!event.ctrlKey) {
                    this._toggleGridSnap();
                }
                break;
            case 'h':
                if (!event.ctrlKey && !event.metaKey) {
                    this.historyPanelManager.toggle();
                }
                break;
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
                if (this.measurementManager && this.measurementManager.isActive) {
                    this.measurementManager.setMode('off');
                    this.measurementManager.clearAll();
                    const btn = document.getElementById('top-measure');
                    if (btn) btn.classList.remove('active');
                    break;
                }
                if (this.constructionPlaneManager && this.constructionPlaneManager.isActive) {
                    this.constructionPlaneManager.reset();
                    this.statusBarManager.updateOperationHint();
                    ToastManager.show('Construction plane reset', 'info');
                    const cpBtnEsc = document.getElementById('top-construction-plane');
                    if (cpBtnEsc) cpBtnEsc.classList.remove('active');
                    break;
                }
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
            case 'm':
                if (!event.ctrlKey && !event.metaKey) {
                    this._toggleMeasurement();
                }
                break;
            case ' ':
                // Space — set construction plane from hovered face
                event.preventDefault();
                if (this.stateManager.hoveredFace) {
                    this.constructionPlaneManager.setFromFace(this.stateManager.hoveredFace);
                    this.statusBarManager.setHint('Construction plane active — Esc to reset');
                    ToastManager.show('Construction plane set', 'info');
                    const cpBtn2 = document.getElementById('top-construction-plane');
                    if (cpBtn2) cpBtn2.classList.add('active');
                } else if (this.constructionPlaneManager.isActive) {
                    this.constructionPlaneManager.reset();
                    this.statusBarManager.updateOperationHint();
                    ToastManager.show('Construction plane reset', 'info');
                    const cpBtn2 = document.getElementById('top-construction-plane');
                    if (cpBtn2) cpBtn2.classList.remove('active');
                }
                break;
            case 'l':
                // L — select edge loop (edge-select mode)
                if (!event.ctrlKey && !event.metaKey &&
                    this.edgeSelectionManager && this.edgeSelectionManager.enabled) {
                    const hovered = this.edgeSelectionManager._hoveredEdge;
                    if (hovered) {
                        this.edgeSelectionManager.selectLoop(hovered.mesh, hovered.segIndex);
                        ToastManager.show('Edge loop selected', 'info');
                    }
                }
                break;
        }

        // Transform shortcuts: active when object is attached (not just during drag)
        if (this.transformManager.currentTransformObject) {
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
                this.projectManager.triggerAutoSave();
                this.updateSidebarIcons();
                ToastManager.show('Object deleted', 'info');
            }
        } else {
            ToastManager.show('Select an object to delete', 'warning');
        }
    }

    /** Keep P / O buttons visually in sync with camera state. */
    _syncProjectionButtons(isPerspective) {
        const pBtn = document.getElementById('perspective-btn');
        const oBtn = document.getElementById('orthographic-btn');
        if (pBtn) pBtn.classList.toggle('active', isPerspective);
        if (oBtn) oBtn.classList.toggle('active', !isPerspective);
    }

    /** Duplicate the currently selected extruded object (Ctrl+D). */
    handleDuplicate() {
        const selectedObj = this.stateManager.selectedObject;
        if (!selectedObj) {
            ToastManager.show('Select an object to duplicate', 'warning');
            return;
        }

        const original = selectedObj.userData.sketchRectangle;
        if (!original || !original.isExtruded) {
            ToastManager.show('Only extruded objects can be duplicated', 'warning');
            return;
        }

        const OFFSET = 1.5;
        const dupStart = original.startPoint.clone().add(new THREE.Vector3(OFFSET, 0, OFFSET));
        const dupEnd   = original.endPoint.clone().add(new THREE.Vector3(OFFSET, 0, OFFSET));

        const dup = new SketchRectangle(dupStart, dupEnd, this.sceneManager.sceneHandler);
        dup.setStateManager(this.stateManager);

        // Build 2-D mesh
        const mesh2d = dup.createMesh();
        this.sceneManager.addToScene(mesh2d);

        // Extrude to same height and confirm
        const mesh3d = dup.extrude(original.extrudeHeight);
        if (mesh3d) {
            this.sceneManager.addToScene(mesh3d);
            dup.confirmExtrusion();
        }

        // Register in state (generates objectId, adds to list)
        this.stateManager.addSketch(dup);

        // Record undo
        this.commandManager.push(
            CommandManager.createDuplicate(original, dup, this.sceneManager, this.stateManager)
        );

        // Auto-select the duplicate
        this._contextSelectObject(dup.extrudedMesh, null);

        this.projectManager.triggerAutoSave();
        ToastManager.show('Object duplicated', 'success');
    }

    // ── Project save / load ───────────────────────────────────────────────

    _handleSave() {
        this.projectManager.saveToFile();
        ToastManager.show('Project saved', 'success');
    }

    _handleLoad() {
        this.projectManager.loadFromFile();
    }

    // ── Measurement ───────────────────────────────────────────────────────

    _toggleMeasurement() {
        this.measurementManager.cycleMode();
        const mode = this.measurementManager.mode;
        const btn = document.getElementById('top-measure');
        if (btn) btn.classList.toggle('active', mode !== 'off');

        const modeLabels = { off: 'off', distance: 'Distance', area: 'Area' };
        if (mode === 'off') {
            this.measurementManager.clearAll();
            ToastManager.show('Measurement off', 'info');
        } else {
            ToastManager.show(`Measurement: ${modeLabels[mode]}`, 'info');
        }
    }

    // ── Box selection callback ────────────────────────────────────────────

    _onBoxSelect(meshes, additive) {
        if (meshes.length === 0) {
            if (!additive) {
                this.selectionManager.deselectAll();
                this.stateManager.clearSelections();
                this.propertyPanelManager.hide();
                this.transformManager.detachFromObject();
                this._secondSelectedObject = null;
            }
            return;
        }

        if (!additive) {
            this.selectionManager.deselectAll();
            this.stateManager.clearSelections();
            this._secondSelectedObject = null;
        }

        // Select first mesh as primary, track second for boolean ops
        for (let i = 0; i < meshes.length; i++) {
            const mesh = meshes[i];
            if (i === 0) {
                this._contextSelectObject(mesh, null);
            } else if (i === 1) {
                // Highlight second without full context-switch
                this._secondSelectedObject = mesh;
                this.selectionManager.setHoveredObject(mesh);
            }
        }

        if (meshes.length > 1) {
            ToastManager.show(`${meshes.length} objects selected — use Boolean ops`, 'info');
        }
    }

    // ── Fillet / Chamfer ──────────────────────────────────────────────────

    _handleFillet(amount = 0.2) {
        const sel = this.stateManager.selectedObject;
        if (!sel) { ToastManager.show('Select an object first', 'warning'); return; }
        const sketch = sel.userData?.sketchRectangle;
        if (!sketch || !sketch.extrudedMesh) return;

        // Snapshot geometry BEFORE the operation for undo
        const oldGeometry = sketch.extrudedMesh.geometry.clone();

        if (this.filletManager.hasOperation(sketch)) {
            this.filletManager.reset(sketch);
            const newGeometry = sketch.extrudedMesh.geometry.clone();
            this.commandManager.push(CommandManager.createFillet({
                sketch, oldGeometry, newGeometry, filletOp: null
            }));
            ToastManager.show('Fillet removed', 'info');
        } else {
            const ok = this.filletManager.fillet(sketch, amount);
            if (ok) {
                const newGeometry = sketch.extrudedMesh.geometry.clone();
                this.commandManager.push(CommandManager.createFillet({
                    sketch, oldGeometry, newGeometry,
                    filletOp: { type: 'fillet', amount }
                }));
                ToastManager.show(`Fillet r=${amount}`, 'success');
            }
        }
    }

    _handleChamfer(amount = 0.15) {
        const sel = this.stateManager.selectedObject;
        if (!sel) { ToastManager.show('Select an object first', 'warning'); return; }
        const sketch = sel.userData?.sketchRectangle;
        if (!sketch || !sketch.extrudedMesh) return;

        // Snapshot geometry BEFORE the operation for undo
        const oldGeometry = sketch.extrudedMesh.geometry.clone();

        if (this.filletManager.hasOperation(sketch)) {
            this.filletManager.reset(sketch);
            const newGeometry = sketch.extrudedMesh.geometry.clone();
            this.commandManager.push(CommandManager.createFillet({
                sketch, oldGeometry, newGeometry, filletOp: null
            }));
            ToastManager.show('Chamfer removed', 'info');
        } else {
            const ok = this.filletManager.chamfer(sketch, amount);
            if (ok) {
                const newGeometry = sketch.extrudedMesh.geometry.clone();
                this.commandManager.push(CommandManager.createFillet({
                    sketch, oldGeometry, newGeometry,
                    filletOp: { type: 'chamfer', amount }
                }));
                ToastManager.show(`Chamfer c=${amount}`, 'success');
            }
        }
    }

    // ── Boolean operations ────────────────────────────────────────────────

    _handleBoolean(type) {
        const meshA = this.stateManager.selectedObject;
        const meshB = this._secondSelectedObject;

        if (!meshA || !meshB) {
            ToastManager.show('Box-select 2 objects first (Shift+drag for 2nd)', 'warning');
            return;
        }

        const sketchA = meshA.userData?.sketchRectangle;
        const sketchB = meshB.userData?.sketchRectangle;

        if (!sketchA || !sketchB) return;
        if (!sketchA.extrudedMesh || !sketchB.extrudedMesh) return;

        // Snapshot operand meshes BEFORE the operation so undo can restore them
        const oldMeshA = sketchA.extrudedMesh;
        const oldMeshB = sketchB.extrudedMesh;

        const result = this.booleanManager.operate(type, sketchA, sketchB);

        if (result) {
            this.commandManager.push(
                CommandManager.createBoolean({
                    sketchA, sketchB,
                    oldMeshA, oldMeshB,
                    resultMesh: result,
                    sceneManager: this.sceneManager,
                    stateManager: this.stateManager,
                })
            );
            this._secondSelectedObject = null;
            this._contextSelectObject(result, null);
            this.projectManager.triggerAutoSave();
        }
    }

    // ── Edge select toggle ─────────────────────────────────────────────────

    _toggleEdgeSelect() {
        if (this.edgeSelectionManager.enabled) {
            this.edgeSelectionManager.disable();
            const btn = document.getElementById('top-edge-select');
            if (btn) btn.classList.remove('active');
            ToastManager.show('Edge select: OFF', 'info');
        } else {
            this.edgeSelectionManager.enable();
            const btn = document.getElementById('top-edge-select');
            if (btn) btn.classList.add('active');
            ToastManager.show('Edge select: ON — hover edges, click to select', 'info');
        }
    }

    // ── Grid snap ─────────────────────────────────────────────────────────

    _toggleGridSnap() {
        const enabled = this.gridSnapManager.toggle();
        const btn = document.getElementById('top-snap');
        if (btn) btn.classList.toggle('active', enabled);

        const indicator = document.getElementById('snap-indicator');
        if (indicator) {
            indicator.style.display = enabled ? 'inline' : 'none';
            indicator.textContent = `Snap ${this.gridSnapManager.gridSize}`;
        }

        ToastManager.show(enabled ? `Grid snap ON (${this.gridSnapManager.gridSize} unit)` : 'Grid snap OFF', 'info');
    }

    _toggleOrbitMode() {
        this.orbitMode = !this.orbitMode;
        const btn = document.getElementById('top-orbit-mode');
        if (btn) btn.classList.toggle('active', this.orbitMode);

        // Ensure OrbitControls state matches
        this.sceneManager.setTouchDrawingMode(false);
        this.sceneManager.controls.enabled = true;

        ToastManager.show(this.orbitMode ? 'Orbit mode ON — touch rotates camera' : 'Orbit mode OFF — touch draws', 'info');
    }

    // ── Export ────────────────────────────────────────────────────────────

    _handleExport(format) {
        let ok = false;
        switch (format) {
            case 'stl':  ok = this.exportManager.exportSTL();        break;
            case 'obj':  ok = this.exportManager.exportOBJ();        break;
            case 'gltf': ok = this.exportManager.exportGLTF(false);  break;
            case 'glb':  ok = this.exportManager.exportGLTF(true);   break;
            case 'png':  ok = this.exportManager.exportPNG();        break;
        }
        if (ok) {
            ToastManager.show(`Exported as ${format.toUpperCase()}`, 'success');
        } else {
            ToastManager.show('Nothing to export — add objects first', 'warning');
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

    // ── History panel hook ────────────────────────────────────────────────

    _hookHistoryRefresh() {
        // Patch CommandManager._updateUI to also refresh history panel
        const orig = this.commandManager._updateUI.bind(this.commandManager);
        this.commandManager._updateUI = () => {
            orig();
            this.historyPanelManager.refresh();
        };
    }

    // ── Command palette registration ──────────────────────────────────────

    _registerPaletteCommands() {
        const im = this;
        const sm = this.stateManager;
        const sc = this.sceneManager;

        this.commandPaletteManager.register([
            // ── Modes ──
            { id: 'mode-sketch',    label: 'Sketch mode',       shortcut: 'S',   action: () => { sm.setMode('sketch');  im.updateSidebarIcons(); } },
            { id: 'mode-extrude',   label: 'Extrude mode',      shortcut: 'E',   action: () => { sm.setMode('extrude'); im.updateSidebarIcons(); } },
            { id: 'mode-select',    label: 'Select mode',       shortcut: 'V',   action: () => { sm.setMode('select');  im.updateSidebarIcons(); } },

            // ── View ──
            { id: 'view-fit',       label: 'Fit all (home)',    shortcut: 'F',   action: () => sc.fitAllObjects() },
            { id: 'view-front',     label: 'Front view',        shortcut: '1',   action: () => sc.setCameraView('front') },
            { id: 'view-right',     label: 'Right view',        shortcut: '3',   action: () => sc.setCameraView('right') },
            { id: 'view-top',       label: 'Top view',          shortcut: '7',   action: () => sc.setCameraView('top') },
            { id: 'view-persp',     label: 'Perspective',       shortcut: 'P',   action: () => { im.statusBarManager.updateCameraType('perspective'); im._syncProjectionButtons(true); ToastManager.show('Switched to perspective', 'info'); } },
            { id: 'view-ortho',     label: 'Orthographic',      shortcut: 'O',   action: () => { im.statusBarManager.updateCameraType('orthographic'); im._syncProjectionButtons(false); ToastManager.show('Switched to orthographic', 'info'); } },

            // ── Display modes ──
            { id: 'display-shaded',       label: 'Display: Shaded',           shortcut: '',    action: () => im.displayModeManager.setMode('shaded') },
            { id: 'display-shaded-edges', label: 'Display: Shaded + Edges',   shortcut: '',    action: () => im.displayModeManager.setMode('shaded-edges') },
            { id: 'display-wireframe',    label: 'Display: Wireframe',        shortcut: '',    action: () => im.displayModeManager.setMode('wireframe') },
            { id: 'display-xray',         label: 'Display: X-Ray',            shortcut: '',    action: () => im.displayModeManager.setMode('xray') },
            { id: 'display-cycle',        label: 'Cycle display mode',        shortcut: 'W',   action: () => im.displayModeManager.cycleMode() },

            // ── Edit ──
            { id: 'edit-undo',      label: 'Undo',              shortcut: 'Ctrl+Z', action: () => im.commandManager.undo() },
            { id: 'edit-redo',      label: 'Redo',              shortcut: 'Ctrl+Y', action: () => im.commandManager.redo() },
            { id: 'edit-duplicate', label: 'Duplicate',         shortcut: 'Ctrl+D', action: () => im.handleDuplicate() },
            { id: 'edit-delete',    label: 'Delete selected',   shortcut: 'Del',    action: () => im.handleDeleteSelected() },
            { id: 'edit-clear',     label: 'Clear all',         shortcut: '',       action: () => { sm.clearAll(sc); im.propertyPanelManager.hide(); ToastManager.show('Scene cleared', 'info'); } },

            // ── File ──
            { id: 'file-save',      label: 'Save project',      shortcut: 'Ctrl+S', action: () => im._handleSave() },
            { id: 'file-load',      label: 'Load project',      shortcut: '',       action: () => im._handleLoad() },
            { id: 'export-stl',     label: 'Export STL',        shortcut: '',       action: () => im._handleExport('stl') },
            { id: 'export-obj',     label: 'Export OBJ',        shortcut: '',       action: () => im._handleExport('obj') },
            { id: 'export-gltf',    label: 'Export GLTF',       shortcut: '',       action: () => im._handleExport('gltf') },
            { id: 'export-glb',     label: 'Export GLB',        shortcut: '',       action: () => im._handleExport('glb') },
            { id: 'export-png',     label: 'Export PNG screenshot', shortcut: '',   action: () => im._handleExport('png') },

            // ── Grid snap ──
            { id: 'snap-toggle',    label: 'Toggle grid snap',  shortcut: 'G',      action: () => im._toggleGridSnap() },

            // ── Panels ──
            { id: 'panel-history',  label: 'Toggle history panel', shortcut: 'H',   action: () => im.historyPanelManager.toggle() },

            // ── Measurement ──
            { id: 'measure-distance', label: 'Measure: Distance',  shortcut: 'M',   action: () => { im.measurementManager.setMode('distance'); const b = document.getElementById('top-measure'); if(b) b.classList.add('active'); ToastManager.show('Measurement: Distance', 'info'); } },
            { id: 'measure-area',     label: 'Measure: Face Area',  shortcut: '',    action: () => { im.measurementManager.setMode('area'); const b = document.getElementById('top-measure'); if(b) b.classList.add('active'); ToastManager.show('Measurement: Face Area', 'info'); } },
            { id: 'measure-clear',    label: 'Clear measurements',  shortcut: '',    action: () => { im.measurementManager.clearAll(); im.measurementManager.setMode('off'); const b = document.getElementById('top-measure'); if(b) b.classList.remove('active'); ToastManager.show('Measurements cleared', 'info'); } },

            // ── Plasticity features ──
            { id: 'edge-select-toggle', label: 'Toggle edge select', shortcut: '',  action: () => im._toggleEdgeSelect() },
            { id: 'fillet-default',     label: 'Fillet top edges (r=0.2)', shortcut: '', action: () => im._handleFillet(0.2) },
            { id: 'chamfer-default',    label: 'Chamfer top edges (c=0.15)', shortcut: '', action: () => im._handleChamfer(0.15) },
            { id: 'bool-union',         label: 'Boolean: Union',      shortcut: '',  action: () => im._handleBoolean('union') },
            { id: 'bool-difference',    label: 'Boolean: Difference', shortcut: '',  action: () => im._handleBoolean('difference') },
            { id: 'bool-intersect',     label: 'Boolean: Intersect',  shortcut: '',  action: () => im._handleBoolean('intersect') },

            // ── Axis constraints (shown in palette for discoverability) ──
            { id: 'axis-x', label: 'Axis lock: X  (during transform)', shortcut: 'X', action: () => { if(im.transformManager.currentTransformObject) im.transformManager._toggleAxisConstraint('x'); else ToastManager.show('Select an object first', 'warning'); } },
            { id: 'axis-y', label: 'Axis lock: Y  (during transform)', shortcut: 'Y', action: () => { if(im.transformManager.currentTransformObject) im.transformManager._toggleAxisConstraint('y'); else ToastManager.show('Select an object first', 'warning'); } },
            { id: 'axis-z', label: 'Axis lock: Z  (during transform)', shortcut: 'Z', action: () => { if(im.transformManager.currentTransformObject) im.transformManager._toggleAxisConstraint('z'); else ToastManager.show('Select an object first', 'warning'); } },

            // ── Advanced CAD ──
            { id: 'cplane-set',   label: 'Set construction plane (hover face → Space)', shortcut: 'Space', action: () => { if(sm.hoveredFace) { im.constructionPlaneManager.setFromFace(sm.hoveredFace); im.statusBarManager.setHint('Construction plane active — Esc to reset'); ToastManager.show('Construction plane set', 'info'); const b = document.getElementById('top-construction-plane'); if(b) b.classList.add('active'); } else ToastManager.show('Hover a face first', 'warning'); } },
            { id: 'cplane-reset', label: 'Reset construction plane',                    shortcut: '',      action: () => { im.constructionPlaneManager.reset(); im.statusBarManager.updateOperationHint(); ToastManager.show('Construction plane reset', 'info'); const b = document.getElementById('top-construction-plane'); if(b) b.classList.remove('active'); } },
            { id: 'edge-loop',    label: 'Select edge loop (edge-select mode → L)',     shortcut: 'L',     action: () => { const h = im.edgeSelectionManager._hoveredEdge; if(im.edgeSelectionManager.enabled && h) { im.edgeSelectionManager.selectLoop(h.mesh, h.segIndex); ToastManager.show('Edge loop selected', 'info'); } else ToastManager.show('Enable edge select and hover an edge', 'warning'); } },

            // ── Procedural scripting ──
            { id: 'script-toggle', label: 'Procedural Script Editor', shortcut: 'Ctrl+Shift+P', action: () => im.scriptEditorManager.toggle() },
            { id: 'script-clear',  label: 'Clear procedural objects',  shortcut: '',             action: () => { im.scriptEditorManager._clearScene(); ToastManager.show('Procedural objects cleared', 'info'); } },
        ]);
    }
}
