# kondate_maker
週次で献立を立てるツール


## プロジェクト概要
- **目的**: 週次に献立を生成し、NotionのDBにテンプレ準拠のページを作成する。
- **トリガ**: 手動実行（GitHub Actions workflow_dispatch）を想定、週1回目安。
- **使用技術**: React + TypeScript (Vite)、OpenAI API、Notion API。
- **出力編集性**: ページ本文は Notion ブロックで生成し、ユーザは自由に編集可能。
- **制約**: 曜日ごとのルール、全体方針（旬・時短等）、優先レシピサイトを守る。
- **コスト方針**: 追加 SaaS は使用せず、Actions 無料枠を想定。

## 主な機能

### 献立生成
- 候補プールから週次の献立を自動生成
- 食材プール機能で冷蔵庫にある食材を優先的に使用
- 必須食材の指定（最大2つまで）

### ロック＆再生成機能
- **献立枠のロック**: 気に入った献立を🔒マークで固定
- **未確定のみ再生成**: ロックした枠は保持したまま、他の枠だけを再生成
- **個別枠の再生成**: 気に入らない枠だけをピンポイントで差し替え
- **状態の永続化**: ロック状態を含む週次状態を自動保存

### その他の機能
- 主材料の自動推定と手動編集
- 金曜夜はスープ系レシピを優先
- 買い出しリスト生成（主材料ベース）
- Notion形式でのコピー機能

## 候補プールの運用（Bookmarklet方式）

外部サイトから候補URLを収集するために、Bookmarkletを使った運用を採用しています：

1. **一覧ページでBookmarklet実行**: お気に入りのレシピサイトの一覧ページでBookmarkletを実行し、候補URLをJSON化
2. **inboxにコミット**: `data/candidate_inbox/` にJSONファイルをコミット
3. **自動マージ**: GitHub Actionが自動的に重複排除して `public/candidate_pool.json` を更新

詳しい手順は [Bookmarklet利用ガイド](docs/bookmarklet/README.md) を参照してください。

### クイックスタート

```bash
# 候補プールを手動で更新（inboxファイルがある場合）
npm run merge:inbox

# テスト実行
npm test                          # 全テスト実行
npm run test:main-ingredient      # 主材料推定テスト
npm run test:weekly-state         # 週状態・再生成テスト
npm run test:filter-behavior      # フィルタ動作テスト
npm run test:merge-inbox          # inboxマージテスト
npm run test:merge-inbox:integration  # 統合テスト
```

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

### テスト

ユニットテストの実行：
```bash
npm test  # 全テスト実行（61テスト）
```

テストの詳細は [TESTING.md](docs/TESTING.md) を参照してください。

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
- **CI**: PR/Push時に自動的に test、lint、build を実行
- **Deploy**: `main` ブランチへのプッシュ時に GitHub Pages へ自動デプロイ

## テスト

プロジェクトには以下のユニットテストが含まれています：

- **主材料推定テスト** (34テスト): レシピタイトルから主材料（タンパク質）を正確に推定
- **週状態・部分再生成テスト** (12テスト): ロック機能と状態永続化の動作保証
- **フィルタ動作テスト** (15テスト): 主材料フィルタの優先挙動と候補不足時の緩和

詳細は [TESTING.md](docs/TESTING.md) を参照してください。