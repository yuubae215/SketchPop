# SketchPop UX Improvement Backlog

Reference: Blender, Fusion 360, FreeCAD, Onshape UX patterns.
Source of improvements: `docs/CAD_UX_IMPROVEMENTS.md`

---

## Implemented ✅

### [DONE] Auto-flow: Sketch completion triggers extrusion immediately
After finishing a 2D sketch, the app automatically switches to extrude mode and starts height adjustment. Click to confirm, Esc to cancel.

### [DONE] Remove confirmation step (pending state)
Extrusion confirms on click without an intermediate orange "pending" state. Right-click is an alternative confirm.

### [DONE] ViewCube — `ViewCube.js`
Interactive 3D cube (top-right). Each face/edge/corner snaps to the corresponding standard view. Synced to main camera.

### [DONE] AxisTriad — `AxisTriad.js`
X/Y/Z axis indicator (bottom-left), follows camera rotation.

### [DONE] StatusBar — `StatusBarManager.js`
Bottom bar showing current mode, object count, and operation hints.

### [DONE] Home / Fit-all — `F` key, Home button
Fits all objects into the camera view.

### [DONE] Background gradient
Scene renders a gradient background for depth perception.

### [DONE] Undo / Redo — Sprint 2026-03-10
`Ctrl+Z` / `Cmd+Z` undoes the last action (sketch creation, extrusion confirm, object deletion).
Implementation: Command pattern (`CommandManager.js`) with a 50-deep undo stack.

### [DONE] Numeric input during operations — Sprint 2026-03-10
While extruding, type digits + Enter to set an exact height. HUD overlay shows the typed value.
Covers both sketch extrusion and face extrusion.

### [DONE] Named views / standard camera presets — Sprint 2026-03-10
- `1` → Front view
- `3` → Right view
- `7` → Top view

---

## Backlog

### Priority key
🔴 High — blocks common workflows
🟠 Medium — noticeable UX gap
🟢 Low — polish / power-user feature

---

### 🔴 [TODO] Context-sensitive operations (mode-free interaction)

Replace explicit mode switching with context-aware behavior:

| Hover / Click target | Action |
|---|---|
| Empty ground plane | Start sketch directly |
| Unextruded sketch | Show extrude handle |
| Extruded face | Show face-extrude handle |
| Extruded object body | Show move/rotate gizmo |

Mode buttons become secondary/optional.
Reference: Onshape, Fusion 360.

---

### 🔴 [TODO] Property panel (right slide-in panel)

Show selected object's properties in a panel that slides in on selection:
- **Transform**: position (X, Y, Z), rotation, scale — numeric input fields
- **Dimensions**: W × D × H with live update on input
- **Appearance**: color picker, opacity slider
- **Info**: name, type

Replaces the need to use TransformControls gizmo for precise values.
Reference: Fusion 360 right panel, Blender N-panel.

---

### 🔴 [TODO] Redo (`Ctrl+Y` / `Ctrl+Shift+Z`)

`CommandManager.redo()` stub already exists; implement the re-execution path so that undone commands can be reapplied.

---

### 🟠 [TODO] Unified toolbar / UI consolidation

Current state: mode icons, selection toggle, projection toggle, home button float independently.

Proposed layout:
- **Top bar**: file actions left | mode indicator center | view controls right
- **Right panel**: collapses when nothing selected; becomes property panel on selection
- Remove remaining floating canvas elements for a cleaner viewport

Reference: Fusion 360 toolbar.

---

### 🟠 [TODO] Context menu on right-click (non-extrude state)

Right-click on an object:
- Delete, Duplicate, Rename, Hide/Show, Properties

Right-click on empty space:
- Start sketch here, Reset view

Currently right-click only confirms extrusion; extend for contextual actions.

---

### 🟠 [TODO] Grid snapping

Snap sketch corners and extrusion heights to a configurable grid (e.g. 0.5, 1, 5 unit intervals).
Toggle button + hotkey (`G`).
Includes object snap (edge, vertex, face-center) and angle snap (15°, 45°, 90°).

---

### 🟠 [TODO] Duplicate / Mirror

- Duplicate selected object: `Ctrl+D`
- Mirror on X / Y / Z axis
- Linear array: N copies with spacing

Reference: Blender, Fusion 360 mirror/pattern features.

---

### 🟠 [TODO] Export

Supported formats:
- **STL** — 3D printing
- **OBJ** — general exchange
- **GLTF/GLB** — web/game engines
- **PNG** — viewport screenshot

Accessible via a top-bar "File" menu or keyboard shortcut.

---

### 🟠 [TODO] Notification / toast system

Non-blocking toasts (top-right) for user feedback:
- ✅ Success (green): "オブジェクトを作成しました"
- ℹ️ Info (blue): "スケッチモードに切り替えました"
- ⚠️ Warning (yellow): "選択されたオブジェクトがありません"
- ❌ Error (red): "操作に失敗しました"

Auto-dismiss after 3–5 s; stack multiple toasts.

---

### 🟢 [TODO] History / Timeline panel

Visual operation history at the bottom (Fusion 360 style):

```
[ Sketch-1 ] [ Extrude-1 (h=3) ] [ Move-1 ] [ FaceExtrude-1 ]
```

- Click to jump to that state
- Right-click to delete / suppress
- Powered by `CommandManager` undo stack (data already exists)

---

### 🟢 [TODO] Command palette

`Ctrl+K` / `Ctrl+P`: fuzzy-search all commands with keyboard navigation.
Shows shortcut hint next to each result.
Reference: VS Code, Fusion 360 `S` key search.

---

### 🟢 [TODO] Display modes

Toggle via toolbar or hotkey (`W`):
- **Shaded** (current default)
- **Shaded + Edges** — overlay edge lines on solids
- **Wireframe** — outline only
- **X-Ray** — semi-transparent to see through solids

---

### 🟢 [TODO] Object list improvements

- Show dimensions inline (W × D × H)
- Visibility toggle per object (eye icon, `H` key)
- Rename on double-click
- Drag-and-drop reordering

Reference: Blender outliner, Fusion 360 browser.

---

### 🟢 [TODO] Project save / load

- Save scene to JSON (localStorage + file download)
- Load from JSON file
- Auto-save on change
- Recent files list

---

### 🟢 [TODO] Measurement tools

- Distance between two clicked points
- Angle between two edges
- Face area
- Results shown as in-viewport annotations

---

---

## Roadmap (suggested sprint order)

| Sprint | Focus | Items |
|--------|-------|-------|
| Next | Core usability | Context-sensitive ops, Property panel, Redo |
| +1 | Toolbar & feedback | Unified toolbar, Notification system, Duplicate |
| +2 | Data & output | Export, Project save/load, Grid snapping |
| +3 | Power-user | Command palette, History timeline, Display modes |
| +4 | Polish | Object list improvements, Measurement tools |
