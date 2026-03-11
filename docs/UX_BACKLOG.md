# SketchPop UX Improvement Backlog

Reference: Blender, Fusion 360, FreeCAD, Onshape, **Plasticity** UX patterns.
Source of improvements: `docs/CAD_UX_IMPROVEMENTS.md`
Plasticity docs: https://doc.plasticity.xyz/

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

### [DONE] Redo (`Ctrl+Y` / `Ctrl+Shift+Z`) — Sprint 2026-03-11
`CommandManager.redo()` fully implemented. All command types (AddSketch, Extrude, Delete, FaceExtrude) support both undo and redo. Redo stack is cleared on any new action.

### [DONE] Property panel (right slide-in panel) — Sprint 2026-03-11
Selecting any extruded object slides in a panel from the right showing:
- **Name** (object type)
- **Position** X / Y / Z — editable, moves the mesh live
- **Dimensions** W × D (read-only) and H (editable, re-extrudes)

Implemented in `PropertyPanelManager.js`. Shown on click-select, hidden on Escape or deselect. Updates during TransformControls drag.

### [DONE] Unified toolbar / UI consolidation — Sprint 2026-03-11
Floating `#top-controls` (P/O/Home) and `#mode-toolbar` (Sketch/Extrude/Select/Clear) were removed.
Replaced by a single `#top-bar` spanning the full width:
- **Left**: App logo + Undo / Redo buttons (enabled/disabled state via CommandManager)
- **Center**: Sketch / Extrude / Select mode buttons (active highlight)
- **Right**: Duplicate + Clear + separator + P / O / Home view controls

CSS classes: `#top-bar`, `.tb-btn`, `.tb-mode-btn`, `.top-bar__section`.
Mobile: logo and separators collapse; buttons remain reachable.

### [DONE] Notification / toast system — Sprint 2026-03-11
`ToastManager.js` — singleton that creates accessible, stacking toasts in `#toast-container`.
- `ToastManager.show(message, type, duration)` — type: success | info | warning | error
- Auto-dismiss after 3.5 s (configurable); manual × close button
- CSS enter/leave animations; left-border accent colour per type
- Integrated in: object creation, deletion, duplication, camera projection switch, clear-all, selection warnings

### [DONE] Duplicate (Ctrl+D) — Sprint 2026-03-11
`Ctrl+D` (or ⌘D) duplicates the currently selected extruded object:
- Offset by +1.5 on X and Z to avoid stacking
- Duplicate auto-selected and property panel opened
- Full undo/redo support via `DuplicateCommand` in `CommandManager`
- Toolbar button in top-bar right section (enabled only when object selected)
- Warning toast if no object selected or object not yet extruded

### [DONE] Context-sensitive operations (mode-free interaction) — Sprint 2026-03-11
All clicks are now context-aware regardless of active mode:

| What's under cursor | Action on click |
|---|---|
| Empty ground plane | Start sketch |
| Unextruded 2D sketch | Start extrusion |
| Extruded face (highlighted) | Start face extrusion |
| Extruded object body | Select + show property panel |

Face highlight shown in all modes (not only extrude mode). Cursor shape reflects context (crosshair / ns-resize / pointer / grab). Mode buttons remain for explicit overrides.

---

## Backlog

### Priority key
🔴 High — blocks common workflows
🟠 Medium — noticeable UX gap
🟢 Low — polish / power-user feature

---

### ✅ [DONE] Unified toolbar / UI consolidation

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

### ✅ [DONE] Grid snapping — Sprint 2026-03-11

`GridSnapManager.js` — snaps sketch corners and extrusion heights to a 1-unit grid.
- Toggle via toolbar button or `G` hotkey
- Visual indicator ("Snap 1.0") in the status bar when active
- Snap applied to sketch start/end points (x/z) and extrusion height

---

### ✅ [DONE] Duplicate (Ctrl+D)

- Duplicate selected object: `Ctrl+D`
- Mirror on X / Y / Z axis
- Linear array: N copies with spacing

Reference: Blender, Fusion 360 mirror/pattern features.

---

### ✅ [DONE] Export — Sprint 2026-03-11

