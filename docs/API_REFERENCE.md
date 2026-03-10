# SketchPop API Reference

SketchPopは直感的な3Dモデリングアプリケーションです。本APIリファレンスでは、各モジュールクラスの詳細な使用方法を説明します。

## アーキテクチャ概要

SketchPopは以下のモジュラー設計に基づいています：

- **SceneManager**: Three.jsシーンとレンダリング管理
- **StateManager**: アプリケーション状態管理
- **InteractionManager**: ユーザーインタラクション処理
- **ExtrusionManager**: 押し出し機能と面処理
- **SketchRectangle**: 矩形スケッチクラス
- **SelectionManager**: オブジェクト選択管理
- **ObjectListManager**: サイドバーオブジェクトリスト管理

---

## SceneManager

Three.jsシーンの初期化と管理を担当します。

### コンストラクタ

```javascript
new SceneManager()
```

### 主要プロパティ

| プロパティ | 型 | 説明 |
|-----------|----|----|
| `scene` | THREE.Scene | Three.jsシーンオブジェクト |
| `camera` | THREE.Camera | 現在のカメラ（透視・平行投影） |
| `perspectiveCamera` | THREE.PerspectiveCamera | 透視投影カメラ |
| `orthographicCamera` | THREE.OrthographicCamera | 平行投影カメラ |
| `renderer` | THREE.WebGLRenderer | WebGLレンダラー |
| `controls` | OrbitControls | カメラ制御 |
| `raycaster` | THREE.Raycaster | レイキャスト処理 |
| `sketchPlane` | THREE.Plane | スケッチ平面 |

### 主要メソッド

#### init()

シーン全体を初期化します。

```javascript
init(): Object
```

**戻り値**: シーンオブジェクトコレクション

#### createCamera()

透視投影・平行投影カメラを作成します。

```javascript
createCamera(): void
```

#### switchCameraMode()

カメラモードを切り替えます。

```javascript
switchCameraMode(): void
```

#### addToScene(object)

シーンにオブジェクトを追加します。

```javascript
addToScene(object: THREE.Object3D): void
```

#### removeFromScene(object)

シーンからオブジェクトを削除します。

```javascript
removeFromScene(object: THREE.Object3D): void
```

---

## StateManager

アプリケーション全体の状態を管理します。

### コンストラクタ

```javascript
new StateManager()
```

### 主要プロパティ

| プロパティ | 型 | 説明 |
|-----------|----|----|
| `currentMode` | string | 現在のモード ('sketch', 'extrude', 'select') |
| `isSketchingRectangle` | boolean | 矩形スケッチ中か |
| `currentRectangle` | SketchRectangle | 現在の矩形オブジェクト |
| `sketches` | Array | スケッチコレクション |
| `selectedObject` | Object | 選択中のオブジェクト |
| `isFaceExtruding` | boolean | 面押し出し中か |
| `hoveredFace` | Object | ホバー中の面 |

### 主要メソッド

#### init()

状態管理を初期化します。

```javascript
init(): void
```

#### setMode(mode)

アプリケーションモードを設定します。

```javascript
setMode(mode: string): void
```

**モード**: 'sketch', 'extrude', 'select'

#### addSketch(sketch)

スケッチをコレクションに追加します。

```javascript
addSketch(sketch: SketchRectangle): void
```

#### removeSketch(sketch)

スケッチをコレクションから削除します。

```javascript
removeSketch(sketch: SketchRectangle): void
```

---

## InteractionManager

マウス・キーボードイベントを統合管理します。

### コンストラクタ

```javascript
new InteractionManager(sceneManager, stateManager)
```

#### パラメータ
- `sceneManager`: SceneManagerインスタンス
- `stateManager`: StateManagerインスタンス

### 主要メソッド

#### handleMouseDown(event)

マウスダウンイベントを処理します。

```javascript
handleMouseDown(event: MouseEvent): void
```

#### handleMouseMove(event)

マウス移動イベントを処理します。

```javascript
handleMouseMove(event: MouseEvent): void
```

#### handleMouseUp(event)

マウスアップイベントを処理します。

