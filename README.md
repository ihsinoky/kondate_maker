# kondate_maker
週次で献立を立てるツール


## プロジェクト概要
- **目的**: 週次に献立を生成し、NotionのDBにテンプレ準拠のページを作成する。
- **トリガ**: 手動実行（GitHub Actions workflow_dispatch）を想定、週1回目安。
- **使用技術**: React + TypeScript (Vite)、OpenAI API、Notion API。
- **出力編集性**: ページ本文は Notion ブロックで生成し、ユーザは自由に編集可能。
- **制約**: 曜日ごとのルール、全体方針（旬・時短等）、優先レシピサイトを守る。
- **コスト方針**: 追加 SaaS は使用せず、Actions 無料枠を想定。

## 開発環境のセットアップ

### 必要なツール
- Node.js 20.x 以上
- npm

### ローカルでの起動

1. 依存関係のインストール
```bash
npm ci
```

2. 開発サーバーの起動
```bash
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスできます。

### ビルドとプレビュー

本番用ビルドを作成：
```bash
npm run build
```

ビルドした内容をローカルでプレビュー：
```bash
npm run preview
```

### Lint

コードのスタイルチェック：
```bash
npm run lint
```

## ディレクトリ構成
```
kondate_maker/
├── src/
│   ├── main.tsx          # エントリーポイント
│   ├── App.tsx           # ルーティング設定
│   ├── index.css         # グローバルスタイル
│   ├── pages/            # ページコンポーネント
│   │   ├── Main.tsx      # メインページ
│   │   └── Settings.tsx  # 設定ページ
│   └── lib/              # ユーティリティ
│       ├── settings.ts   # 設定の読み書き（実装予定）
│       └── clipboard.ts  # クリップボード操作（実装予定）
├── .github/
│   └── workflows/        # GitHub Actions
│       ├── ci.yml        # CI (lint/build)
│       └── deploy.yml    # GitHub Pages デプロイ
├── index.html            # HTML テンプレート
├── vite.config.ts        # Vite 設定
├── tsconfig.json         # TypeScript 設定
└── package.json          # 依存関係
```

## GitHub Pages での公開

### 初回セットアップ

1. リポジトリの Settings → Pages に移動
2. "Source" を **GitHub Actions** に設定
3. `main` ブランチにプッシュすると自動的にデプロイされます

### アクセス方法

デプロイ後、以下のURLでアクセスできます：
```
https://ihsinoky.github.io/kondate_maker/
```

**注意**: GitHub Pages では `/kondate_maker/` 配下で公開されるため、HashRouter（`/#/` 形式のURL）を使用しています。これにより、直接URLを開いたりリロードしても正常に動作します。

## コーディング規約
- TypeScript の strict モードを有効化
- ESLint の推奨ルールに準拠
- React Hooks の規約に従う
- 未使用の変数・パラメータは警告

## CI/CD
- **CI**: PR/Push時に自動的に lint と build を実行
- **Deploy**: `main` ブランチへのプッシュ時に GitHub Pages へ自動デプロイ