`ExportManager.js` — exports all extruded objects via a top-bar dropdown.
- **STL** — 3D printing (text format)
- **OBJ** — general exchange
- **GLTF** — web/game engines (JSON)
- **GLB** — web/game engines (binary)
- **PNG** — viewport screenshot (canvas capture)

Accessible via the Export button (↓ icon) in the top-bar right section.

---

### ✅ [DONE] Notification / toast system

Non-blocking toasts (top-right) for user feedback:
- ✅ Success (green): "オブジェクトを作成しました"
- ℹ️ Info (blue): "スケッチモードに切り替えました"
- ⚠️ Warning (yellow): "選択されたオブジェクトがありません"
- ❌ Error (red): "操作に失敗しました"

Auto-dismiss after 3–5 s; stack multiple toasts.

---

### ✅ [DONE] History / Timeline panel — Sprint 2026-03-11

`HistoryPanelManager.js` — shows operation history as chips at the bottom of the viewport.

```
[ ✏️ Sketch ] [ ⬆️ Extrude ] [ ⧉ Duplicate ] ▎ [ ⬆️ Extrude (redo, greyed) ]
```

- Toggle via `H` key or toolbar button (clock icon)
- Click any chip to jump to that state (undo/redo to the target)
- Orange cursor marker shows the current state
- Future (redo) steps shown as dashed chips at reduced opacity
- Auto-shows on first action; hides when history is empty

---

### ✅ [DONE] Command palette — Sprint 2026-03-11

`CommandPaletteManager.js` — fuzzy-search command launcher.

- `Ctrl+K` (or toolbar 🔍 button) opens the palette
- Fuzzy-matches all registered commands (modes, views, display, edit, file, export)
- Keyboard navigation: `↑↓` select, `Enter` execute, `Esc` close
- Matched characters highlighted in orange
- Shortcut hint shown next to each result

---

### ✅ [DONE] Display modes — Sprint 2026-03-11

`DisplayModeManager.js` — cycles through 4 display modes.

- `W` key or toolbar eye icon cycles through modes
- **Shaded** — default opaque rendering
- **Shaded + Edges** — opaque + EdgesGeometry overlay (20° threshold)
- **Wireframe** — `material.wireframe = true`
- **X-Ray** — semi-transparent (`opacity 0.35`, `depthWrite false`)
- Toast notification shows current mode name on change
- Toolbar button highlights (orange) when not in default shaded mode
- All existing meshes are updated when mode changes

---

### ✅ [DONE] Object list improvements — Sprint 2026-03-11

- Dimensions inline (W × D × H) under each item name
- Visibility toggle eye icon per item (hover to reveal)
- Double-click to rename inline (Enter / Escape)
- Custom name stored as `sketch.objectName`

Reference: Blender outliner, Fusion 360 browser.

---

### ✅ [DONE] Project save / load — Sprint 2026-03-11

`ProjectManager.js` — serialises and restores the scene.
- **Save** (`Ctrl+S` / toolbar button) — downloads `sketchpop.json`
- **Load** (toolbar button) — opens a file-picker and restores all objects
- **Auto-save** — debounced write to `localStorage` after every create / delete / duplicate
- Serialises: `startPoint`, `endPoint`, `isExtruded`, `extrudeHeight`, `objectId`

---

### ✅ [DONE] Measurement tools — Sprint 2026-03-11

`MeasurementManager.js` — in-viewport measurement annotations.

- **Distance mode** (`M` key / toolbar 📐) — click two 3D points → blue dimension line + distance label
- **Face area mode** (`M` again) — click an extruded face → orange area annotation
- Preview line tracks cursor while awaiting second click point
- Escape clears active measurement; cycling back to `off` clears all
- Command palette entries: Measure Distance, Measure Face Area, Clear Measurements

---

---

## Roadmap (suggested sprint order)

| Sprint | Focus | Items |
|--------|-------|-------|
| ✅ Done | Core usability | Context-sensitive ops, Property panel, Redo |
| ✅ Done | Toolbar & feedback | Unified toolbar, Notification system, Duplicate |
| ✅ Done | Data & output | Export (STL/OBJ/GLTF/PNG), Project save/load, Grid snapping |
| ✅ Done | Power-user | Command palette, History timeline, Display modes |
| ✅ Done | Polish | Context menu, Object list improvements, Measurement tools |
| **Next** | **Plasticity-inspired** | **Edge selection, Fillet/Chamfer, Boolean ops, Axis constraints, Box select** |

