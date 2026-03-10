# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SketchPop は、ブラウザ上で動作するWebベースの3Dモデリングアプリケーションです。Three.js を使用し、2Dスケッチから3D形状を押し出して作成する「スケッチ＆押し出し」ワークフローを実装しています。Vite をビルドツールとして採用したモジュラー設計です。

## Architecture

**コアマネージャー:**
- `SceneManager`: Three.js シーン・カメラ・レンダラー・ライティングの管理
- `StateManager`: アプリケーション全体の状態管理（モード切り替え・スケッチコレクション）
- `InteractionManager`: マウス・キーボードイベントの統合処理
- `ExtrusionManager`: 押し出し操作・面検出（Raycasting）・面ハイライト
- `SelectionManager`: オブジェクトの選択・選択解除・視覚フィードバック
- `ObjectListManager`: サイドバーのオブジェクトリスト管理
- `TransformManager`: 移動・回転・スケール変形とハンドル表示
- `StatusBarManager`: ステータスバーの表示管理

**ジオメトリ関連:**
- `SketchRectangle`: 地平面上の矩形スケッチ・押し出し処理
- `CustomExtruder`: 独立頂点による手動ジオメトリ生成（面単位の法線・色）
- `Box`: 確定済み立方体メッシュの管理
- `Rectangle`: 矩形の基本クラス

**UI補助:**
- `ViewCube`: 3D視点ナビゲーションキューブ
- `AxisTriad`: 軸トライアッド（X/Y/Z 表示）

**handlers/ ディレクトリ:** 機能別に分離されたイベントハンドラー群
**utils/ ディレクトリ:** 再利用可能なユーティリティ関数群

## Development

**セットアップと起動:**
```bash
# 依存関係のインストール
npm install
# または
pnpm install

# 開発サーバーの起動（ホットリロード対応）
npm run dev
# または
pnpm dev

# ブラウザで開く
open http://localhost:5173/SketchPop/
```

**ビルド:**
```bash
npm run build   # dist/ に出力
npm run preview # ビルド済みをプレビュー
```

**技術スタック:**
- Three.js v0.178+ (npm パッケージ)
- Vite v6+ (ビルド・開発サーバー)
- ES6 モジュール構成
- ルートは `src/`、ビルド出力は `dist/`

**コード構造:**
- エントリーポイント: `src/index.js`
- 設定: `vite.config.js` (base: `/SketchPop/`, root: `src`)
- 全ソースは `src/` 配下のモジュールに分割

**主要クラスとメソッド:**
- `CustomExtruder.generateVertices()`: 24独立頂点（6面 × 4頂点）を生成
- `CustomExtruder.generateIndices()`: 正しいワインディング順でのトライアングル接続
- `CustomExtruder.generateNormals()`: トライアングル法線からの頂点法線計算
- `CustomExtruder.generateVertexColors()`: 面ごとの色割り当て
- `ExtrusionManager`: Raycasting による面検出と押し出し処理
- `StateManager`: スケッチ/押し出しモードの状態管理
