# Manual Testing Guide for M1 Validation

This guide provides step-by-step instructions for manually testing all M1 features.

## Prerequisites

- Access to the deployed app: https://ihsinoky.github.io/kondate_maker/
- Or run locally: `npm run dev` → http://localhost:5173

## Test Suite

### Test 1: Initial App Load ✓

**Objective**: Verify app loads and candidate pool is available

**Steps**:
1. Open the app in browser
2. Wait for page to load

**Expected Results**:
- ✅ Page displays "献立メーカー" title
- ✅ Pool status shows: "候補プール: 28件" (or current count)
- ✅ Last update timestamp is displayed
- ✅ No error messages shown
- ✅ "献立を作る" button is enabled

---

### Test 2: Manual Reload Candidates ✓

**Objective**: Verify manual reload fetches from network

**Steps**:
1. Open browser DevTools → Network tab
2. Click "候補を再読み込み" button
3. Observe network activity

**Expected Results**:
- ✅ Button shows "読み込み中..." during fetch
- ✅ Network request to `candidate_pool.json` is made
- ✅ Pool status updates (may show same count if no changes)
- ✅ Timestamp updates to current time
- ✅ No errors in console

---

### Test 3: Generate Menu Without Ingredients ✓

**Objective**: Verify basic menu generation works

**Steps**:
1. Leave "食材プール" textarea empty
2. Click "献立を作る" button
3. Observe generated menu

**Expected Results**:
- ✅ 9 menu cards are displayed (土昼、土夜、日昼、日夜、月夜、火夜、水夜、木夜、金夜)
- ✅ Each card shows a recipe title
- ✅ Each card has a "レシピを見る" link
- ✅ Links are real URLs (not placeholders)
- ✅ Wednesday (水) night may show different recipe than others
- ✅ Friday (金) night may show 🍲 soup badge
- ✅ No crash or error

---

### Test 4: Wednesday Night (鯖) Verification ✓

**Objective**: Verify Wednesday uses settings if configured

**Steps**:
1. Go to Settings page (top navigation)
2. Check if "水曜（冷凍鯖）レシピ候補" has entries
3. Return to Main page
4. Generate menu
5. Check Wednesday night slot

**Expected Results**:
- ✅ If settings exist: Wednesday shows one of the configured recipes
- ✅ If settings empty: Wednesday shows recipe from candidate pool
- ✅ No crash either way

---

### Test 5: Friday Night (スープ) Verification ✓

**Objective**: Verify Friday prioritizes soup recipes

**Steps**:
1. Go to Settings page
2. Check if "金曜（スープ系）レシピ候補" has entries
3. Return to Main page
4. Generate menu multiple times
5. Observe Friday night slot

**Expected Results**:
- ✅ Friday slot shows 🍲 badge (if soup recipe found)
- ✅ If sufficient soup recipes: No warning
- ✅ If insufficient soup recipes: Warning "⚠️ 要確認（スープ候補不足）"
- ✅ Recipe title contains soup keywords (スープ, シチュー, 豚汁, etc.) OR warning is shown

---

### Test 6: Ingredient Pool with Must Markers ✓

**Objective**: Verify ingredient scoring and must markers

**Steps**:
1. Enter ingredients in "食材プール" textarea:
   ```
   白菜*
   豚肉
   にんじん
   ```
2. Click "献立を作る"
3. Review generated recipes

**Expected Results**:
- ✅ Recipes containing "白菜" are prioritized (should appear multiple times)
- ✅ No warning if "白菜" recipes exist
- ✅ Warning shown if "白菜" recipes NOT found: "必須食材「白菜」を含む候補が見つかりませんでした。"
- ✅ Recipes with "豚肉" or "にんじん" get bonus points (may appear more)

---

### Test 7: Must Markers Validation (Max 2) ✓

**Objective**: Verify only 2 must markers are respected

**Steps**:
1. Enter ingredients with 3+ must markers:
   ```
   白菜*
   豚肉*
   にんじん*
   ```
2. Click "献立を作る"
3. Check for warning

