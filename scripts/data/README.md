# Scraper Data Directory

このディレクトリには、スクレイパーが使用する静的データやfallbackデータを保管しています。

## ファイル一覧

### nadia-fallback.json
**用途**: Nadia候補取得のfallbackデータ（AWS WAF対策）

**背景**:  
oceans-nadia.com は AWS WAF (Web Application Firewall) で保護されており、
Playwright等の自動化ツールによるアクセスが検出・ブロックされます。
WAFにより自動取得ができない場合、このfallbackデータを使用します。

**内容**:
- りなてぃのレシピ 50件
- 手動でキュレーション（2025-12-20時点）
- title, url, source, author フィールドを含む

**更新方法**:
1. 手動でNadia（りなてぃのページ）からレシピを収集
2. JSONフォーマットに整形
3. lastUpdated フィールドを更新
4. 最低でも週1回程度の更新を推奨

**形式**:
```json
{
  "note": "説明文",
  "source": "Nadia (りなてぃ)",
  "lastUpdated": "YYYY-MM-DD",
  "updateMethod": "manual",
  "recipes": [
    {
      "title": "レシピタイトル",
      "url": "https://oceans-nadia.com/user/22602/recipe/XXXXXX",
      "source": "Nadia",
      "author": "りなてぃ"
    }
  ]
}
```

## 関連ドキュメント

- [Nadia WAF問題のインシデントレポート](../../docs/troubleshooting/INCIDENT-20251220-nadia-404.md)
- [Nadiaスクレイパー実装](../scrapers/nadia.ts)
- [候補プール生成スクリプト](../generate-candidates.ts)
