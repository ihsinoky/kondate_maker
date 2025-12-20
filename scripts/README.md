# 候補プール生成スクリプト

## 実行場所の決定（P0-1）

**候補取得/解析の実行場所：GitHub Actions（workflow_dispatch で手動実行）**

### 決定理由

1. **CORS問題の回避**：ブラウザ（iPhone）から外部サイトHTMLを直接fetchするとCORSエラーが発生する可能性が高い
2. **安定性**：サーバー側で実行することで、外部サイトへの安定したアクセスが可能
3. **運用コスト**：GitHub Actionsの無料枠内で手動実行（週1回目安）により、追加コストなしで運用可能
4. **既存スタックとの整合性**：既存のCI/CDパイプライン（GitHub Actions + GitHub Pages）に統合可能

### 更新頻度

- **週1回目安、手動で更新**（Sprint 2 Q2決定事項）
- 自動スケジュール（cron）前提にはしない
- workflow_dispatch による手動実行

## ファイル構成

```
scripts/
├── README.md                    # このファイル
├── tsconfig.json                # TypeScript設定
├── types.ts                     # 候補プールの型定義
└── generate-candidates.ts       # 候補プール生成スクリプト
```

## 候補プールの型定義

```typescript
interface CandidateRecipe {
  title: string;       // レシピタイトル
  url: string;         // レシピURL
  source: string;      // ソースサイト名
  timeText?: string;   // 調理時間テキスト（任意）
  tags?: string[];     // タグ（任意）
  author?: string;     // 著者名（任意）
}
```

## ローカルでの実行方法

```bash
# 依存関係のインストール
npm ci

# 候補プール生成
npm run generate:candidates
```

生成されたファイル：`public/candidate_pool.json`

## GitHub Actions での実行方法

1. GitHubリポジトリの **Actions** タブを開く
2. **Generate Candidate Pool** ワークフローを選択
3. **Run workflow** ボタンをクリック
4. 実行理由（任意）を入力して実行

### ワークフローの動作

1. 依存関係のインストール
2. 候補プール生成スクリプトの実行
3. `public/candidate_pool.json` の生成
4. 変更がある場合、自動的にコミット・プッシュ
5. 実行結果のサマリー表示

### エラーハンドリング

- 生成に失敗しても、ワークフロー全体は失敗にならない
- エラーメッセージとスタックトレースがログに記録される
- 警告として表示され、問題の追跡が可能

## GitHub Pages での配信

生成された `public/candidate_pool.json` は：

1. リポジトリにコミットされる
2. デプロイワークフローで `dist/` にコピーされる
3. GitHub Pages で配信される

アクセスURL：
```
https://ihsinoky.github.io/kondate_maker/candidate_pool.json
```

## 実装状況

### ✓ 完了
- **P0-1**: 候補プール生成の基盤（GitHub Actions実行環境）
- **P0-2**: Nadia（りなてぃ）候補取得

### 今後の拡張（P0-3〜P0-5）

今後以下の実装を予定：

- **P0-3**: つくおき候補取得
- **P0-4**: 白ごはん.com候補取得（最低限）
- **P0-5**: 候補プールキャッシュ

## Nadia候補取得の詳細（P0-2）

### 取得対象
- りなてぃのユーザーページ（ID: 236306）
- 複数ページから取得（デフォルト: 2ページ）
- 目標: 50件以上の候補

### 取得方式
- 一覧/検索結果ページから抽出（詳細ページは不使用）
- HTML構造変更に強い実装（複数のセレクタパターンを試行）
- タイムアウト設定: 10秒/リクエスト
- User-Agent設定: 礼儀正しい識別用

### エラーハンドリング
- ネットワークエラー: 警告ログを出力し、0件で継続
- ページ取得失敗: 次のページへ継続
- パース失敗: 個別レシピをスキップして継続
- 全体失敗: 空配列を返してパイプライン継続

### 出力フィールド
- `title`: レシピタイトル
- `url`: レシピURL（実在形式: https://oceans-nadia.com/recipe/...）
- `source`: "Nadia"
- `author`: "りなてぃ"

### 検証方法
```bash
# スクレイピングロジックの検証（モックHTML使用）
npx tsx scripts/scrapers/nadia-verify.ts

# 実際の候補取得（ネットワークアクセスあり）
npm run generate:candidates
```

## トラブルシューティング

### ワークフローが失敗する場合

1. Actions タブでログを確認
2. エラーメッセージとスタックトレースを確認
3. 外部サイトのアクセス制限やタイムアウトの可能性を検討

### 候補プールが更新されない場合

1. ワークフローが正常に完了しているか確認
2. `public/candidate_pool.json` にコミットがあるか確認
3. デプロイワークフローが実行されているか確認

## 関連ドキュメント

- [docs/sprints/SPRINT_02.md](../docs/sprints/SPRINT_02.md) - Sprint 2 の決定事項
- [docs/RISKS.md](../docs/RISKS.md) - CORS/HTML変更/負荷リスク
- [docs/BACKLOG.md](../docs/BACKLOG.md) - P0-1, P0-5 の詳細
