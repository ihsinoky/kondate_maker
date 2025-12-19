# 未決事項（PO確認待ち／実装方針確定が必要）

以下は、Sprint 2の方式B（サイト検索／一覧からURL取得）を確実に進めるための確認事項。

**注記**: Q2〜Q5は決定済み。詳細は `docs/sprints/SPRINT_02.md` の「決定事項（Q2〜Q5）」セクションを参照。

## Q1 技術スタックとデプロイ先
- 現状のフロント実装は何ですか？（例：Next.js / Vite+React / SvelteKit など）
- デプロイ先はどこですか？（例：Vercel / Cloudflare Pages / GitHub Pages など）

目的：
- 外部サイトのHTML取得・解析を「どこで実行するか」を確定するため。
  - ブラウザ直取得が難しい場合、API Route / Serverless / Build時生成 / GitHub Actions などの選択が必要。

## Q2 候補の更新頻度 ✅ 決定済み
**決定**: 週1回目安、手動で更新する（GitHub Actions workflow_dispatch）

詳細は `docs/sprints/SPRINT_02.md` のセクション0を参照。

## Q3 ソース優先順位の"強さ" ✅ 決定済み
**決定**: りなてぃは「食材条件にヒットするなら優遇」くらい（同点/近似点のタイブレーク程度）

詳細は `docs/sprints/SPRINT_02.md` のセクション0を参照。

## Q4 旬食材（使い回し）の扱い ✅ 決定済み
**決定**: 「必須食材」=「食材プール」として統一。生成時に入力し、最大2つまでmust指定可能。

詳細は `docs/sprints/SPRINT_02.md` のセクション0を参照。

## Q5 端末間共有の対象 ✅ 決定済み
**決定**: 食材プールは保存/共有しない。Sprint2では端末間共有はやらない。

詳細は `docs/sprints/SPRINT_02.md` のセクション0を参照。
  