```javascript
handleMouseUp(event: MouseEvent): void
```

#### handleKeyDown(event)

キーダウンイベントを処理します。

```javascript
handleKeyDown(event: KeyboardEvent): void
```

---

## ExtrusionManager

押し出し機能と面検出を管理します。

### コンストラクタ

```javascript
new ExtrusionManager(sceneManager, stateManager)
```

### 主要メソッド

#### updateFaceHighlight(event)

面のハイライト表示を更新します。

```javascript
updateFaceHighlight(event: MouseEvent): void
```

#### startFaceExtrusion(intersect)

面の押し出しを開始します。

```javascript
startFaceExtrusion(intersect: Object): void
```

#### updateFaceExtrusion(event)

面押し出しの高さを更新します。

```javascript
updateFaceExtrusion(event: MouseEvent): void
```

#### confirmFaceExtrusion()

面押し出しを確定します。

```javascript
confirmFaceExtrusion(): void
```

#### cancelFaceExtrusion()

面押し出しをキャンセルします。

```javascript
cancelFaceExtrusion(): void
```

---

## SketchRectangle

矩形スケッチと押し出し機能を提供します。

### コンストラクタ

```javascript
new SketchRectangle(startPoint, endPoint)
```

#### パラメータ
- `startPoint`: THREE.Vector3 - 開始点
- `endPoint`: THREE.Vector3 - 終了点

### 主要プロパティ

| プロパティ | 型 | 説明 |
|-----------|----|----|
| `startPoint` | THREE.Vector3 | 矩形の開始点 |
| `endPoint` | THREE.Vector3 | 矩形の終了点 |
| `mesh` | THREE.Mesh | 矩形メッシュ |
| `extrudedMesh` | THREE.Mesh | 押し出しメッシュ |
| `isExtruded` | boolean | 押し出し済みか |
| `extrudeHeight` | number | 押し出し高さ |
| `isPending` | boolean | 仮確定状態か |
| `isHovered` | boolean | ホバー状態か |
| `objectId` | string | オブジェクトID |

### 主要メソッド

#### update(endPoint)

矩形を更新します。

```javascript
update(endPoint: THREE.Vector3): THREE.Mesh
```

#### createMesh()

矩形メッシュを作成します。

```javascript
createMesh(): THREE.Mesh
```

#### extrude(height)

指定高さで押し出します。

```javascript
extrude(height: number): void
```

#### confirm()

押し出しを確定します。

```javascript
confirm(): void
```

#### cancel()

押し出しをキャンセルします。

```javascript
cancel(): void
```

#### createDimensions()

寸法線を作成します。

```javascript
createDimensions(): void
```

---

## SelectionManager

オブジェクトの選択と選択解除を管理します。

### コンストラクタ

```javascript
new SelectionManager(sceneManager, stateManager)
```

### 主要メソッド

#### selectObject(object)

オブジェクトを選択します。

```javascript
selectObject(object: THREE.Object3D): void
```

#### deselectAll()

全ての選択を解除します。

```javascript
deselectAll(): void
```

#### handleObjectClick(intersect)

オブジェクトクリックを処理します。

```javascript
handleObjectClick(intersect: Object): void
```

---

## ObjectListManager

サイドバーのオブジェクトリストを管理します。

### コンストラクタ

```javascript
new ObjectListManager(stateManager)
```

### 主要メソッド

#### updateObjectList()

オブジェクトリストを更新します。

```javascript
updateObjectList(): void
```

#### createObjectListItem(sketch, index)

リスト項目を作成します。

```javascript
createObjectListItem(sketch: SketchRectangle, index: number): HTMLElement
```

#### toggleObjectVisibility(sketch)

オブジェクトの表示切替を行います。

```javascript
toggleObjectVisibility(sketch: SketchRectangle): void
```

---

## 座標系とジオメトリ

### 座標系
- **原点**: 地平面の中心
- **X軸**: 右方向が正
- **Y軸**: 上方向が正  
- **Z軸**: 手前方向が正 (右手系)

### スケッチ平面
- **平面**: Y=0 (地平面)
- **法線**: (0, 1, 0)