---

## Next Sprint Plan — Polish (2026-03-12 予定)

### 優先順位と実装方針

| # | 項目 | 優先度 | 見積 | 担当ファイル |
|---|------|--------|------|-------------|
| 1 | Context menu (right-click) | 🟠 Medium | S | `ContextMenuManager.js` |
| 2 | Object list improvements | 🟢 Low | M | `ObjectListManager.js` 拡張 |
| 3 | Measurement tools | 🟢 Low | L | `MeasurementManager.js` |

---

### 1. Context menu (`ContextMenuManager.js`)

**トリガー:** 右クリック（押拡中以外の状態）

**オブジェクト上で右クリック:**
```
┌──────────────────┐
│ ✏️ Rename         │
│ 📋 Duplicate      │
│ 👁 Hide / Show    │
│ ─────────────── │
│ 🗑️ Delete         │
└──────────────────┘
```

**空白領域で右クリック:**
```
┌──────────────────┐
│ ✏️ Sketch here    │
│ 🏠 Reset view     │
└──────────────────┘
```

**実装ポイント:**
- `InteractionManager.onRightClick()` をコンテキスト判定に拡張
- 押拡中（extrude / face-extrude）は既存の confirm 動作を維持
- Rename: インライン入力（`<input>` をオーバーレイ表示）
- Hide/Show: `mesh.visible` トグル + objectList アイコン更新
- `Escape` / 外クリックで閉じる

---

### 2. Object list improvements (`ObjectListManager.js` 拡張)

**現状:** 名前のみのリスト

**追加内容:**

| 機能 | 実装 |
|------|------|
| 寸法表示 (W×D×H) | `sketch.getBounds()` から計算、リストアイテムに小テキスト追加 |
| 表示切替 (👁) | 各アイテムに目アイコンボタン、`mesh.visible` トグル |
| ダブルクリックでリネーム | `contenteditable` または `<input>` インライン編集 |
| ドラッグ&ドロップ並び替え | HTML5 Drag API / `stateManager.sketches` 配列の順序変更 |

**キーボード:** `H` キーは現在 HistoryPanel に割り当て済みのため、オブジェクト非表示は右クリックメニュー経由のみとする

---

### 3. Measurement tools (`MeasurementManager.js`)

**機能一覧:**

| ツール | 操作 | 表示 |
|--------|------|------|
| 距離計測 | 2点クリック | スプライト注釈 + 寸法線 |
| 面積計測 | 面をクリック | 面上にスプライト |
| クリア | `M` キー または Clear ボタン | 全注釈削除 |

**実装ポイント:**
- 計測モードは `StateManager` に `'measure'` モードを追加、またはフラグ管理
- 注釈は `THREE.Sprite` + `CanvasTexture`（既存の寸法線実装を流用）
- 面積は `THREE.Triangle` で面ポリゴンを分割して積算
- 計測結果はツールバーに専用トグルボタンを追加

---

### 技術的注意点

- **Context menu と H キー競合なし:** ContextMenu は右クリック起動、History panel は `H` キー
- **Object list の `H` キー:** UX_BACKLOG 旧仕様には `H` キーで hide と書かれていたが、History panel に割り当て済みのため **右クリックメニューの Hide/Show のみ** とする
- **Measurement の寸法線:** `InteractionManager.createSketchExtrusionDimensionText()` の実装を `MeasurementManager` に切り出して共通化することを検討

---

---

## Plasticity UX Research — 2026-03-11

> **調査元:** https://doc.plasticity.xyz/
> Plasticity は NURBS ベースの CAD ツール（アーティスト向け）。以下の UX パターンを SketchPop に段階的に取り込む。

---

### Plasticity で学んだ主要 UX 概念

#### A. インタラクション設計

