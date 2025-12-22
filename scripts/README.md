# 候補プール管理スクリプト

## 運用方針（Bookmarklet + Inbox Merge）

**候補収集方法：Bookmarklet でブラウザから直接収集 → Inbox経由でマージ**

### 運用フロー

1. **Bookmarkletで候補収集**：レシピサイトの一覧ページでBookmarkletを実行してJSONを取得
2. **Inboxにコミット**：`data/candidate_inbox/` にJSONファイルをコミット
3. **自動マージ**：GitHub Actionが自動的に重複排除して `public/candidate_pool.json` を更新

詳しい手順は [Bookmarklet利用ガイド](../docs/bookmarklet/README.md) を参照してください。

### この方式を採用した理由

1. **確実性**：ブラウザで表示できるページなら確実にURLを収集できる
2. **WAF回避**：手動操作なので自動化検出されない
3. **小分け更新**：少数の候補を段階的に追加できる
4. **低コスト**：Playwright等の重い依存が不要

## ファイル構成

```
scripts/
├── README.md                    # このファイル
├── tsconfig.json                # TypeScript設定
├── types.ts                     # 候補プールの型定義
├── merge-inbox.ts               # inbox マージスクリプト
├── merge-inbox.test.ts          # ユニットテスト
└── merge-inbox.integration.test.ts  # 統合テスト
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

# inbox を candidate_pool.json にマージ
npm run merge:inbox

# テスト実行
npm run test:merge-inbox
npm run test:merge-inbox:integration
```

## GitHub Actions での自動実行

`data/candidate_inbox/` にJSONファイルがコミット（push）されると、自動的に以下が実行されます：

1. **Merge Inbox to Candidate Pool** ワークフローが起動
2. inbox内のすべてのJSONを読み込み
3. 既存の `public/candidate_pool.json` と重複排除マージ
4. 変更がある場合、自動的にコミット・プッシュ
5. 実行結果のサマリー表示

### ワークフローの特徴

- **自動起動**：inbox配下に`.json`ファイルがpushされると自動実行
- **重複排除**：URLを正規化して重複を自動排除
- **差分コミット**：新規候補がある場合のみコミット
- **低閾値**：候補数が5件未満でも警告のみ（Failしない）

## GitHub Pages での配信

生成された `public/candidate_pool.json` は：

1. リポジトリにコミットされる
2. デプロイワークフローで `dist/` にコピーされる
3. GitHub Pages で配信される

アクセスURL：
```
https://ihsinoky.github.io/kondate_maker/candidate_pool.json
```

## Inbox JSON フォーマット

Bookmarkletが生成するJSON形式：

```json
{
  "generatedAt": "2025-12-21T12:34:56.789Z",
  "sourcePage": "https://oceans-nadia.com/user/236306",
  "sourceHint": "nadia",
  "candidates": [
    {
      "title": "レシピタイトル",
      "url": "https://oceans-nadia.com/user/236306/recipe/516001"
    }
  ]
}
```

### フィールド説明

- `generatedAt`: JSON生成日時（ISO 8601形式）
- `sourcePage`: 抽出元のページURL
- `sourceHint`: ソースサイトのヒント（例: "nadia", "tsukuoki", "shirohgan"）
- `candidates`: 候補の配列
  - `title`: レシピタイトル（100文字まで）
  - `url`: レシピURL（絶対URL）

### マージ処理

1. **URL正規化**：
   - フラグメント（`#...`）を除去
   - トラッキングパラメータ（`utm_*`, `fbclid`, `gclid`）を除去
   - 末尾スラッシュの正規化

2. **重複排除**：
   - 正規化されたURLで重複判定
   - 既存の候補プールと照合
   - 新規URLのみを追加

3. **ソース推定**：
   - `sourceHint` から適切な `source` フィールドを生成
   - 例: "nadia" → "Nadia"

## トラブルシューティング

### ワークフローが失敗する場合

1. **Actions タブでログを確認**
   - "Merge Inbox to Candidate Pool" ワークフローを確認
   - エラーメッセージを確認

2. **JSONフォーマットを確認**
   - inbox内のJSONファイルが正しい形式か確認
   - 必須フィールド（`candidates` 配列）が存在するか確認

3. **ローカルで再現**
   ```bash
   npm run merge:inbox
   ```

### 候補プールが更新されない場合

1. **重複チェック**：すべて既存候補と重複している可能性
2. **ワークフロー確認**：Actions タブで実行履歴を確認
3. **デプロイ確認**：デプロイワークフローが実行されているか確認

## 関連ドキュメント

- [Bookmarklet利用ガイド](../docs/bookmarklet/README.md) - 候補収集の詳細手順
- [docs/PROCESS.md](../docs/PROCESS.md) - 運用プロセス全体
- [docs/legacy/](../docs/legacy/) - 過去の自動スクレイピング方式（廃止済み）
