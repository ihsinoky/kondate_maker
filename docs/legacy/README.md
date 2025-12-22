# Legacy Documentation

このディレクトリには、廃止された機能やアプローチに関するドキュメントを保管しています。

## 廃止された機能

### Generate Candidate Pool（自動スクレイピング方式）

**廃止日**: 2025-12-22

**理由**: 
- **WAF/自動化検出**: Nadia等のサイトがAWS WAFを導入し、Playwright等の自動化ツールを検出・ブロック
- **不安定性**: 外部サイトのDOM変更、ネットワークエラー、404等で頻繁に失敗
- **運用不一致**: 候補数閾値（<10でFail）が、小分け更新運用と噛み合わない
- **依存の重さ**: Playwright等の大きな依存がローカル/CI環境の負担に

**代替方法**: 
Bookmarklet方式に一本化。ブラウザで直接候補URLを収集し、`data/candidate_inbox/` にコミット後、自動マージで `public/candidate_pool.json` を更新。

**参考ドキュメント**:
- [Nadia WAF問題のインシデントレポート](../troubleshooting/INCIDENT-20251220-nadia-404.md)
- [P0-1 完了サマリー](./P0-1_COMPLETION_SUMMARY.md)（元の基盤実装記録）
- [P0-2 完了サマリー](./P0-2_COMPLETION_SUMMARY.md)（元のNadia実装記録）
- [候補プール生成の実行場所決定書](./CANDIDATE_POOL_EXECUTION.md)（元の設計書）

## 復活させる場合の条件

もし将来、自動スクレイピング方式を復活させる場合は、以下を満たす必要があります：

1. **公式API/RSS**: サイト運営側が公式にデータ提供する仕組みを用意
2. **WAF回避**: 完全なStealth技術でWAFを回避できる（ただし倫理的問題あり）
3. **代替ソース**: WAF保護のないサイトに絞って自動取得

現状では **Bookmarklet方式が最も確実かつ持続可能** と判断しています。

## 過去の実装ファイル（削除済み）

- `.github/workflows/generate-candidates.yml`
- `scripts/generate-candidates.ts`
- `scripts/scrapers/nadia.ts`
- `scripts/scrapers/nadia-verify.ts`
- `scripts/data/nadia-fallback.json`

これらのファイルは削除されましたが、Git履歴から復元可能です。
