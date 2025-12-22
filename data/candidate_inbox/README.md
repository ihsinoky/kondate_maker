# 候補プール inbox

このディレクトリは、Bookmarkletで抽出した候補URLをコミットするための入力フォルダです。

## 運用フロー

1. レシピ一覧ページでBookmarkletを実行してJSON生成
2. 生成されたJSONをこのディレクトリに保存してコミット
3. GitHub Actionが自動的に `public/candidate_pool.json` へマージ

## ファイル命名規約

```
YYYYMMDD_<source>_<free>.json
```

### 例
- `20251221_nadia_rinaty_page1.json`
- `20251221_tsukuoki_soup.json`
- `20251222_shirohgan_winter.json`

### 命名ルール
- **YYYYMMDD**: 取得日（必須）
- **source**: ソースサイト名（例: nadia, tsukuoki, shirohgan）
- **free**: 自由記述（ページ番号、カテゴリ等）

## JSONフォーマット

### 推奨形式（ラッパー形式）

```json
{
  "generatedAt": "2025-12-21T12:34:56+09:00",
  "sourcePage": "https://example.com/list?page=1",
  "sourceHint": "nadia",
  "candidates": [
    { "title": "豚汁", "url": "https://..." },
    { "title": "けんちん汁", "url": "https://..." }
  ]
}
```

### 互換形式（配列形式）

```json
[
  { "title": "豚汁", "url": "https://..." },
  { "title": "けんちん汁", "url": "https://..." }
]
```

## フィールド定義

### 必須フィールド
- `title`: レシピタイトル（文字列）
- `url`: レシピURL（文字列）
- `source`: ソースサイト名（文字列） - 省略時はファイル名から自動補完

### 推奨フィールド
- `sourceHint`: ラッパー形式の場合のソースヒント

### 任意フィールド
- `tags`: タグ配列（文字列配列）
- `author`: 著者名（文字列）
- `timeText`: 調理時間テキスト（文字列）
- `capturedAt`: 取得日時（ISO 8601形式）
- `capturedFrom`: 取得元URL（文字列）

## 重複排除について

- マージスクリプトが自動的にURLを正規化して重複排除します
- 既存の候補が優先され、新規は未出のもののみ追加されます
- 正規化処理:
  - URL fragmentの除去 (`#...`)
  - 末尾スラッシュの正規化
  - トラッキングパラメータの除去 (`utm_*`, `fbclid` 等)

## トラブルシューティング

### JSONが壊れている
- JSON構文エラーがあるとGitHub Actionが失敗します
- [JSONLint](https://jsonlint.com/)等で検証してください

### 候補が追加されない
- URLが既に `public/candidate_pool.json` に存在する場合は追加されません
- 正規化後のURLで比較されるため、微妙に異なるURLでも重複と判定される場合があります

### 0件でも問題ない
- 候補数が0件でもワークフローは失敗しません（warning表示のみ）
- 定期的に新しい候補を追加してください
