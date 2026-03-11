# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SketchPop is a web-based 3D modeling application that runs in the browser. It implements a sketch-and-extrude workflow using Three.js, allowing users to draw 2D rectangles on a ground plane and extrude them into 3D solids. The project uses Vite as the build tool and follows a modular ES6 architecture.

**Live site:** https://yuubae215.github.io/SketchPop/

## Architecture

All managers are instantiated in `InteractionManager` (orchestrator), which is created by the entry point `index.js`.

### Core Managers
- `SceneManager`: Three.js scene, camera (perspective/orthographic), renderer, lighting, OrbitControls
- `StateManager`: Application-wide state, mode switching (sketch / extrude / select), sketch collection
- `InteractionManager`: Unified mouse/keyboard event handling, instantiates and orchestrates all other managers

### Feature Managers
- `ExtrusionManager`: Extrusion logic, face detection via Raycasting, face highlighting
- `SelectionManager`: Object selection/deselection, visual feedback
- `TransformManager`: Move / rotate / scale with visual transform handles
- `ObjectListManager`: Sidebar object list (visibility toggle, selection)
- `StatusBarManager`: Status bar display (current mode, hint text)
- `CommandManager`: Undo/redo stack using Command pattern (AddSketch, Extrude, Delete, FaceExtrude, Duplicate)
- `PropertyPanelManager`: Right-side slide-in panel showing position and dimensions of selected object
- `HistoryPanelManager`: Fusion-360-style timeline panel, reads from `CommandManager.undoStack`
- `CommandPaletteManager`: `Ctrl+K` fuzzy-search command launcher
- `DisplayModeManager`: Cycles display modes (shaded → shaded+edges → wireframe → xray) with `W` key
- `GridSnapManager`: Snaps sketch points and extrusion heights to a configurable grid (toggle with `G`)
- `ProjectManager`: Serialize/deserialize scene to JSON; auto-save to localStorage
- `ExportManager`: Exports scene as STL, OBJ, GLTF, GLB, or PNG
- `ContextMenuManager`: Right-click context menu (rename, duplicate, hide/show, delete)
- `BooleanManager`: CSG Boolean operations (union/difference/intersect) using three-csg-ts
- `BoxSelectManager`: Drag-to-select multiple objects in select mode
- `EdgeSelectionManager`: Hover-highlight and click-select individual edges on extruded meshes
- `FilletManager`: Chamfer (45° cut) or fillet (rounded arc) on top edges; reset to original
- `MeasurementManager`: Distance and face-area measurement annotations in the viewport
- `ToastManager`: Static class for non-blocking toast notifications (success/info/warning/error)

### Geometry
- `SketchRectangle`: Rectangle sketch on the ground plane and extrusion into 3D
- `CustomExtruder`: Manual geometry generation with per-face independent vertices, normals, and colors
- `Box`: Confirmed solid mesh management
- `Rectangle`: Base rectangle class

### UI Helpers
- `ViewCube`: 3D navigation cube for camera orientation (rendered in a separate overlay canvas)
- `AxisTriad`: X/Y/Z axis indicator

### handlers/ — Side-effect handlers separated by domain
- `domHandlers.js`: `ObjectListDOMHandler`, `SelectionModeDOMHandler`, `ConfirmationControlsDOMHandler`
- `threeHandlers.js`: `SceneHandler`, `MeshHandler`, `MaterialHandler`, `DimensionHandler`, `InteractionHandler`, `RenderHandler`
- `transformHandler.js`: `TransformHandler` — Transform Controls abstraction
- `selectionHandler.js`: `SelectionHandler` — selection highlight/dimension side effects
- `stateHandler.js`: `StateHandler` — state-change side effects

### utils/ — Pure functions (no side effects)
- `geometry.js`: Bounds, dimensions, center, rectangle points, face normals, distances
- `domUtils.js`: Object item data/HTML generation, ID generation, SVG icons
- `threeUtils.js`: Three.js-related calculations (bounds, distances, coordinate transforms)
- `selectionUtils.js`: Selection bounds, origin, dimension line positions, format helpers
- `stateUtils.js`: Mode validation, mode flag calculation, state transition helpers

## Development

**Setup and running:**
```bash
# Install dependencies
npm install
# or
pnpm install

# Start dev server (with hot reload)
npm run dev

# Open in browser
open http://localhost:5173/SketchPop/
```

**Build:**
```bash
npm run build    # Output to dist/
npm run preview  # Preview the built output
```

**Tech stack:**
- Three.js v0.178+ (npm package)
- three-csg-ts (CSG boolean operations)
- Vite v6+ (build tool and dev server)
- ES6 modules
- Vite root: `src/`, build output: `dist/`

**Code structure:**
- Entry point: `src/index.js`
- Config: `vite.config.js` (base: `/SketchPop/`, root: `src`)
- All source files are ES6 modules under `src/`

**Key classes and methods:**
- `CustomExtruder.generateVertices()`: Creates 24 independent vertices (6 faces × 4 vertices)
- `CustomExtruder.generateIndices()`: Triangle connectivity with correct winding order
- `CustomExtruder.generateNormals()`: Vertex normals derived from triangle normals
- `CustomExtruder.generateVertexColors()`: Per-face color assignment
- `ExtrusionManager`: Face detection via Raycasting and extrusion handling
- `StateManager`: Sketch/extrude/select mode state management
- `CommandManager.execute(cmd)`: Execute a command and push to undo stack
- `CommandManager.undo()` / `CommandManager.redo()`: Undo/redo operations
- `ProjectManager.triggerAutoSave()`: Debounced write to localStorage
- `GridSnapManager.snapPoint(vec3)`: Mutates and returns a snapped THREE.Vector3

## Design Principles

The codebase follows a **pure functions + side-effect handlers** separation pattern:
- **Pure functions** (in `utils/`): deterministic calculations with no external dependencies
- **Side-effect handlers** (in `handlers/`): DOM mutations, Three.js scene modifications, event dispatching
- **Managers**: orchestrate pure functions and handlers; hold state

When adding new features, follow this pattern:
1. Add pure calculation logic to the appropriate `utils/` file
2. Add DOM/Three.js side effects to the appropriate `handlers/` file
3. Coordinate in the relevant Manager class
