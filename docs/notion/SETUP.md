# Notion 連携セットアップガイド

## 概要

このガイドでは、kondate_maker と Notion を連携させるための手順を説明します。

**前提条件**：
- Notion アカウントを持っていること
- Notion ワークスペースで Integration を作成する権限があること
- GitHub リポジトリの Settings にアクセスできること

## セットアップ手順

### ステップ1: Notion Integration の作成

1. **Notion の Integration ページにアクセス**
   - https://www.notion.so/my-integrations にアクセス
   - 「New integration」ボタンをクリック

2. **Integration の基本情報を入力**
   - **Name**: `kondate_maker` （または任意の名前）
   - **Logo**: （任意）プロジェクトのアイコンなど
   - **Associated workspace**: 対象のワークスペースを選択

3. **Capabilities（権限）の設定**
   - **Content Capabilities**:
     - ✅ Read content
     - ✅ Update content（将来の Write 実装用）
     - ✅ Insert content（将来の Write 実装用）
   - **Comment Capabilities**: （不要）
   - **User Capabilities**: （不要、データのみアクセス）

4. **Integration の作成を完了**
   - 「Submit」をクリック
   - **Internal Integration Token** が表示される
   - ⚠️ このトークンをコピーし、安全な場所に保管（後で使用）

### ステップ2: Notion データベースの作成

#### 2-1. Recipes データベースの作成

1. **新しいデータベースを作成**
   - Notion で新しいページを作成
   - 「Table - Full page」を選択
   - ページタイトルを「Recipes」に設定

2. **プロパティの設定**
   
   以下のプロパティを追加・設定します：

   | プロパティ名 | 型 | 設定 |
   |------------|-----|------|
   | Name | Title | （デフォルト、変更不要） |
   | URL | URL | 「Add a property」→「URL」を選択 |
   | Rating | Number | 「Add a property」→「Number」を選択、Format: Number |
   | Ingredients | Multi-select | 「Add a property」→「Multi-select」を選択 |
   | Category | Select | 「Add a property」→「Select」を選択 |
   | CookTimeMin | Number | 「Add a property」→「Number」を選択、Format: Number |
   | Active | Checkbox | 「Add a property」→「Checkbox」を選択 |

3. **Category の選択肢を設定**（任意）
   - Category プロパティをクリック
   - 以下の選択肢を追加：
     - 主菜
     - 副菜
     - 汁物
     - ご飯もの
     - その他

4. **サンプルレシピの追加**（動作確認用）
   
   以下のようなサンプルレシピを1〜2件追加すると、後の動作確認がスムーズです：
   
   | Name | URL | Rating | Category | CookTimeMin | Active |
   |------|-----|--------|----------|-------------|--------|
   | 豚の生姜焼き | https://example.com/shogayaki | 4 | 主菜 | 20 | ✅ |
   | 味噌汁 | https://example.com/misoshiru | 3 | 汁物 | 10 | ✅ |

#### 2-2. Meal Logs データベースの作成

1. **新しいデータベースを作成**
   - Notion で新しいページを作成
   - 「Table - Full page」を選択
   - ページタイトルを「Meal Logs」に設定

2. **プロパティの設定**
   
   | プロパティ名 | 型 | 設定 |
   |------------|-----|------|
   | Name | Title | （デフォルト、変更不要。後で非表示にしても可） |
   | Date | Date | 「Add a property」→「Date」を選択 |
   | Recipe | Relation | 「Add a property」→「Relation」を選択、Recipesデータベースを指定 |
   | RatingAfter | Number | 「Add a property」→「Number」を選択、Format: Number |
   | Memo | Text | 「Add a property」→「Text」を選択 |

3. **Relation の詳細設定**
   - **Recipe** プロパティをクリック
   - 「Relation to」で先ほど作成した「Recipes」データベースを選択
   - 「Show on Recipes」: オン（Recipes側から履歴を参照可能にする）
   - Recipes側に自動生成されるプロパティ名: 「Meal Logs」（デフォルト）

