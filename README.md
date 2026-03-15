# SketchPop — Sketch. Extrude. Pop into 3D.

> **Bring your ideas to life in the browser — no software to install, no learning curve.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Try%20it%20now-brightgreen?style=for-the-badge)](https://yuubae215.github.io/SketchPop/)

SketchPop is a **web-based 3D modeling app** powered by Three.js. Draw rectangles, pull them into solids, combine shapes with boolean ops, and export your models — all without leaving your browser tab.

---

## What can you build?

Draw → Extrude → Done. That's the whole loop.

- Architectural massing models
- Furniture rough layouts
- Game asset blockouts
- Quick concept explorations
- Anything boxy and awesome

---

## Features

### ✏️ Sketch & Extrude
- Click and drag to draw 2D rectangles on the ground plane
- Real-time preview as you draw and extrude
- Extrude from **any face** of an existing solid — not just the ground
- Set a **construction plane** on any face (`Space`) to sketch directly on it

### ⚡ Transform
- Move, rotate, and scale with interactive visual handles
- **Box select** multiple objects with a drag
- **Edge selection** mode for precision work

### 🎨 Display Modes (`W`)
| Mode | Look |
|------|------|
| Shaded | Clean opaque surfaces |
| Shaded + Edges | Wireframe overlay on shaded |
| Wireframe | Lines only |
| X-Ray | See through everything |

### 🔲 Grid Snap (`G`)
Snap sketch points and extrusion heights to a configurable grid for pixel-perfect precision.

### ➕ Boolean Operations
Combine two shapes into one with **Union**, **Difference**, or **Intersect** — powered by CSG.

### 🔧 Fillet & Chamfer
Round off or bevel top edges in seconds. Reset to original geometry anytime.

### 📐 Measurements (`M`)
Click two points for a **distance measurement**, or click a face to see its **area** — annotated right in the viewport.

### 🕹️ Command System
- Full undo/redo (`Ctrl+Z` / `Ctrl+Y`)
- **Command palette** (`Ctrl+K`) — fuzzy-search every action
- **Timeline panel** for a visual command history

### 💾 Project & Export
- Auto-save to localStorage — never lose your work
- Save and reload projects as `.json`
- Export finished models as **STL, OBJ, GLTF, GLB, or PNG**

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Sketch mode |
| `E` | Extrude mode |
| `V` | Select mode |
| `W` | Cycle display modes |
| `G` | Toggle grid snap |
| `M` | Cycle measurement modes |
| `P` | Toggle perspective / orthographic |
| `Space` | Set construction plane from hovered face |
| `L` | Select edge loop (edge-select mode) |
| `Ctrl+K` | Open command palette |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Delete` | Delete selected object |
| `Esc` | Cancel / reset construction plane |

---

## Getting Started

```bash
# Install dependencies
npm install   # or: pnpm install

# Start development server
npm run dev

# Open in browser
open http://localhost:5173/SketchPop/
```

### Build for production

```bash
npm run build    # Output to dist/
npm run preview  # Preview the built output
```

---

## Tech Stack

| | |
|---|---|
| **Three.js** v0.178+ | 3D rendering & scene graph |
| **Vite** v6+ | Lightning-fast build tool |
| **three-csg-ts** | CSG boolean operations |
| **WebGL** | Hardware-accelerated rendering |
| **ES6 modules** | Clean, modular architecture |

---

## Browser Requirements

Modern browser with WebGL support — Chrome, Firefox, Safari, or Edge.

---

## License

Created for educational and learning purposes.
