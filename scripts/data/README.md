# Scripts Data Directory

このディレクトリには、スクリプト実行に必要なデータファイルを配置します。

## 現在の運用

現在は **Bookmarklet方式** を採用しているため、このディレクトリに静的なfallbackデータは保持していません。

候補収集は以下の流れで行います：

1. レシピサイトでBookmarkletを実行してJSONを取得
2. `data/candidate_inbox/` にJSONファイルをコミット
3. GitHub Actionが自動的に重複排除して `public/candidate_pool.json` を更新

詳細は [Bookmarklet利用ガイド](../../docs/bookmarklet/README.md) を参照してください。

## 過去の運用（廃止済み）

以前は自動スクレイピング方式を採用しており、AWS WAF対策として `nadia-fallback.json` を保持していました。

詳細は [Legacy Documentation](../../docs/legacy/README.md) を参照してください。