| 概念 | Plasticity での実装 | SketchPop への応用 |
|------|-------------------|------------------|
| Context-aware suggestions | 選択物に応じてコマンドバーが変化 | 選択モードに応じてコンテキストメニュー内容を変える（既実装） |
| Command Palette (`F` key) | `F` で開くファジー検索パレット | `Ctrl+K` で実装済み |
| Radial / Pie Menu | 右クリックで放射状メニュー | 将来: 現在の線形コンテキストメニューを放射状に変換 |
| Keyboard axis lock (`X/Y/Z`) | 移動中に `X/Y/Z` を押すと軸拘束 | TransformControls に軸拘束キーを追加 |
| Selection mode switching | Object / Face / Edge / Vertex | Edge 選択モードを追加（Fillet のため） |

#### B. ジオメトリ操作

| 機能 | Plasticity | SketchPop への応用 |
|------|-----------|------------------|
| Fillet / Chamfer | エッジを選択して R キーでフィレット、正値=丸め・負値=面取り | `FilletManager.js` — 選択エッジを丸める/面取り |
| Boolean (Union / Difference / Intersect) | 2つのソリッドを選択して操作 | `BooleanManager.js` — 重なる2オブジェクトを結合/減算/交差 |
| Offset Face | 面を選択して `Q` でオフセット | 現在の Face Extrusion を Offset Face に相当 (既実装) |
| Sweep | プロファイルをスパイン(曲線)に沿ってスイープ | 将来: `SweepManager.js` |
| Loft | 2つのプロファイルを補間 | 将来: `LoftManager.js` |

#### C. 選択システム

| 機能 | Plasticity | SketchPop への応用 |
|------|-----------|------------------|
| Box selection (drag) | ドラッグで矩形選択 | `BoxSelectManager.js` — ドラッグ矩形で複数オブジェクト選択 |
| Loop selection | エッジ/フェースのループ選択 | 将来 (Edge 選択後) |
| Edge selection mode | エッジをクリックして選択 | Edge ハイライト + 選択モード追加 |

#### D. スナップ / 作図補助

| 機能 | Plasticity | SketchPop への応用 |
|------|-----------|------------------|
| Temporary reference lines (`Shift`) | Shift で一時参照線生成 | スケッチ中に Shift で水平/垂直スナップ |
| Angle snap | 角度でスナップ | 将来 |
| Construction plane | 面/エッジから作図平面を作成 | `ConstructionPlaneManager.js` — 既存面上で Sketch 可能に |

#### E. ナビゲーション

| 機能 | Plasticity | SketchPop での状態 |
|------|-----------|-----------------|
| Middle mouse = orbit | 標準 | OrbitControls で実装済み |
| Right mouse = pan | 標準 | 現在は right-click = context menu (競合なし: ドラッグのみ pan) |
| Numpad views | 1/3/7 で標準ビュー | 実装済み |
| Rotate around cursor | カーソル中心で回転 | OrbitControls のデフォルト動作 |

---

## Next Sprint Plan — Plasticity-inspired (2026-03-12+)

### 優先順位

| # | 項目 | 優先度 | 見積 | 担当ファイル | Plasticity 対応機能 |
|---|------|--------|------|-------------|-------------------|
| 1 | Axis constraints (X/Y/Z during transform) | 🔴 High | S | `TransformManager.js` 拡張 | X/Y/Z axis lock |
| 2 | Box selection (drag-select) | 🟠 Medium | M | `BoxSelectManager.js` | Box selection |
| 3 | Edge selection + highlight | 🟠 Medium | M | `EdgeSelectionManager.js` | Edge selection mode |
| 4 | Fillet / Chamfer edges | 🟠 Medium | L | `FilletManager.js` | Fillet (`R` key) |
| 5 | Boolean operations (Union/Difference/Intersect) | 🟠 Medium | L | `BooleanManager.js` | Boolean ops |
| 6 | Construction plane from face | 🟢 Low | L | `ConstructionPlaneManager.js` | Construction planes |

---

### 1. Axis constraints (`X`/`Y`/`Z` key during transform)

**Plasticity パターン:** 移動中に `X`/`Y`/`Z` を押すと対応軸のみ移動可能に。

**実装方針:**
- `TransformManager` の `handleKeyboardShortcut` を拡張
- `transformControls.showX/showY/showZ` + `transformControls.axis` を切替
- キーを再押しするとリセット
- ステータスバーに "Locked to X-axis" 等を表示

