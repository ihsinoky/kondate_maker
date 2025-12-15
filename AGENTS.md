# AGENTS.md

## Goal
- Prefer small PRs (one issue = one PR).
- Follow existing patterns; do not invent new architecture without discussion.

## How to run
- Install: <fill in>
- Dev: <fill in>
- Test: <fill in>
- Lint/Format: <fill in>

## Definition of Done
- Tests pass.
- Error cases are handled (at least: auth, empty data).
- Update docs if behavior changes.

## Safety / non-goals
- Do not change authentication flow without explicit instruction.
- Avoid adding new dependencies unless necessary.


## プロジェクト概要
- **目的**: 週次に献立を自動生成し、NotionのDBにテンプレ準拠のページを作成する。
- **トリガ**: GitHub Actions（週1回、JST 日曜18:00）で実行。
- **使用技術**: Python 3.11、OpenAI API、Notion API。
- **出力編集性**: ページ本文は Notion ブロックで生成し、ユーザは自由に編集可能。
- **制約**: 曜日ごとのルール、全体方針（旬・時短等）、優先レシピサイトを守る。
- **コスト方針**: 追加 SaaS は使用せず、Actions 無料枠を想定。

## ディレクトリ構成
- `README.md` — プロジェクト概要
- 今後、ソースコードは `src/`、設定は `.github/` 配下に配置予定

## コーディング規約
- Python 3.11 を対象
- PEP 8 に準拠し、型ヒントを付与する
- 必要に応じて `black` や `isort` などの自動整形ツールを利用する

## テスト・ビルド手順
- GitHub Actions の workflow を追加した場合は、ローカルで `act -n` を実行し、Actions が実行可能であることを確認する
- その他の単体テストは `pytest` を想定（今後追加）
