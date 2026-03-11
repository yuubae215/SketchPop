# SketchPop アーキテクチャドキュメント

## 概要

SketchPopはブラウザで動作するWebベースの3Dモデリングアプリケーションです。スケッチ＆押し出しワークフローをThree.jsで実装しており、2D矩形を3Dソリッドに変換できます。

**ライブサイト:** https://yuubae215.github.io/SketchPop/

---

## アーキテクチャ全体図

```
index.js
└── SketchPopApp
    ├── SceneManager          ← Three.jsシーン・レンダリング
    ├── StateManager          ← アプリケーション状態
    └── InteractionManager    ← イベント処理 + 全マネージャー統括
        ├── ExtrusionManager
        ├── SelectionManager
        ├── TransformManager
        ├── ObjectListManager
        ├── StatusBarManager
        ├── CommandManager
        │   └── HistoryPanelManager
        ├── PropertyPanelManager
        ├── CommandPaletteManager
        ├── DisplayModeManager
        ├── GridSnapManager
        ├── ProjectManager
        ├── ExportManager
        ├── ContextMenuManager
        ├── MeasurementManager
        ├── BoxSelectManager
        ├── EdgeSelectionManager
        ├── FilletManager
        └── BooleanManager
```

---

## モジュール詳細

### エントリポイント

#### `src/index.js`
アプリケーションの起動点。`SketchPopApp` クラスを定義し、`SceneManager`・`StateManager`・`InteractionManager` を初期化してアニメーションループを開始する。`window.interactionManager` を公開しサイドバー等のDOM操作から参照できるようにする。

---

### コアマネージャー

#### `SceneManager`
Three.jsシーン全体を管理する。

**主な責務:**
- Three.js `Scene`・`WebGLRenderer` の初期化
- 透視投影カメラ (`PerspectiveCamera`) と平行投影カメラ (`OrthographicCamera`) の切り替え (`P` キー)
- `OrbitControls` によるカメラ操作
- ライティング（環境光・平行光）
- グリッドヘルパー・地平面
- `Raycaster` によるレイキャスト処理
- アニメーションループ (`animate()`)

**主要プロパティ:**

| プロパティ | 型 | 説明 |
|---|---|---|
| `scene` | `THREE.Scene` | Three.jsシーン |
| `camera` | `THREE.Camera` | 現在有効なカメラ |
| `perspectiveCamera` | `THREE.PerspectiveCamera` | 透視投影カメラ |
| `orthographicCamera` | `THREE.OrthographicCamera` | 平行投影カメラ |
| `renderer` | `THREE.WebGLRenderer` | WebGLレンダラー |
| `controls` | `OrbitControls` | カメラ制御 |
| `raycaster` | `THREE.Raycaster` | レイキャスト |
| `sketchPlane` | `THREE.Plane` | スケッチ平面 (Y=0) |

---

#### `StateManager`
アプリケーション全体の状態を保持する。

**アプリケーションモード:**
- `sketch` — 矩形スケッチ描画
- `extrude` — 押し出し操作
- `select` — オブジェクト選択・変形

**主要プロパティ:**

| プロパティ | 型 | 説明 |
|---|---|---|
| `currentMode` | `string` | 現在のモード |
| `isSketchingRectangle` | `boolean` | 矩形描画中か |
| `currentRectangle` | `SketchRectangle` | 描画中の矩形 |
| `sketches` | `SketchRectangle[]` | 全スケッチのコレクション |
| `selectedObject` | `Object` | 選択中のオブジェクト |
| `isFaceExtruding` | `boolean` | 面押し出し中か |
| `hoveredFace` | `Object` | ホバー中の面 |

---

#### `InteractionManager`
マウス・キーボードイベントを統合管理し、全マネージャーを生成・統括するオーケストレーターです。

**主な責務:**
- `mousedown` / `mousemove` / `mouseup` / `keydown` / `wheel` のハンドリング
- 全マネージャーの生成と初期化
- `StateManager` への各マネージャー参照の注入
- コマンドパレットのコマンド登録 (`_registerPaletteCommands()`)
- コンテキストメニューのコールバック設定 (`_setupContextMenuCallbacks()`)
- 数値入力オーバーレイ (押し出し高さの直接入力)

---

### 機能マネージャー

#### `ExtrusionManager`
押し出し操作と面の検出・ハイライトを管理する。

**主な処理フロー:**
1. マウス移動 → `updateFaceHighlight()` でホバー面をオレンジ色にハイライト
2. 面クリック → `startFaceExtrusion()` で面押し出し開始
3. マウス移動 → `updateFaceExtrusion()` で高さを動的更新
4. 右クリック → `confirmFaceExtrusion()` で確定

---

