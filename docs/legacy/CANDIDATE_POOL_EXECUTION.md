# 候補プール生成の実行場所決定書（P0-1）

## 結論：GitHub Actions（workflow_dispatch）による手動実行

### 実行場所の明文化

**候補取得/解析の実行場所：GitHub Actions**

- **実行トリガー**: workflow_dispatch（手動実行）
- **更新頻度**: 週1回目安（Sprint 2 Q2決定事項）
- **ワークフロー**: `.github/workflows/generate-candidates.yml`
- **生成スクリプト**: `scripts/generate-candidates.ts`
- **出力先**: `public/candidate_pool.json`

### 選定理由

#### 1. CORS問題の回避
- ブラウザ（iPhone Safari）から外部サイトHTMLを直接fetchするとCORSエラーが発生
- サーバー側（GitHub Actions）で実行することで、この問題を完全に回避

#### 2. 既存スタックとの整合性
- 既存のCI/CD: GitHub Actions + GitHub Pages
- 新規のインフラ導入が不要
- デプロイパイプラインへの統合が容易

#### 3. 運用コスト
- GitHub Actionsの無料枠内で運用可能
- 週1回の手動実行のため、実行時間も十分
- 追加のSaaS契約不要

#### 4. 安定性と追跡性
- Actions のログで実行履歴を追跡可能
- エラー発生時の原因究明が容易
- タイムアウト設定により、長時間実行を防止

### 実行フロー

```
1. リポジトリ Actions タブで "Generate Candidate Pool" を選択
   ↓
2. "Run workflow" で手動実行
   ↓
3. スクリプトが外部サイトから候補を取得・解析
   ↓
4. public/candidate_pool.json を生成
   ↓
5. 変更をコミット・プッシュ
   ↓
6. Deploy workflow が自動トリガー
   ↓
7. GitHub Pages で配信
```

### 配信経路

生成されたファイルの配信フロー：

```
scripts/generate-candidates.ts
  ↓ (生成)
public/candidate_pool.json
  ↓ (コミット)
GitHub Repository
  ↓ (npm run build で自動コピー)
dist/candidate_pool.json
  ↓ (GitHub Pages デプロイ)
https://ihsinoky.github.io/kondate_maker/candidate_pool.json
```

### エラーハンドリング

#### ワークフローレベル
- タイムアウト: 15分
- `continue-on-error: true` による部分失敗の許容
- 生成失敗時も警告表示でワークフロー継続

#### スクリプトレベル
- try-catch による例外捕捉
- エラーメッセージとスタックトレースのログ出力
- 非ゼロ終了コードでエラー通知

#### ログによる追跡
- Actions の Summary にて生成結果を表示
- 候補数、エラー内容を可視化
- 失敗理由がログで追える

### セキュリティ・制限事項

#### レート制限対策
- 週1回の手動実行により、外部サイトへの負荷を最小化
- 将来的に取得件数の上限設定を実装予定（P0-2〜P0-4）

#### タイムアウト設定
- ワークフロー全体: 15分
- 将来的に個別の外部アクセスにもタイムアウト設定予定

#### パーミッション
- `contents: write`: 生成したファイルをコミットするために必要
- 最小権限の原則に従った設定

### 今後の拡張性

#### P0-2〜P0-4: 実際の外部サイト取得
現在はサンプルデータを生成していますが、以下の実装を予定：
- Nadia（りなてぃ）候補取得
- つくおき候補取得
- 白ごはん.com候補取得

#### P0-5: 候補プールキャッシュ
- 端末側でのキャッシュ実装
- 毎回の外部アクセスを不要に

#### 将来的な選択肢
- cron による自動実行（必要に応じて）
- Vercel Serverless Functions への移行（スケール時）
- API化（リアルタイム取得が必要な場合）

### 関連リソース

- ワークフロー定義: `.github/workflows/generate-candidates.yml`
- 生成スクリプト: `scripts/generate-candidates.ts`
- 型定義: `scripts/types.ts`
- 使用方法: `scripts/README.md`
- Sprint 2 決定事項: `docs/sprints/SPRINT_02.md`
- リスク分析: `docs/RISKS.md` (R2: CORS・取得経路の問題)

### 受け入れ条件の達成状況

- [x] 候補取得/解析の実行場所が明文化される（GitHub Actions手動実行）
- [x] workflow_dispatch で手動実行でき、candidate_pool.json が生成される
- [x] 失敗してもActionsが落ちっぱなしにならず、失敗理由がログで追える
- [x] 生成物がGitHub Pagesの配信対象に含まれる（public/配下に配置）

---

**最終更新**: 2025-12-19  
**決定者**: Sprint 2 チーム（docs/sprints/SPRINT_02.md Q2に基づく）