**Expected Results**:
- ✅ Warning appears: "必須食材は最大2つまでです。最初の2つのみ必須として扱います。"
- ✅ Only first 2 ingredients (白菜, 豚肉) are treated as must
- ✅ Third ingredient (にんじん) is treated as regular
- ✅ Menu is still generated (no crash)

---

### Test 8: Notion Copy ✓

**Objective**: Verify Notion format copy works

**Steps**:
1. Generate a menu (with or without ingredients)
2. Click "Notionに貼る用にコピー" button
3. Check status message
4. Paste into a text editor

**Expected Results**:
- ✅ Status shows: "コピーしました！"
- ✅ Status disappears after 3 seconds
- ✅ Clipboard contains formatted text like:
   ```
   ## 土（昼）
   - レシピタイトル（Nadia）https://example.com/recipe/123
   
   ## 土（夜）
   - レシピタイトル https://example.com/recipe/456
   ...
   ```
- ✅ Warnings are included in output if present: "## 金（夜） ⚠️ 要確認（スープ候補不足）"

---

### Test 9: Error Handling - Network Offline ✓

**Objective**: Verify app works without network

**Steps**:
1. Open browser DevTools → Network tab
2. Enable "Offline" mode
3. Refresh the page OR click "候補を再読み込み"
4. Try to generate menu

**Expected Results**:
- ✅ On reload with offline: Warning "候補の取得に失敗しました。キャッシュを使用しています。"
- ✅ OR if no cache: Warning "候補の取得に失敗しました。最小限の候補で動作しています。"
- ✅ Pool status shows some recipes (from cache or fallback)
- ✅ "献立を作る" button remains enabled
- ✅ Menu generation still works (using cached/fallback data)
- ✅ No crash or blank page

---

### Test 10: Settings - Wednesday Recipes ✓

**Objective**: Verify Wednesday recipe configuration

**Steps**:
1. Go to Settings page
2. Enter recipes in "水曜（冷凍鯖）レシピ候補":
   ```
   鯖の味噌煮 | https://example.com/saba-miso
   鯖の塩焼き | https://example.com/saba-shio
   ```
3. Click "保存"
4. Return to Main page
5. Generate menu multiple times
6. Observe Wednesday night

**Expected Results**:
- ✅ Settings page shows "保存しました！" message
- ✅ "現在の設定" section displays the saved recipes
- ✅ Wednesday night slot uses one of the saved recipes (randomly selected)
- ✅ Recipe rotates when menu is regenerated

---

### Test 11: Settings - Friday Soup Recipes ✓

**Objective**: Verify Friday soup recipe configuration

**Steps**:
1. Go to Settings page
2. Enter recipes in "金曜（スープ系）レシピ候補":
   ```
   コーンスープ | https://example.com/corn-soup
   豚汁 | https://example.com/tonjiru
   ```
3. Click "保存"
4. Return to Main page
5. Generate menu
6. Check Friday night

**Expected Results**:
- ✅ Settings page shows "保存しました！"
- ✅ Friday night uses one of the configured soup recipes
- ✅ 🍲 badge is shown
- ✅ No "スープ候補不足" warning

---

### Test 12: Settings - Soup Keyword Warning ✓

**Objective**: Verify soup keyword validation

**Steps**:
1. Go to Settings page
2. Enter non-soup recipes in Friday section:
   ```
   ハンバーグ | https://example.com/hamburg
   ```
3. Click "保存"

**Expected Results**:
- ✅ Warning shown: "警告: 入力されたレシピにスープ系のキーワードが含まれていません。"
- ✅ Recommendation shown: "スープ、シチュー、ポタージュ、豚汁、味噌汁、鍋などのキーワードを含むレシピを推奨します。"
- ✅ Recipe is still saved (warning only, not blocking)

---

### Test 13: Settings - Clear All ✓

**Objective**: Verify settings can be cleared