#### `SelectionManager`
オブジェクトの選択とビジュアルフィードバックを管理する。

**機能:**
- 選択時のハイライト表示（バウンディングボックス、寸法線、原点マーカー）
- 選択解除
- ホバーハイライト

---

#### `TransformManager`
Three.js `TransformControls` を使って選択オブジェクトの移動・回転・スケールを提供する。

**モード切り替え:**
- Move (`T`) / Rotate (`R`) / Scale (`Y`)

---

#### `ObjectListManager`
左サイドバーのオブジェクトリストを管理する。

**機能:**
- スケッチ追加・削除時にリスト項目を同期
- 可視性トグル（目のアイコン）
- リスト項目クリックでオブジェクト選択

---

#### `StatusBarManager`
画面下部のステータスバーにモード名とヒントテキストを表示する。

---

#### `CommandManager`
Command パターンによるアンドゥ/リドゥスタックを実装する。最大50件の履歴を保持。

**コマンド種類:**

| コマンド | 説明 |
|---|---|
| `AddSketchCommand` | スケッチ追加（アンドゥで削除） |
| `ExtrudeCommand` | 押し出し（アンドゥで2Dスケッチに戻す） |
| `DeleteSketchCommand` | スケッチ削除（アンドゥで復元） |
| `FaceExtrudeCommand` | 面押し出し（アンドゥでジオメトリスナップショットに戻す） |
| `DuplicateCommand` | 複製（アンドゥで複製を削除） |

**キーバインド:** `Ctrl+Z` (アンドゥ) / `Ctrl+Y` または `Ctrl+Shift+Z` (リドゥ)

---

#### `PropertyPanelManager`
右スライドインパネル。選択オブジェクトのプロパティ（名前・位置・寸法）を表示・編集できる。

**編集可能フィールド:**
- 位置 X / Y / Z（メッシュを移動）
- 高さ H（再押し出し）

---

#### `HistoryPanelManager`
Fusion 360スタイルのタイムラインパネル。`CommandManager.undoStack` を読み取り、各コマンドをチップとして表示する。チップをクリックしてその状態にジャンプ可能。

---

#### `CommandPaletteManager`
`Ctrl+K` で開くファジー検索コマンドランチャー。全コマンドをキーワード検索して実行できる。

---

#### `DisplayModeManager`
`W` キーで表示モードを順番に切り替える。

**モード一覧:**

| モード | 説明 |
|---|---|
| `shaded` | デフォルト不透明 |
| `shaded-edges` | 不透明 + ワイヤーフレームオーバーレイ |
| `wireframe` | ラインのみ |
| `xray` | 半透明 |

---

#### `GridSnapManager`
スケッチポイントと押し出し高さをグリッドにスナップする。

**API:**
- `snapPoint(vec3)` — THREE.Vector3 の X/Z をスナップ（インプレース）
- `snapValue(n)` — 数値をスナップして返す（高さ用）
- `toggle()` — 有効/無効を切り替えて新状態を返す

**キーバインド:** `G` でトグル

---

#### `ProjectManager`
シーンのシリアライズ/デシリアライズを担当する。

**機能:**
- `saveToFile()` — シーンを `sketchpop.json` としてダウンロード
- `loadFromFile()` — ファイルピッカーを開いてシーンを復元
- `triggerAutoSave()` — 変更後1.5秒のデバウンスでlocalStorageに自動保存
- `loadAutoSave()` — 起動時にlocalStorageから復元

---

#### `ExportManager`
エクスポート対象は押し出し済みメッシュのみ。

**対応フォーマット:**

| フォーマット | 拡張子 | ライブラリ |
|---|---|---|
| STL | `.stl` | `STLExporter` |
| OBJ | `.obj` | `OBJExporter` |
| GLTF (JSON) | `.gltf` | `GLTFExporter` |
| GLTF (Binary) | `.glb` | `GLTFExporter` |
| PNG (スクリーンショット) | `.png` | Canvas API |

---

#### `ContextMenuManager`
右クリックで表示されるコンテキストメニュー。

**オブジェクトメニュー:** 名前変更 / 複製 / 表示切替 / 削除

**空白メニュー:** ここでスケッチ / ビューリセット

---

#### `BooleanManager`
`three-csg-ts` を使ったCSGブール演算。2つの押し出しオブジェクトに対して適用する。

**操作:**
- `operate('union', sketchA, sketchB)` — 和
- `operate('difference', sketchA, sketchB)` — 差（A から B を引く）
- `operate('intersect', sketchA, sketchB)` — 積

結果メッシュが sketchA の位置に配置され、sketchB はシーンから削除される。

---

#### `BoxSelectManager`
選択モードでドラッグして複数オブジェクトをまとめて選択する。

