# Bookmarklet で候補URLを抽出する

このガイドでは、レシピ一覧ページから Bookmarklet を使って候補URLを抽出し、JSON形式で取得する方法を説明します。

## Bookmarklet とは

ブックマークに保存されたJavaScriptコードで、クリックするだけで現在のページでスクリプトを実行できます。

## 使い方（概要）

1. 以下のBookmarkletコードをブックマークに登録
2. レシピ一覧ページを開く
3. ブックマークからBookmarkletを実行
4. 抽出されたJSONをコピー
5. `data/candidate_inbox/` に保存してコミット

---

## Bookmarklet コード

以下のコードを1行にまとめてブックマークのURLに設定してください：

```javascript
javascript:(function(){const links=Array.from(document.querySelectorAll('a[href]'));const candidates=[];const seen=new Set();links.forEach(a=>{try{const url=new URL(a.href,location.href).toString();if(seen.has(url))return;seen.add(url);const title=(a.textContent||a.title||'').trim();if(title&&url.startsWith('http')){candidates.push({title:title.substring(0,100),url:url});}}catch(e){}});const data={generatedAt:new Date().toISOString(),sourcePage:location.href,sourceHint:location.hostname.replace(/^(www\.|oceans-)/,'').split('.')[0],candidates:candidates};const json=JSON.stringify(data,null,2);if(candidates.length===0){alert('候補が見つかりませんでした。\\nページにリンクがあるか確認してください。');}else{const msg=`${candidates.length}件の候補を抽出しました。\\nJSONをコピーしてください。`;if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(json).then(()=>alert(msg+'\\n\\nクリップボードにコピーしました！')).catch(()=>prompt(msg,json));}else{prompt(msg,json);}}})();
```

### コードの整形版（参考）

```javascript
(function() {
  // ページ内の全リンクを取得
  const links = Array.from(document.querySelectorAll('a[href]'));
  const candidates = [];
  const seen = new Set();
  
  // 各リンクから候補を抽出
  links.forEach(a => {
    try {
      // 相対URLを絶対URLに変換
      const url = new URL(a.href, location.href).toString();
      
      // 重複チェック
      if (seen.has(url)) return;
      seen.add(url);
      
      // タイトル取得（リンクテキストまたはtitle属性）
      const title = (a.textContent || a.title || '').trim();
      
      // 有効な候補として追加
      if (title && url.startsWith('http')) {
        candidates.push({
          title: title.substring(0, 100),  // 長すぎるタイトルは切り詰め
          url: url
        });
      }
    } catch (e) {
      // URL解析エラーは無視
    }
  });
  
  // JSON生成（ラッパー形式）
  const data = {
    generatedAt: new Date().toISOString(),
    sourcePage: location.href,
    sourceHint: location.hostname.replace(/^(www\.|oceans-)/, '').split('.')[0],
    candidates: candidates
  };
  
  const json = JSON.stringify(data, null, 2);
  
  // 結果を表示
  if (candidates.length === 0) {
    alert('候補が見つかりませんでした。\nページにリンクがあるか確認してください。');
  } else {
    const msg = `${candidates.length}件の候補を抽出しました。\nJSONをコピーしてください。`;
    
    // クリップボードにコピー（可能なら）
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json)
        .then(() => alert(msg + '\n\nクリップボードにコピーしました！'))
        .catch(() => prompt(msg, json));
    } else {
      // フォールバック：prompt表示
      prompt(msg, json);
    }
  }
})();
```

---

## iPhone Safari での登録手順

### 1. 準備：テキストをコピー

上記の1行コード（`javascript:(function(){...`で始まる長いコード）を選択してコピーします。

### 2. ダミーブックマークを作成

1. Safari で適当なページ（例: https://www.google.com）を開く
2. 共有ボタン（四角と矢印のアイコン）をタップ
3. 「ブックマークを追加」をタップ
4. 名前を「候補抽出」などに変更
5. 保存場所を選択して「保存」

### 3. ブックマークを編集

1. Safari でブックマークアイコン（本のアイコン）をタップ
2. 先ほど作成した「候補抽出」ブックマークを見つける
3. 右下の「編集」をタップ
4. ブックマークをタップして編集画面を開く
5. URL欄の内容を全削除
6. コピーしたBookmarkletコードを貼り付け
7. 「完了」をタップ