4. **サンプルログの追加**（動作確認用）
   
   | Date | Recipe | RatingAfter | Memo |
   |------|--------|-------------|------|
   | 2025-12-22 | 豚の生姜焼き | 5 | 美味しかった！ |
   | 2025-12-20 | 味噌汁 | 3 | いつも通り |

### ステップ3: Integration とデータベースを接続

⚠️ **重要**: Integration を作成しただけでは、データベースにアクセスできません。
明示的に「接続」する必要があります。

#### 3-1. Recipes データベースに Integration を接続

1. **Recipes データベースを開く**
2. 右上の「・・・」（More）メニューをクリック
3. 「Add connections」を選択
4. 作成した Integration（`kondate_maker`）を選択
5. 「Confirm」をクリック

#### 3-2. Meal Logs データベースに Integration を接続

1. **Meal Logs データベースを開く**
2. 右上の「・・・」（More）メニューをクリック
3. 「Add connections」を選択
4. 作成した Integration（`kondate_maker`）を選択
5. 「Confirm」をクリック

⚠️ この手順を忘れると、API 呼び出し時に `404 Not Found` エラーが発生します。

### ステップ4: data_source_id の取得

#### 4-1. Recipes の data_source_id を取得

1. **Recipes データベースを開く**
2. 右上の「・・・」（More）メニューをクリック
3. **「Manage data sources」**セクションを探す（メニュー下部）
4. データソースの横にある三点メニュー（⋮）から **「Copy data source ID」** を選択
5. クリップボードにコピーされた ID（UUID形式）をメモ帳などに保存

   例: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   
   💡 **ヒント**: シンプルなデータベース（単一データソース）の場合、「・・・」メニューに直接「Copy data source ID」が表示されることもあります。

#### 4-2. Meal Logs の data_source_id を取得

1. **Meal Logs データベースを開く**
2. 右上の「・・・」（More）メニューをクリック
3. **「Manage data sources」**セクションを探す（メニュー下部）
4. データソースの横にある三点メニュー（⋮）から **「Copy data source ID」** を選択
5. クリップボードにコピーされた ID をメモ帳などに保存

### ステップ5: GitHub Secrets / Variables の設定

#### 5-1. GitHub リポジトリの Settings を開く

1. GitHub リポジトリ（`ihsinoky/kondate_maker`）を開く
2. 「Settings」タブをクリック
3. 左サイドバーの「Secrets and variables」→「Actions」を選択

#### 5-2. Secrets の追加

「Secrets」タブで以下を追加：

1. **NOTION_TOKEN**
   - 「New repository secret」をクリック
   - Name: `NOTION_TOKEN`
   - Value: ステップ1で取得した Integration Token
   - 「Add secret」をクリック

2. **NOTION_RECIPES_DATA_SOURCE_ID**
   - 「New repository secret」をクリック
   - Name: `NOTION_RECIPES_DATA_SOURCE_ID`
   - Value: ステップ4-1で取得した Recipes の data_source_id
   - 「Add secret」をクリック

3. **NOTION_MEAL_LOGS_DATA_SOURCE_ID**
   - 「New repository secret」をクリック
   - Name: `NOTION_MEAL_LOGS_DATA_SOURCE_ID`
   - Value: ステップ4-2で取得した Meal Logs の data_source_id
   - 「Add secret」をクリック

#### 5-3. Variables の追加（オプション）

data_source_id を Secrets ではなく Variables で管理する場合：

1. 「Variables」タブに切り替え
2. 上記の `NOTION_RECIPES_DATA_SOURCE_ID` と `NOTION_MEAL_LOGS_DATA_SOURCE_ID` を Variables として追加
3. ⚠️ `NOTION_TOKEN` は必ず Secrets で管理すること