**動作:**
- `Shift` を押しながら追加選択可能
- TransformControls のドラッグ中は無効

---

#### `EdgeSelectionManager`
押し出しメッシュのエッジを選択できる。

**色定義:**
- 通常: 暗灰色（エッジ選択モード時のみ表示）
- ホバー: 黄色 `#ffff00`
- 選択済み: オレンジ `#ff9500`

---

#### `FilletManager`
押し出しボックスの上部水平エッジにフィレット/面取りを適用する。

**操作:**
- `chamfer(sketch, amount)` — 45° 面取り
- `fillet(sketch, amount)` — 円弧近似のフィレット
- `reset(sketch)` — 元のBoxGeometryに戻す

`amount` は幅・奥行き・高さの最小値の半分にクランプされる。

---

#### `MeasurementManager`
ビューポート内の計測ツール。`M` キーでモードを切り替える。

**モード:**
- `off` — 計測なし
- `distance` — 2点クリックで距離を表示
- `area` — 面をクリックしてその面積を表示

---

#### `ToastManager`
静的クラス。非ブロッキングなトースト通知を表示する。

**使用方法:**
```javascript
ToastManager.show('Object created', 'success');
ToastManager.show('No object selected', 'warning');
```

**通知種類:** `success` / `info` / `warning` / `error`

デフォルト3500ms後に自動消去。

---

### ジオメトリクラス

#### `SketchRectangle`
地平面上の矩形スケッチと押し出しを表現するコアクラス。

**ライフサイクル:**
1. `new SketchRectangle(startPoint, endPoint)` — 作成
2. `update(endPoint)` — マウス移動に合わせてリアルタイム更新
3. `extrude(height)` — 3D押し出し（`CustomExtruder` を使用）
4. 仮確定: `isPending = true` — オレンジプレビュー表示
5. `confirm()` — 確定（マテリアル変更）
6. `cancel()` — キャンセル（スケッチに戻る）

**主要プロパティ:**

| プロパティ | 型 | 説明 |
|---|---|---|
| `startPoint` | `THREE.Vector3` | 矩形開始点 |
| `endPoint` | `THREE.Vector3` | 矩形終了点 |
| `mesh` | `THREE.Mesh` | 2Dスケッチメッシュ |
| `extrudedMesh` | `THREE.Mesh` | 3D押し出しメッシュ |
| `isExtruded` | `boolean` | 押し出し済みか |
| `extrudeHeight` | `number` | 押し出し高さ |
| `isPending` | `boolean` | 仮確定状態か |
| `objectId` | `string` | ユニークID |

---

#### `CustomExtruder`
ボックスジオメトリを手動生成する。6面それぞれに独立した頂点・法線・カラーを持ち、面ごとの色分けや法線計算を正確に行う。

**主要メソッド:**
- `generateVertices()` — 24頂点を生成（6面 × 4頂点）
- `generateIndices()` — 正しいワインディングオーダーの三角形インデックス
- `generateNormals()` — 三角形法線から頂点法線を計算
- `generateVertexColors()` — 面ごとのカラー割り当て

---

### UIヘルパー

#### `ViewCube`
カメラ方向と同期する3Dナビゲーションキューブ。オーバーレイキャンバスに別のThree.jsシーンとして描画される。各面・角をクリックして標準ビュー（正面/背面/左/右/上/下/アイソメトリック）に切り替えられる。

#### `AxisTriad`
X/Y/Z軸インジケーター。画面左下に常時表示される。

---

## handlers/ — 副作用ハンドラー

純粋関数と副作用を分離するアーキテクチャパターンに基づき、Three.jsやDOM操作の副作用はハンドラーに集約されている。

### `handlers/domHandlers.js`

| クラス | 責務 |
|---|---|
| `ObjectListDOMHandler` | サイドバーオブジェクトリストのDOM操作 |
| `SelectionModeDOMHandler` | 選択モードボタンのDOM操作 |
| `ConfirmationControlsDOMHandler` | 確認/キャンセルコントロールの表示制御 |

### `handlers/threeHandlers.js`

| クラス | 責務 |
|---|---|
| `SceneHandler` | シーン操作・ライティング・ヘルパー管理 |
| `MeshHandler` | メッシュ作成・更新・削除の抽象化 |
| `MaterialHandler` | マテリアル操作の統一化 |
| `DimensionHandler` | 寸法線とテキストスプライト管理 |
| `InteractionHandler` | レイキャスト・マウスインタラクション |
| `RenderHandler` | レンダリング・カメラ・アニメーションループ |

### `handlers/transformHandler.js`
`TransformHandler` — TransformControls操作の抽象化

