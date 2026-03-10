# SketchPop UX Improvement Backlog

Reference: Blender, Fusion 360, FreeCAD UX patterns.

---

## Implemented

### [DONE] Auto-flow: Sketch completion triggers extrusion immediately
After finishing a 2D sketch, the app automatically switches to extrude mode and starts height adjustment — no manual mode switch required. Click to confirm, Esc to cancel.

### [DONE] Remove confirmation step (pending state)
Extrusion (both sketch and face) now confirms on click, without an intermediate orange "pending" state or confirm/cancel buttons. Right-click is an alternative confirm. Esc cancels.

---

## Backlog

### [TODO] Context-sensitive operations (mode-free interaction)
**Priority: High**

Replace explicit mode switching with context-aware behavior:

| Hover / Click target | Action |
|---|---|
| Empty ground plane | Start sketch directly |
| Unextruded sketch | Show extrude handle |
| Extruded face | Show face-extrude handle |
| Extruded object body | Show move/rotate gizmo |

Mode buttons become secondary/optional. Removes cognitive overhead of "which mode am I in?".

---

### [TODO] Unified toolbar / UI consolidation
**Priority: High**

Current state: mode buttons (right sidebar), selection toggle, projection toggle, home button all float independently on the canvas — no visual grouping.

Proposed:
- Top header bar: file actions on left, active mode indicator in center, view controls (projection, fit) on right
- Right panel: slides in on object selection, shows properties (dimensions, position) with direct numeric input
- Remove floating canvas UI elements; keep viewport clean

Reference: Fusion 360 toolbar layout.

---

### [TODO] Numeric input during operations
**Priority: Medium**

While extruding, allow typing a value to set exact height:
- `100` → confirm at height 100 (in current units)
- Works for both sketch extrusion and face extrusion

Reference: Blender transform input (G → Z → 100 → Enter).

---

### [TODO] Context menu on right-click (non-extrude state)
**Priority: Medium**

Right-click on an object (outside of active extrusion):
- Delete
- Duplicate
- Select face(s)

Right-click on empty space:
- Start sketch here
- Reset view

Currently right-click is only used to confirm extrusion; repurpose it for contextual actions.

---

### [TODO] Object list improvements
**Priority: Low**

- Show object dimensions inline (W × D × H)
- Drag-and-drop reordering
- Visibility toggle per object (eye icon)
- Rename on double-click

Reference: Blender outliner, Fusion 360 browser tree.

---

### [TODO] Undo / Redo
**Priority: High**

Ctrl+Z / Ctrl+Y (or Cmd+Z / Cmd+Shift+Z on Mac).

Minimum viable: undo last sketch creation, last extrusion, last delete.

---

### [TODO] Grid snapping
**Priority: Medium**

Snap sketch corners and extrusion heights to a configurable grid (e.g. 0.5 unit intervals). Toggle with a toolbar button or hotkey.

---

### [TODO] Named views / standard camera presets
**Priority: Low**

Numpad-style camera shortcuts (Blender convention):
- `1` → Front
- `3` → Right
- `7` → Top
- `0` → Perspective home

---