### ステップ6: 動作確認（M1実装後）

M1実装後、以下の手順で動作確認を行います：

1. **GitHub Actions を手動実行**
   - GitHub リポジトリの「Actions」タブを開く
   - M1で実装されるワークフロー（例: `notion-sync`）を選択
   - 「Run workflow」をクリック

2. **ログで確認**
   - Workflow の実行ログを確認
   - Recipes と Meal Logs からデータが正常に取得できていることを確認
   - エラーが発生した場合は「トラブルシューティング」を参照

3. **生成された献立を確認**
   - 献立生成アプリで「献立を作る」を実行
   - Recipes から取得したレシピが候補に含まれていることを確認
   - Meal Logs の履歴に基づき、直近のレシピが抑制されていることを確認

## トラブルシューティング

### エラー: `404 Could not find data source`

**原因**: Integration がデータベースに接続されていない

**解決方法**:
1. ステップ3を再確認
2. Notion の該当データベースを開く
3. 右上の「・・・」メニューから「Connections」を確認
4. Integration が接続されていない場合、「Add connections」で追加

### エラー: `401 Unauthorized`

**原因**: Integration Token が無効、または設定されていない

**解決方法**:
1. GitHub Secrets の `NOTION_TOKEN` が正しく設定されているか確認
2. Notion の Integration ページで Token を再発行
3. GitHub Secrets を更新

### エラー: `validation_error` (プロパティ不一致)

**原因**: Notion データベースのプロパティ名や型が、コードの期待と異なる

**解決方法**:
1. `docs/notion/SCHEMA.md` を参照し、プロパティ名と型を確認
2. Notion データベースのプロパティを修正
3. 特に以下を確認：
   - プロパティ名のスペルミス（大文字小文字も区別される）
   - 型の不一致（Number vs Text など）

### data_source_id が見つからない

**原因**: Notion の UI バージョンや表示状態によって「Copy data source ID」の場所が異なる場合がある

**解決方法**:
1. **メニューの確認**:
   - データベースの「・・・」メニューを開く
   - 下部の「Manage data sources」セクションを展開
   - 各データソースの三点メニュー（⋮）から「Copy data source ID」を探す

2. **URL から取得**（代替方法）:
   - データベースを開いた状態で URL を確認
   - `https://www.notion.so/{workspace}/{id}?v=...`
   - `id` の部分（32文字の16進数）をコピー
   - ハイフンを挿入して UUID 形式に変換: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   
   ⚠️ **注意**: URL の ID は database_id の場合もあるため、この方法は確実ではありません。可能な限りメニューから「Copy data source ID」を使用してください。

3. **Notion API で確認**（開発者向け）:
   ```bash
   curl -X GET 'https://api.notion.com/v1/databases/{database_id}' \
     -H 'Authorization: Bearer YOUR_TOKEN' \
     -H 'Notion-Version: 2025-09-03'
   ```
   レスポンスの `data_sources` 配列に各データソースの ID が含まれています。

## 次のステップ

セットアップが完了したら：

1. **M1 Issue** の実装を進める
   - Recipes データソースからのレシピ取得
   - Meal Logs からの直近履歴取得
   - 献立生成ロジックへの統合

2. **テストデータの拡充**
   - Recipes に実際のレシピを登録（10〜20件程度）
   - Meal Logs に過去の履歴を記録（直近抑制のテスト用）

3. **運用の開始**
   - 定期的に Recipes に新しいレシピを追加
   - 献立を作成し、Meal Logs に記録
   - 食後評価（RatingAfter）を記録し、Recipes の Rating を更新

## 参考リンク

- [Notion API Documentation](https://developers.notion.com/)
- [Notion API Reference (2025-09-03)](https://developers.notion.com/reference/intro)
- [Data source concept in Notion API](https://developers.notion.com/docs/working-with-databases)

## 変更履歴
- 2025-12-29: 初版作成（M0 完了）
