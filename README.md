# SketchPop - Intuitive 3D Modeling

A web-based 3D modeling application that creates 3D models from 2D sketches using an intuitive sketch-and-extrude workflow. Built with Three.js and Vite.

**Live Demo:** https://yuubae215.github.io/SketchPop/

## Overview

SketchPop lets you start with simple 2D rectangle sketches on a ground plane and extrude them into 3D shapes — bringing the core sketch-and-extrude experience of CAD software to the browser.

## Features

### Sketch & Extrude
- Draw 2D rectangles on the ground plane with click-and-drag
- Real-time preview while drawing
- Extrude 2D sketches into 3D shapes by moving the mouse
- Extrude additional faces from existing solid faces
- Orange preview during pending confirmation

### Transform
- Move, rotate, and scale confirmed objects with visual handles
- Box selection (drag to select multiple objects)
- Edge selection mode for selecting individual edges

### Display Modes (`W` key)
- Shaded — default opaque view
- Shaded + Edges — shaded with wireframe overlay
- Wireframe — lines only
- X-Ray — semi-transparent

### Grid Snap
- Toggle grid snapping (`G` key) for precise placement
- Configurable grid size (default 1.0 unit)

### Boolean Operations
- Union, Difference, Intersect on two selected extruded objects
- Powered by three-csg-ts

### Fillet & Chamfer
- Apply chamfer (45° cut) or fillet (rounded arc) to top edges
- Reset to original geometry

### Measurement Tools (`M` key)
- Distance mode: click two points to measure
- Face area mode: click a face to display its area

### Command System
- Full undo/redo (`Ctrl+Z` / `Ctrl+Y` or `Ctrl+Shift+Z`)
- Command palette (`Ctrl+K`) for fuzzy search of all commands
- Timeline history panel at the bottom of the viewport

### Project & Export
- Auto-save to localStorage
- Save/load project as `.json`
- Export: STL, OBJ, GLTF, GLB, PNG

### UI
- Properties panel (position, dimensions) for selected objects
- Object list sidebar with visibility toggle
- Context menu (right-click) for rename, duplicate, hide, delete
- Toast notifications for user feedback
- ViewCube and axis triad for camera orientation

## Getting Started

```bash
# Install dependencies
npm install
# or
pnpm install

# Start development server
npm run dev

# Open in browser
open http://localhost:5173/SketchPop/
```

### Build

```bash
npm run build    # Output to dist/
npm run preview  # Preview the built output
```

## Usage

### 1. Sketch Mode (`S`)
1. Click once on the ground plane to set the start point
2. Move the mouse to preview the rectangle
3. Click again to finalize the rectangle

### 2. Extrude Mode (`E`)
1. Click on a sketch shape to start extruding
2. Move the mouse to adjust height
3. Click again to confirm with orange preview

### 3. Confirm / Cancel
- **Confirm**: Right-click or ✓ button
- **Cancel**: ESC key or ✗ button

### 4. Face Extrusion
- Hover over a face of a confirmed solid to highlight it
- Click the face to start extruding from it
- Right-click to confirm

### 5. Select Mode (`V`)
- Click objects to select them
- Drag to box-select multiple objects
- Use transform handles to move / rotate / scale

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Sketch mode |
| `E` | Extrude mode |
| `V` | Select mode |
| `W` | Cycle display modes |
| `G` | Toggle grid snap |
| `M` | Cycle measurement modes |
| `P` | Toggle perspective/orthographic camera |
| `Ctrl+K` | Open command palette |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Delete` | Delete selected object |
| `ESC` | Cancel current operation |

## Tech Stack

- **Three.js** v0.178+ — 3D rendering
- **Vite** v6+ — build tool and dev server
- **ES6 modules** — modular architecture
- **WebGL** — hardware-accelerated rendering
- **three-csg-ts** — CSG boolean operations

## File Structure

```
SketchPop/
├── src/
│   ├── index.html                  # Main HTML (UI layout)
│   ├── index.js                    # Application entry point
│   ├── styles.css                  # Stylesheet
│   ├── SceneManager.js             # Three.js scene, camera, renderer, lighting
│   ├── StateManager.js             # Application state and mode switching
│   ├── InteractionManager.js       # Mouse/keyboard events, manager orchestration
│   ├── ExtrusionManager.js         # Extrusion logic and face detection
│   ├── SelectionManager.js         # Object selection management
│   ├── TransformManager.js         # Move / rotate / scale with handles
│   ├── ObjectListManager.js        # Sidebar object list
│   ├── StatusBarManager.js         # Status bar display
│   ├── CommandManager.js           # Undo/redo command pattern
│   ├── PropertyPanelManager.js     # Right-side property panel
│   ├── HistoryPanelManager.js      # Timeline history panel
│   ├── CommandPaletteManager.js    # Ctrl+K fuzzy command launcher
│   ├── DisplayModeManager.js       # Shaded / wireframe / xray display modes
│   ├── GridSnapManager.js          # Grid snapping for sketch points
│   ├── ProjectManager.js           # Save / load project (JSON + localStorage)
│   ├── ExportManager.js            # STL / OBJ / GLTF / GLB / PNG export
│   ├── ContextMenuManager.js       # Right-click context menu
│   ├── BooleanManager.js           # CSG boolean operations
│   ├── BoxSelectManager.js         # Drag-to-select multiple objects
│   ├── EdgeSelectionManager.js     # Edge hover and selection
│   ├── FilletManager.js            # Chamfer and fillet operations
│   ├── MeasurementManager.js       # Distance and face-area measurement
│   ├── ToastManager.js             # Toast notifications
│   ├── SketchRectangle.js          # Rectangle sketch and extrusion
│   ├── CustomExtruder.js           # Manual geometry (per-face vertices/normals/colors)
│   ├── Box.js                      # Confirmed solid mesh management
│   ├── Rectangle.js                # Base rectangle class
│   ├── ViewCube.js                 # 3D navigation cube
│   ├── AxisTriad.js                # X/Y/Z axis indicator
│   ├── handlers/
│   │   ├── domHandlers.js          # DOM side-effect handlers
│   │   ├── selectionHandler.js     # Selection side-effect handlers
│   │   ├── stateHandler.js         # State-change side-effect handlers
│   │   ├── threeHandlers.js        # Three.js side-effect handlers
│   │   └── transformHandler.js     # Transform operation handlers
│   └── utils/
│       ├── domUtils.js             # DOM pure utilities
│       ├── geometry.js             # Geometry math pure functions
│       ├── selectionUtils.js       # Selection pure utilities
│       ├── stateUtils.js           # State pure utilities
│       └── threeUtils.js           # Three.js pure utilities
├── docs/
│   ├── ARCHITECTURE.md             # Architecture documentation
│   ├── API_REFERENCE.md            # API reference
│   ├── REFACTORING_PROGRESS.md     # Refactoring history
│   ├── CAD_UX_IMPROVEMENTS.md      # UX improvement proposals
│   └── UX_BACKLOG.md               # UX backlog
├── vite.config.js                  # Vite config (base: /SketchPop/, root: src)
├── package.json
├── pnpm-lock.yaml
├── README.md
└── CLAUDE.md                       # Guidance for Claude Code
```

## Browser Requirements

- Modern browser (Chrome, Firefox, Safari, Edge)
- WebGL support
- ES6+ with module support

## License

This project is created for educational and learning purposes.
