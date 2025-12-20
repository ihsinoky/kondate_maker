# Troubleshooting & Incident Reports

このディレクトリには、システムで発生した問題の調査記録とインシデントレポートを保管しています。

## 目的

1. **問題解決の記録**: 発生した問題、調査プロセス、解決策を時系列で記録
2. **再発防止**: 同様の問題が再発した際の参照資料
3. **ナレッジ共有**: チーム内での知見の共有と学習

## インシデントレポート一覧

### 2025-12-20: Nadia候補取得が404/WAFで失敗
- **ファイル**: [INCIDENT-20251220-nadia-404.md](./INCIDENT-20251220-nadia-404.md)
- **概要**: AWS WAFによる自動化ブラウザ検出により、Nadia候補が取得できない
- **影響**: Critical (P0) - 候補プール生成が0件
- **ステータス**: 解決済み（fallbackデータで対応）
- **根本原因**: oceans-nadia.com が AWS WAF を導入し、Playwright等の自動化ツールを検出・ブロック
- **対策**: 
  - Playwright導入（WAFチャレンジ対応試行）
  - fallbackデータ（手動キュレーション50件）実装
  - 詳細ログ出力とhostnameガード追加
  - インシデント文書化

## インシデントレポートの形式

各インシデントレポートには以下のセクションを含めることを推奨します：

1. **Summary**: 問題の概要、影響、ステータス、根本原因
2. **Impact**: ビジネス影響と技術的影響
3. **Timeline**: 調査の時系列記録（仮説・アクション・結果・判断）
4. **Root Cause**: 根本原因の詳細分析
5. **What Worked / What Didn't**: 試したことの成功・失敗
6. **Preventive Actions**: 再発防止策（実施済み・検討中）
7. **Recommendations**: 短期・中期・長期の推奨事項
8. **Follow-ups**: 残タスク
9. **Lessons Learned**: 学んだこと

## 関連ドキュメント

- [Sprint 2 決定事項](../sprints/SPRINT_02.md)
- [P0-2 完了サマリー](../P0-2_COMPLETION_SUMMARY.md)
- [バックログ](../BACKLOG.md)
