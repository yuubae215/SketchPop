# SketchPop UX Improvement Backlog

Reference: Blender, Fusion 360, FreeCAD UX patterns.

---

## Implemented

### [DONE] Auto-flow: Sketch completion triggers extrusion immediately
After finishing a 2D sketch, the app automatically switches to extrude mode and starts height adjustment — no manual mode switch required. Click to confirm, Esc to cancel.

### [DONE] Remove confirmation step (pending state)
Extrusion (both sketch and face) now confirms on click, without an intermediate orange "pending" state or confirm/cancel buttons. Right-click is an alternative confirm. Esc cancels.

### [DONE] Undo / Redo — Sprint 2026-03-10
`Ctrl+Z` / `Cmd+Z` undoes the last action.
Covered operations: sketch creation, sketch extrusion (height confirm), object deletion.
Implementation: Command pattern (`CommandManager.js`) with a 50-deep undo stack.

### [DONE] Numeric input during operations — Sprint 2026-03-10
While extruding, type digits + Enter to set an exact height.
Works for both sketch extrusion and face extrusion.
A HUD overlay confirms the value being typed.
Reference: Blender transform input (G → Z → 100 → Enter).

### [DONE] Named views / standard camera presets — Sprint 2026-03-10
Numpad-style camera shortcuts (Blender convention):
- `1` → Front view
- `3` → Right view
- `7` → Top view

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

### [TODO] Grid snapping
**Priority: Medium**

Snap sketch corners and extrusion heights to a configurable grid (e.g. 0.5 unit intervals). Toggle with a toolbar button or hotkey.

---
