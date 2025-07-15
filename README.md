# SketchPop - 直感的3Dモデリング

直感的な操作で2Dスケッチから3Dモデルを作成できるWebベースの3Dモデリングアプリケーション。Three.jsを使用して実装されています。

## 概要

SketchPopは、シンプルな2Dスケッチから始めて、押し出し操作で3Dモデルを作成する直感的なモデリングツールです。CADソフトウェアの基本的なスケッチ＆押し出し機能をWebブラウザで体験できます。

## 主な機能

### 🎯 スケッチ機能
- 地平面上での2D矩形スケッチ
- クリック&ドラッグによる直感的な描画
- リアルタイムプレビュー

### 📦 押し出し機能
- 2Dスケッチからの3D押し出し
- 立方体の面からの追加押し出し
- マウス移動による高さ調整
- オレンジ色での仮確定表示

### 🎮 インタラクティブ操作
- 右クリックまたは✓ボタンで確定
- ESCキーまたは✗ボタンでキャンセル
- 中クリック&ドラッグで視点変更
- ホイールでズーム操作

## 使用方法

### セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# または手動でローカルサーバーを起動
python -m http.server 8000
# または
npx serve dist

# ブラウザでアクセス
open http://localhost:8080  # npm run dev の場合
# または
open http://localhost:8000  # 手動サーバーの場合
```

### 操作手順

#### 1. スケッチモード
1. 地平面上で1回目クリック：開始点を設定
2. マウス移動：矩形をプレビュー
3. 2回目クリック：終了点を設定して矩形完成

#### 2. 押し出しモード
1. 形状を1回目クリック：押し出し開始
2. マウス移動：高さ調整
3. 2回目クリック：オレンジ色で仮確定

#### 3. 確定・キャンセル
- **確定**: 右クリック または ✓ボタン
- **キャンセル**: ESCキー または ✗ボタン

#### 4. 面の押し出し
- 確定済み立方体の面にマウスホバー：面がハイライト
- 面をクリック：その面からの押し出し開始
- 右クリックで確定

## 技術的特徴

### アーキテクチャ
- **フロントエンド**: Three.js r128 + ES6モジュール
- **レンダリング**: WebGLベースの3Dレンダリング
- **制御**: OrbitControls による3D視点操作
- **設計パターン**: 単一責任の法則に基づくモジュラー設計
- **状態管理**: 集中化されたStateManager
- **イベント処理**: InteractionManagerによる統合管理
- **ビルドシステム**: Webpack + npm scripts
- **開発環境**: webpack-dev-server によるホットリロード

### 実装の特徴
- **モジュラー設計**: 各クラスが単一の責任を持つ
- **状態管理**: StateManagerによる集中管理
- **面検出**: ExtrusionManagerでのRaycasting処理
- **視覚フィードバック**: 色とオパシティによる状態表示
- **インタラクション**: InteractionManagerによる統一されたイベント処理
- **シーン管理**: SceneManagerによるThree.jsの抽象化
- **ハンドラー層**: 機能別に分離されたイベント処理
- **ユーティリティ層**: 再利用可能な共通処理
- **変形機能**: TransformManagerによる移動・スケール操作

## ファイル構成

```
sketchpop/
├── src/
│   ├── index.html            # メインHTML（UIレイアウト）
│   ├── index.js              # メインアプリケーション（エントリーポイント）
│   ├── styles.css            # スタイルシート
│   ├── SceneManager.js       # Three.jsシーン管理
│   ├── StateManager.js       # アプリケーション状態管理
│   ├── InteractionManager.js # マウス・キーボードイベント処理
│   ├── ExtrusionManager.js   # 押し出し機能とフェイス処理
│   ├── SketchRectangle.js    # 矩形スケッチクラス
│   ├── SelectionManager.js   # オブジェクト選択管理
│   ├── ObjectListManager.js  # オブジェクトリスト管理
│   ├── TransformManager.js   # 変形・移動管理
│   ├── handlers/
│   │   ├── domHandlers.js    # DOM操作ハンドラー
│   │   ├── selectionHandler.js # 選択処理ハンドラー
│   │   ├── stateHandler.js   # 状態管理ハンドラー
│   │   ├── threeHandlers.js  # Three.js操作ハンドラー
│   │   └── transformHandler.js # 変形処理ハンドラー
│   └── utils/
│       ├── domUtils.js       # DOM操作ユーティリティ
│       ├── geometry.js       # 幾何学計算ユーティリティ
│       ├── selectionUtils.js # 選択操作ユーティリティ
│       ├── stateUtils.js     # 状態管理ユーティリティ
│       └── threeUtils.js     # Three.js操作ユーティリティ
├── dist/                     # ビルド済みファイル
├── node_modules/             # 依存関係
├── package.json              # パッケージ設定
├── package-lock.json         # パッケージロック
├── webpack.config.js         # Webpackビルド設定
├── README.md                 # プロジェクト概要（本ファイル）
├── API_REFERENCE.md          # API リファレンス
├── CLAUDE.md                 # Claude Code用ガイダンス
└── REFACTORING_PROGRESS.md   # リファクタリング進捗記録
```

## ブラウザ要件

- モダンブラウザ（Chrome, Firefox, Safari, Edge）
- WebGL サポート
- ES6+ JavaScript サポート（モジュール対応）

## 開発の特徴

### 単一責任の法則（SRP）の適用
各モジュールは明確に定義された単一の責任を持ちます：

- **SceneManager**: Three.jsシーンの管理のみ
- **StateManager**: アプリケーション状態の管理のみ
- **InteractionManager**: ユーザーインタラクションの処理のみ
- **ExtrusionManager**: 押し出し機能と面処理のみ
- **SketchRectangle**: 矩形スケッチの機能のみ

### モジュラー設計の利点
- **保守性**: 各機能が独立しているため、バグ修正や機能追加が容易
- **テスト性**: 個別のモジュールを独立してテスト可能
- **再利用性**: 他のプロジェクトでもモジュールを再利用可能
- **可読性**: コードの構造が明確で理解しやすい

## 開発のポイント

### 最近の修正
- ✅ **リファクタリング完了**: 単一責任の法則を適用したモジュラー設計
- ✅ **SceneManager**: Three.jsシーン管理の完全分離
- ✅ **StateManager**: アプリケーション状態の集中管理
- ✅ **InteractionManager**: 全イベント処理の統合化
- ✅ **ExtrusionManager**: 押し出し・面処理機能の専門化
- ✅ **SketchRectangle**: 矩形スケッチクラスの独立化
- ✅ **アーキテクチャ**: ES6モジュールシステムの完全活用

### 実装済み機能
- 2Dスケッチから3D押し出し
- 立方体の面からの追加押し出し
- 直感的なマウス操作
- 状態に応じた視覚フィードバック
- 完全な確定・キャンセル機能

### モジュール構成

#### SceneManager.js
- Three.jsシーンの初期化と管理
- カメラ、レンダラー、ライティングの設定
- OrbitControlsの設定
- ウィンドウリサイズ対応
- 透視投影・平行投影カメラの切り替え

#### StateManager.js
- アプリケーション全体の状態管理
- スケッチモード/押し出しモードの切り替え
- スケッチコレクションの管理
- UI更新とコントロール表示

#### InteractionManager.js
- マウス・キーボードイベントの統合処理
- クリック、マウス移動、キー入力の管理
- UIコントロールのイベントリスナー設定
- 各モードでの適切なアクション振り分け

#### ExtrusionManager.js
- 面のハイライト表示機能
- 面の押し出し処理
- Raycastingによる面検出
- 既存形状との統合処理

#### SketchRectangle.js
- 矩形スケッチの作成・更新
- 3D押し出し処理
- 色とオパシティによる状態表示
- 確定・キャンセル機能

#### SelectionManager.js
- オブジェクトの選択・選択解除
- 選択状態の視覚的フィードバック
- 複数オブジェクトの管理

#### ObjectListManager.js
- サイドバーのオブジェクトリスト管理
- オブジェクトの表示切替
- リスト項目の動的更新

#### TransformManager.js
- オブジェクトの移動・回転・スケール
- ハンドル表示とドラッグ操作
- 変形モードの切り替え

#### handlers/ ディレクトリ
- **domHandlers.js**: DOM要素の操作とイベント処理
- **selectionHandler.js**: オブジェクト選択に関する処理
- **stateHandler.js**: アプリケーション状態の変更処理
- **threeHandlers.js**: Three.jsオブジェクトの操作処理
- **transformHandler.js**: 変形操作の具体的な処理

#### utils/ ディレクトリ
- **domUtils.js**: DOM操作の共通処理
- **geometry.js**: 幾何学計算（距離、角度、面積など）
- **selectionUtils.js**: 選択操作の共通処理
- **stateUtils.js**: 状態管理の共通処理
- **threeUtils.js**: Three.jsの共通操作

## ライセンス

このプロジェクトは教育・学習目的で作成されています。