### 矩形定義
- **開始点**: マウス最初クリック位置
- **終了点**: マウス2回目クリック位置
- **描画**: リアルタイムプレビュー

### 押し出し仕様
- **方向**: Y軸正方向（上向き）
- **高さ**: マウス移動による動的調整
- **確定**: 右クリックまたは✓ボタン
- **キャンセル**: ESCキーまたは✗ボタン

---

## イベントハンドリング

### マウスイベント

```javascript
// 基本的なマウスイベント処理
document.addEventListener('mousedown', (e) => {
    interactionManager.handleMouseDown(e);
});

document.addEventListener('mousemove', (e) => {
    interactionManager.handleMouseMove(e);
});

document.addEventListener('mouseup', (e) => {
    interactionManager.handleMouseUp(e);
});
```

### キーボードイベント

```javascript
// キーボードイベント処理
document.addEventListener('keydown', (e) => {
    interactionManager.handleKeyDown(e);
});
```

### 主要キーバインド

| キー | 機能 |
|------|------|
| `S` | スケッチモード |
| `E` | 押し出しモード |
| `V` | 選択モード |
| `ESC` | キャンセル |
| `Delete` | 選択オブジェクト削除 |
| `P` | カメラモード切替 |

---

## 使用例

### 基本的な初期化

```javascript
import { SceneManager } from './SceneManager.js';
import { StateManager } from './StateManager.js';
import { InteractionManager } from './InteractionManager.js';

class SketchPopApp {
    constructor() {
        this.sceneManager = new SceneManager();
        this.stateManager = new StateManager();
        this.interactionManager = null;
    }

    init() {
        const sceneObjects = this.sceneManager.init();
        this.stateManager.init();
        this.interactionManager = new InteractionManager(
            this.sceneManager, 
            this.stateManager
        );
        
        this.sceneManager.animate();
    }
}

const app = new SketchPopApp();
app.init();
```

### 矩形スケッチの作成

```javascript
// 新しい矩形スケッチを作成
const startPoint = new THREE.Vector3(-1, 0, -1);
const endPoint = new THREE.Vector3(1, 0, 1);
const rectangle = new SketchRectangle(startPoint, endPoint);

// StateManagerに設定
rectangle.setStateManager(stateManager);

// メッシュを作成してシーンに追加
const mesh = rectangle.createMesh();
sceneManager.addToScene(mesh);

// スケッチコレクションに追加
stateManager.addSketch(rectangle);
```

### 押し出し操作

```javascript
// 矩形を押し出す
rectangle.extrude(2.0); // 高さ2.0で押し出し

// 仮確定状態で表示
rectangle.isPending = true;

// 確定
rectangle.confirm();
```

---

## パフォーマンス考慮事項

### メモリ管理
- ジオメトリとマテリアルの適切な破棄
- イベントリスナーの適切な削除
- 不要なメッシュの定期的な削除

### 最適化ポイント
- レイキャスト処理の効率化
- リアルタイム更新の最適化
- DOM操作の最小化

### 推奨事項
- 大量のオブジェクトを扱う場合はInstancedMeshの使用を検討
- 複雑なジオメトリにはLOD（Level of Detail）の実装
- WebWorkersを使用した重い計算の分散処理

---

## エラーハンドリング

### 一般的な問題と解決方法

1. **ジオメトリが表示されない**
   - カメラ位置を確認
   - ジオメトリのスケールを確認
   - マテリアル設定を確認

2. **イベントが反応しない**
   - イベントリスナーの登録を確認
   - DOM要素の重なりを確認
   - preventDefault()の使用を確認

3. **メモリリークが発生する**
   - ジオメトリとマテリアルの破棄を確認
   - イベントリスナーの削除を確認
   - 循環参照の解消を確認

### デバッグ支援

```javascript
// デバッグ情報の表示
console.log('Current mode:', stateManager.currentMode);
console.log('Sketches count:', stateManager.sketches.length);
console.log('Selected object:', stateManager.selectedObject);

// シーン情報の確認
console.log('Scene children:', sceneManager.scene.children.length);
console.log('Camera position:', sceneManager.camera.position);
```