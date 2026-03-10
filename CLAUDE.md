# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SketchPop is a web-based 3D modeling application that runs in the browser. It implements a sketch-and-extrude workflow using Three.js, allowing users to draw 2D rectangles on a ground plane and extrude them into 3D solids. The project uses Vite as the build tool and follows a modular ES6 architecture.

**Live site:** https://yuubae215.github.io/SketchPop/

## Architecture

**Core Managers:**
- `SceneManager`: Three.js scene, camera, renderer, and lighting setup
- `StateManager`: Application-wide state and mode switching (sketch / extrude)
- `InteractionManager`: Unified mouse and keyboard event handling
- `ExtrusionManager`: Extrusion logic, face detection via Raycasting, face highlighting
- `SelectionManager`: Object selection/deselection and visual feedback
- `ObjectListManager`: Sidebar object list management
- `TransformManager`: Move / rotate / scale with visual handles
- `StatusBarManager`: Status bar display

**Geometry:**
- `SketchRectangle`: Rectangle sketch on the ground plane and extrusion into 3D
- `CustomExtruder`: Manual geometry generation with per-face independent vertices, normals, and colors
- `Box`: Confirmed solid mesh management
- `Rectangle`: Base rectangle class

**UI Helpers:**
- `ViewCube`: 3D navigation cube for camera orientation
- `AxisTriad`: X/Y/Z axis indicator

**handlers/ directory:** Event handlers separated by feature domain
**utils/ directory:** Reusable utility functions

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
- `StateManager`: Sketch/extrude mode state management