```
X → TransformControls を X 軸拘束
Y → TransformControls を Y 軸拘束
Z → TransformControls を Z 軸拘束
X/Y/Z (再押し) → 拘束解除
```

---

### 2. Box selection (`BoxSelectManager.js`)

**Plasticity パターン:** マウスドラッグで矩形を描き、内部に含まれるオブジェクトを選択。

**実装方針:**
- `canvas` 上でマウスダウン → ドラッグ → マウスアップ
- ドラッグ中に半透明の矩形オーバーレイを表示（HTML div）
- マウスアップ時に矩形内のオブジェクトを Frustum カリングで抽出
- Shift との組み合わせで追加選択
- Select モード時のみ有効

```html
<div id="box-select-rect" style="position:absolute; border:1px dashed #ff9500; background:rgba(255,149,0,0.08); pointer-events:none; display:none;"></div>
```

---

### 3. Edge selection + highlight

**Plasticity パターン:** フェース選択と同様に、エッジをホバー/クリックで選択。

**実装方針:**
- `EdgeSelectionManager.js` — `EdgesGeometry` を利用したレイキャスト
- エッジをホバーすると黄色ハイライト
- クリックで選択 (選択エッジを orange に)
- 選択済みエッジは Fillet/Chamfer コマンドの入力として使用

**注意:** Three.js では Line のレイキャストは `raycaster.params.Line.threshold` で感度調整が必要

---

### 4. Fillet / Chamfer (`FilletManager.js`)

**Plasticity パターン:**
- エッジを選択して `R` キー
- 正値 → Fillet (角丸め)、負値 → Chamfer (面取り)
- リアルタイムプレビューで半径を変更

**SketchPop での実装方針:**
- CustomExtruder が生成する Box ジオメトリは頂点が独立しているため、Fillet は頂点位置を直接修正
- 上面の4つの角に対して、選択エッジに隣接する頂点をオフセット
- Chamfer: 各コーナー頂点を削除して斜面ポリゴンを追加
- Fillet: 曲面近似として複数セグメントで代替

**制約:** CustomExtruder の現実装では複雑なトポロジー変更が困難。まずは上面コーナーの Chamfer から着手。

---

### 5. Boolean operations (`BooleanManager.js`)

**Plasticity パターン:** 2つのソリッドを選択し Union/Difference/Intersect を実行。

**Three.js での実装選択肢:**
1. **ThreeBSP (CSG.js)** — `three-bsp` または `three-csg-ts` パッケージ
2. **手動実装** — 複雑すぎるため非推奨

**推奨:** `three-csg-ts` (TypeScript 対応、Three.js r152+ 対応)

```js
import { CSG } from 'three-csg-ts';
const result = CSG.union(meshA, meshB);   // Union
const result = CSG.subtract(meshA, meshB); // Difference
const result = CSG.intersect(meshA, meshB); // Intersect
```

**UI:** 2つのオブジェクトを選択 (Shift+クリック) → コンテキストメニュー or コマンドパレットで操作選択

---

### 6. Construction plane from face

**Plasticity パターン:** 面を選択して `Space` キーで作図平面を作成。以降のスケッチがその面上に配置される。

**実装方針:**
- `ConstructionPlaneManager.js` — 選択面の法線と中心から作図平面を定義
- `StateManager.constructionPlane` プロパティを追加
- スケッチ開始時に地面ではなく construction plane 上にレイキャスト
- 現在の面を反映するグリッドオーバーレイを描画
- `Esc` で地面に戻す

**制約:** 現在の OrbitControls は Y=0 平面前提のため、カメラ操作とスナップの調整が必要

---

### 技術的注意点

- **Axis constraints:** Three.js の `TransformControls` は `showX/Y/Z` プロパティと `setMode()` で軸拘束可能
- **Box select と TransformControls 競合:** TransformControls が active の間は box select を無効にする
- **CSG ライブラリ:** `three-csg-ts` は npm install で追加、サイズは ~20KB gzip
- **Edge highlight:** `EdgesGeometry` は既に `DisplayModeManager` で利用済み。同一ロジックを流用
- **Construction plane:** Three.js の `Plane` クラスと `Raycaster.ray.intersectPlane()` を活用