**Steps**:
1. Go to Settings page
2. Enter some recipes (Wednesday and/or Friday)
3. Click "保存"
4. Click "すべてクリア" button
5. Confirm in dialog

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ After confirming: "設定をクリアしました" message shown
- ✅ All textareas are cleared
- ✅ "現在の設定" sections disappear
- ✅ Return to Main → Wednesday uses candidate pool
- ✅ Friday uses soup from candidate pool with possible warning

---

### Test 14: Bookmarklet Workflow (End-to-End) ✓

**Objective**: Verify complete bookmarklet workflow

**Prerequisites**: Follow `docs/bookmarklet/README.md` to install bookmarklet

**Steps**:
1. Visit a recipe listing page (e.g., https://oceans-nadia.com/user/236306)
2. Execute the bookmarklet from bookmarks
3. Observe the alert/prompt
4. Copy the JSON output
5. Create a new file `data/candidate_inbox/20251224_test.json`
6. Paste the JSON and commit
7. Wait for GitHub Action to complete
8. Check `public/candidate_pool.json` is updated
9. In app, click "候補を再読み込み"

**Expected Results**:
- ✅ Bookmarklet shows: "N件の候補を抽出しました"
- ✅ JSON is valid and contains candidates array
- ✅ GitHub Action runs successfully
- ✅ `candidate_pool.json` includes new recipes
- ✅ App shows updated candidate count
- ✅ New recipes appear in generated menus

---

### Test 15: Duplicate Handling ✓

**Objective**: Verify duplicates are properly handled

**Steps**:
1. Copy an existing inbox file (e.g., `20251223_nadia_rinaty.json`)
2. Rename to `20251224_duplicate_test.json`
3. Commit and push
4. Wait for GitHub Action
5. Check `candidate_pool.json`

**Expected Results**:
- ✅ GitHub Action completes successfully
- ✅ Action log shows: "追加された候補: 0件"
- ✅ Action log shows: "⚠️ 新規候補が追加されませんでした（すべて重複またはinboxが空）"
- ✅ Total candidate count remains unchanged
- ✅ No duplicate recipes in pool

---

## Test Results Template

Copy this template to track your test results:

```
Test Date: ___________
Tester: ___________
Environment: [ ] Local Dev [ ] Deployed (GitHub Pages)
Browser: ___________
Device: ___________

Test 1:  [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 2:  [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 3:  [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 4:  [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 5:  [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 6:  [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 7:  [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 8:  [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 9:  [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 10: [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 11: [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 12: [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 13: [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 14: [ ] Pass [ ] Fail [ ] Skip - Notes: ___________
Test 15: [ ] Pass [ ] Fail [ ] Skip - Notes: ___________

Overall Result: [ ] All Pass [ ] Some Failures

Issues Found:
- ___________
- ___________
```

---

## Troubleshooting

### Issue: Pool shows 0 recipes

**Possible Causes**:
- Network error during initial load
- `candidate_pool.json` is missing or corrupted

**Solutions**:
1. Check browser console for errors
2. Click "候補を再読み込み"
3. Check that `public/candidate_pool.json` exists and has valid JSON

### Issue: Menu generation fails

**Possible Causes**:
- Invalid ingredient input
- Empty candidate pool
- Browser compatibility issue

**Solutions**:
1. Clear ingredient input and try again
2. Check browser console for JavaScript errors
3. Try a different browser
4. Clear localStorage and refresh

### Issue: Copy to clipboard doesn't work

**Possible Causes**:
- Browser doesn't support Clipboard API
- HTTPS required for clipboard access

**Solutions**:
1. Check if prompt dialog appears (fallback)
2. Use HTTPS version of app
3. Grant clipboard permissions in browser

---

## Success Criteria

For M1 validation to pass, the following must be true:

- ✅ All Tests 1-13 pass (bookmarklet test optional)
- ✅ App loads without errors
- ✅ 9 slots are always filled with real URLs
- ✅ Wednesday and Friday rules are respected
- ✅ No crashes when ingredients don't match
- ✅ No crashes when network is offline
- ✅ Warnings are shown appropriately
- ✅ Notion copy produces valid format

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-24