### 4. 使用方法

1. レシピ一覧ページ（例: Nadiaのりなてぃさんのレシピ一覧）を開く
2. アドレスバーをタップ
3. 「候補抽出」ブックマークをタップ
4. 抽出された候補数が表示される
5. JSONがクリップボードにコピーされる（または prompt で表示される）

### 5. JSONを保存

1. メモアプリなどに貼り付け
2. iCloud経由でPCに転送、または直接GitHubで編集
3. `data/candidate_inbox/YYYYMMDD_source_description.json` として保存
4. コミット＆プッシュ

---

## PC（Chrome / Firefox / Edge）での登録手順

### 1. ブックマークバーを表示

- **Chrome**: `Ctrl+Shift+B` (Windows) または `Cmd+Shift+B` (Mac)
- **Firefox**: `Ctrl+Shift+B` (Windows) または `Cmd+Shift+B` (Mac)
- **Edge**: 設定 → 外観 → お気に入りバーの表示

### 2. ブックマークを追加

1. ブックマークバーの任意の場所で右クリック
2. 「ページを追加」または「ブックマークを追加」を選択
3. 名前: 「候補抽出」
4. URL: 上記の1行コードを貼り付け
5. 保存

### 3. 使用方法

1. レシピ一覧ページを開く
2. ブックマークバーの「候補抽出」をクリック
3. JSONがクリップボードにコピーされる（または prompt で表示される）
4. テキストエディタに貼り付けて保存

---

## 抽出のコツ

### 良い結果を得るために

- **一覧ページで実行**: 個別レシピページではなく、複数のレシピが並んでいるページで実行
- **スクロールしてから実行**: 無限スクロールの場合は、下にスクロールして表示させてから実行
- **ページングを活用**: ページ2、ページ3など、複数回実行して異なるJSONを作成

### 抽出される候補について

- ページ内の**すべてのリンク**が対象になります
- レシピ以外のリンク（ナビゲーション、広告等）も含まれる可能性があります
- 重複は自動的に除去されます
- マージスクリプトが最終的に重複排除するため、多少ノイズが混ざっても問題ありません

---

## トラブルシューティング

### 候補が0件と表示される

**原因**: ページにリンクがない、またはJavaScriptで動的に生成されている

**対処法**:
- ページが完全に読み込まれるまで待つ
- スクロールして画面外の要素を読み込む
- 別の一覧ページを試す

### クリップボードにコピーされない

**原因**: ブラウザのセキュリティ設定でクリップボードアクセスがブロックされている

**対処法**:
- prompt ダイアログが表示されるので、そこから手動でコピー
- ブラウザの設定で該当サイトのクリップボードアクセスを許可

### JSONが壊れている

**原因**: コピー＆ペースト時に文字化けや改行が壊れた

**対処法**:
- [JSONLint](https://jsonlint.com/) で検証
- prompt から再度コピーし直す
- 改行やエスケープ文字を修正

### レシピ以外のリンクが大量に含まれる

**原因**: ページの構造上、ナビゲーションや広告のリンクも抽出される

**対処法**:
- マージスクリプトが重複排除するので、そのままでもOK
- 手動で不要な候補を削除してもOK
- 正規のレシピURLだけを残すフィルタリングは今後の改善として検討

---

## サンプルワークフロー

### Nadia（りなてぃさん）から候補を抽出

1. https://oceans-nadia.com/user/236306 を開く
2. Bookmarkletを実行
3. `20251221_nadia_rinaty_page1.json` として保存
4. 下にスクロールして次のレシピを表示
5. 再度Bookmarkletを実行
6. `20251221_nadia_rinaty_page2.json` として保存
7. コミット＆プッシュ
8. GitHub Actionが自動的に `public/candidate_pool.json` を更新

### つくおきから候補を抽出

1. https://cookien.com/recipes/ を開く
2. カテゴリ（例: スープ）を選択
3. Bookmarkletを実行
4. `20251221_tsukuoki_soup.json` として保存
5. コミット＆プッシュ

---

## 次のステップ

1. iPhone または PC で Bookmarklet を登録
2. お気に入りのレシピサイトで試してみる
3. 抽出されたJSONを `data/candidate_inbox/` に保存
4. GitHub にコミットして自動マージを確認

質問や問題があれば、Issues に報告してください！
