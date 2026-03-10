# SketchPop - Intuitive 3D Modeling

A web-based 3D modeling application that creates 3D models from 2D sketches using an intuitive sketch-and-extrude workflow. Built with Three.js and Vite.

**Live Demo:** https://yuubae215.github.io/SketchPop/

## Overview

SketchPop lets you start with simple 2D rectangle sketches on a ground plane and extrude them into 3D shapes — bringing the core sketch-and-extrude experience of CAD software to the browser.

## Features

### Sketch
- Draw 2D rectangles on the ground plane
- Click-and-drag for intuitive creation
- Real-time preview while drawing

### Extrude
- Extrude 2D sketches into 3D shapes
- Extrude additional faces from existing solid faces
- Adjust height by moving the mouse
- Orange preview during pending confirmation

### Interaction
- Right-click or ✓ button to confirm
- ESC or ✗ button to cancel
- Middle-click drag to orbit the camera
- Scroll wheel to zoom

### Transform
- Move, rotate, and scale confirmed objects
- Visual transform handles

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

### 1. Sketch Mode
1. Click once on the ground plane to set the start point
2. Move the mouse to preview the rectangle
3. Click again to finalize the rectangle

### 2. Extrude Mode
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

## Tech Stack

- **Three.js** v0.178+ — 3D rendering
- **Vite** v6+ — build tool and dev server
- **ES6 modules** — modular architecture
- **WebGL** — hardware-accelerated rendering

## File Structure

```
SketchPop/
├── src/
│   ├── index.html              # Main HTML (UI layout)
│   ├── index.js                # Application entry point
│   ├── styles.css              # Stylesheet
│   ├── SceneManager.js         # Three.js scene, camera, renderer, lighting
│   ├── StateManager.js         # Application state and mode switching
│   ├── InteractionManager.js   # Mouse and keyboard event handling
│   ├── ExtrusionManager.js     # Extrusion logic and face detection
│   ├── SelectionManager.js     # Object selection management
│   ├── ObjectListManager.js    # Sidebar object list
│   ├── TransformManager.js     # Move / rotate / scale with handles
│   ├── StatusBarManager.js     # Status bar display
│   ├── SketchRectangle.js      # Rectangle sketch and extrusion
│   ├── CustomExtruder.js       # Manual geometry generation (per-face vertices)
│   ├── Box.js                  # Confirmed solid mesh
│   ├── Rectangle.js            # Base rectangle class
│   ├── ViewCube.js             # 3D navigation cube
│   ├── AxisTriad.js            # X/Y/Z axis indicator
│   ├── handlers/
│   │   ├── domHandlers.js      # DOM event handlers
│   │   ├── selectionHandler.js # Selection event handlers
│   │   ├── stateHandler.js     # State change handlers
│   │   ├── threeHandlers.js    # Three.js object handlers
│   │   └── transformHandler.js # Transform operation handlers
│   └── utils/
│       ├── domUtils.js         # DOM utilities
│       ├── geometry.js         # Geometry math utilities
│       ├── selectionUtils.js   # Selection utilities
│       ├── stateUtils.js       # State utilities
│       └── threeUtils.js       # Three.js utilities
├── vite.config.js              # Vite config (base: /SketchPop/, root: src)
├── package.json
├── pnpm-lock.yaml
├── README.md
├── CLAUDE.md                   # Guidance for Claude Code
└── API_REFERENCE.md            # API reference
```

## Browser Requirements

- Modern browser (Chrome, Firefox, Safari, Edge)
- WebGL support
- ES6+ with module support

## License

This project is created for educational and learning purposes.