### `handlers/selectionHandler.js`
`SelectionHandler` — ホバーハイライト・寸法線・原点マーカーの生成・クリア

### `handlers/stateHandler.js`
`StateHandler` — モード変更・スケッチプロパティ設定・確認コントロール表示

---

## utils/ — 純粋関数

副作用を持たない決定論的な計算関数群。

### `utils/geometry.js`
- `calculateBounds()` — 境界ボックス計算
- `calculateDimensions()` — サイズ計算（幅・奥行き・高さ）
- `calculateCenter()` — 中心点計算
- `generateRectanglePoints()` — 矩形4頂点の生成
- `pointInBounds()` — 点が境界内かの判定
- `validateRectangleSize()` — サイズの最小値検証
- `calculateFaceNormal()` — 面法線の計算
- `calculateDistance()` — 2点間距離の計算

### `utils/domUtils.js`
- `generateObjectItemData()` — オブジェクトリストアイテムのデータ生成
- `generateObjectItemHTML()` — HTMLコンテンツ生成
- `calculateSelectionChanges()` — 選択状態変更の計算
- `generateObjectId()` — ユニークID生成
- `generateObjectIcon()` — SVGアイコン生成

### `utils/threeUtils.js`
Three.js関連の純粋関数。バウンディングボックス計算、距離計算、座標変換など。

### `utils/selectionUtils.js`
- `calculateSelectionBounds()` — 選択バウンディングボックス計算
- `calculateOriginPosition()` — 原点位置計算
- `calculateDimensionLinePositions()` — 寸法線位置計算
- `formatOriginCoordinates()` — 座標フォーマット
- `formatDimensionValue()` — 寸法値フォーマット
- `shouldShowHighlight()` — ハイライト表示判定
- `extractSketchFromMesh()` — メッシュからスケッチオブジェクトを取得
- `validateSketchObject()` — スケッチオブジェクトの検証

### `utils/stateUtils.js`
- `validateMode()`, `validateSelectionMode()` — モード値の検証
- `calculateModeFlags()` — モードフラグの計算
- `calculateNextMode()` — モード遷移の計算
- `shouldClearActiveOperations()` — 操作クリア要否の判定
- `createInitialState()` — 初期状態オブジェクトの生成
- `validateState()` — 状態オブジェクトの検証

---

## 座標系

- **原点**: 地平面の中心
- **X軸**: 右方向が正
- **Y軸**: 上方向が正
- **Z軸**: 手前方向が正（右手系）
- **スケッチ平面**: Y=0（法線: 0, 1, 0）
- **押し出し方向**: Y軸正方向（上向き）

---

## データフロー

```
ユーザー操作（マウス/キーボード）
    ↓
InteractionManager（イベント振り分け）
    ↓
各Managerのメソッド呼び出し
    ↓
utils/ の純粋関数で計算
    ↓
handlers/ の副作用ハンドラーでThree.js/DOM更新
    ↓
StateManager の状態更新
    ↓
SceneManager のアニメーションループでレンダリング
```

---

## キーバインド一覧

| キー | 機能 |
|---|---|
| `S` | スケッチモード |
| `E` | 押し出しモード |
| `V` | 選択モード |
| `W` | 表示モード切り替え |
| `G` | グリッドスナップ トグル |
| `M` | 計測モード切り替え |
| `P` | カメラモード切り替え（透視/平行） |
| `T` | 移動ハンドル |
| `R` | 回転ハンドル |
| `Y` | スケールハンドル |
| `Ctrl+K` | コマンドパレット |
| `Ctrl+Z` | アンドゥ |
| `Ctrl+Y` / `Ctrl+Shift+Z` | リドゥ |
| `Delete` | 選択オブジェクト削除 |
| `ESC` | 操作キャンセル |

---

## 設計原則

1. **純粋関数と副作用の分離**: `utils/` に純粋関数、`handlers/` に副作用を集約
2. **単一責任の原則**: 各マネージャーは明確な責務を持つ
3. **コマンドパターン**: 全変更操作はコマンドオブジェクト化してアンドゥ/リドゥに対応
4. **段階的確定**: スケッチ → 仮確定（オレンジ） → 確定のフロー
5. **テスタビリティ**: 純粋関数は外部依存なしで単独テスト可能

---

## 関連ドキュメント

- [API_REFERENCE.md](./API_REFERENCE.md) — 各クラスの詳細APIリファレンス
- [REFACTORING_PROGRESS.md](./REFACTORING_PROGRESS.md) — リファクタリング実施記録
- [CAD_UX_IMPROVEMENTS.md](./CAD_UX_IMPROVEMENTS.md) — UX改善提案
- [UX_BACKLOG.md](./UX_BACKLOG.md) — UXバックログ
