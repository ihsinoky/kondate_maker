#!/usr/bin/env node

/**
 * merge-inbox の統合テスト
 * 
 * 既存候補 + 新規候補 + 重複候補のマージをテストする
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

console.log('='.repeat(60));
console.log('merge-inbox 統合テスト開始');
console.log('='.repeat(60));
console.log('');

// テスト用ディレクトリ
const testDir = '/tmp/test-merge-inbox';
const inboxDir = path.join(testDir, 'data/candidate_inbox');
const poolPath = path.join(testDir, 'public/candidate_pool.json');

// クリーンアップ
if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true });
}

// ディレクトリ作成
fs.mkdirSync(inboxDir, { recursive: true });
fs.mkdirSync(path.dirname(poolPath), { recursive: true });

console.log('1. テストデータ準備');
console.log('-'.repeat(60));

// 既存の候補プール（4件）
const existingPool = [
  {
    title: 'レシピA',
    url: 'https://example.com/recipe/a',
    source: 'example'
  },
  {
    title: 'レシピB',
    url: 'https://example.com/recipe/b',
    source: 'example'
  },
  {
    title: 'レシピC',
    url: 'https://example.com/recipe/c?utm_source=test',
    source: 'example'
  },
  {
    title: 'レシピD',
    url: 'https://example.com/recipe/d#fragment',
    source: 'example'
  }
];

fs.writeFileSync(poolPath, JSON.stringify(existingPool, null, 2), 'utf-8');
console.log(`✓ 既存候補プールを作成: ${existingPool.length}件`);

// inbox 1: ラッパー形式（新規2件 + 重複1件）
const inbox1 = {
  generatedAt: '2025-12-21T12:00:00+09:00',
  sourcePage: 'https://example.com/list?page=1',
  sourceHint: 'example',
  candidates: [
    {
      title: 'レシピE',
      url: 'https://example.com/recipe/e'
    },
    {
      title: 'レシピF',
      url: 'https://example.com/recipe/f'
    },
    {
      title: 'レシピB（重複）',
      url: 'https://example.com/recipe/b'  // 既存と重複
    }
  ]
};

const inbox1Path = path.join(inboxDir, '20251221_example_page1.json');
fs.writeFileSync(inbox1Path, JSON.stringify(inbox1, null, 2), 'utf-8');
console.log(`✓ inbox1を作成: ${inbox1.candidates.length}件（新規2件 + 重複1件）`);

// inbox 2: 配列形式（新規1件 + 重複2件）
const inbox2 = [
  {
    title: 'レシピG',
    url: 'https://example.com/recipe/g',
    source: 'example2'
  },
  {
    title: 'レシピC（重複・異なるURL形式）',
    url: 'https://example.com/recipe/c'  // 既存と重複（正規化で一致）
  },
  {
    title: 'レシピD（重複・fragment違い）',
    url: 'https://example.com/recipe/d#different'  // 既存と重複（正規化で一致）
  }
];

const inbox2Path = path.join(inboxDir, '20251221_example_page2.json');
fs.writeFileSync(inbox2Path, JSON.stringify(inbox2, null, 2), 'utf-8');
console.log(`✓ inbox2を作成: ${inbox2.length}件（新規1件 + 重複2件）`);

console.log('');
console.log('2. マージスクリプト実行');
console.log('-'.repeat(60));

// マージスクリプトを実行
try {
  const scriptPath = path.resolve(process.cwd(), 'scripts/merge-inbox.ts');
  execSync(`cd ${testDir} && tsx ${scriptPath}`, {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' }
  });
} catch (error) {
  console.error('マージスクリプトの実行に失敗しました');
  process.exit(1);
}

console.log('');
console.log('3. 結果検証');
console.log('-'.repeat(60));

// 結果の候補プールを読み込む
const resultPool = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));

console.log(`結果の総候補数: ${resultPool.length}件`);
console.log('');

// 期待値：既存4件 + 新規3件（E, F, G） = 7件
const expectedCount = 7;
const expectedUrls = [
  'https://example.com/recipe/a',
  'https://example.com/recipe/b',
  'https://example.com/recipe/c?utm_source=test',  // 既存は元のまま保持される
  'https://example.com/recipe/d#fragment',  // 既存は元のまま保持される
  'https://example.com/recipe/e',
  'https://example.com/recipe/f',
  'https://example.com/recipe/g'
];

// 検証
let testPassed = true;

if (resultPool.length !== expectedCount) {
  console.error(`✗ 候補数が期待値と異なります: ${resultPool.length} != ${expectedCount}`);
  testPassed = false;
} else {
  console.log(`✓ 候補数が正しい: ${resultPool.length}件`);
}

// URLの検証
const resultUrls = resultPool.map((c: { url: string }) => c.url).sort();
const sortedExpectedUrls = expectedUrls.sort();

for (let i = 0; i < sortedExpectedUrls.length; i++) {
  if (!resultUrls.includes(sortedExpectedUrls[i])) {
    console.error(`✗ 期待されるURL "${sortedExpectedUrls[i]}" が見つかりません`);
    testPassed = false;
  }
}

if (testPassed) {
  console.log(`✓ すべてのURLが正しく含まれています`);
}

// 重複がないことを確認
const uniqueUrls = new Set(resultUrls);
if (uniqueUrls.size !== resultUrls.length) {
  console.error(`✗ 重複URLが存在します: ${resultUrls.length - uniqueUrls.size}件`);
  testPassed = false;
} else {
  console.log(`✓ 重複がありません`);
}

// 既存候補が優先されていることを確認
const recipeB = resultPool.find((c: { url: string }) => c.url === 'https://example.com/recipe/b');
if (recipeB && recipeB.title === 'レシピB') {
  console.log(`✓ 既存候補が優先されています（レシピB）`);
} else {
  console.error(`✗ 既存候補が上書きされています`);
  testPassed = false;
}

console.log('');
console.log('='.repeat(60));
console.log('統合テスト結果');
console.log('='.repeat(60));

if (testPassed) {
  console.log('✓ すべての検証が成功しました');
  console.log('');
  process.exit(0);
} else {
  console.error('✗ テストに失敗しました');
  console.log('');
  process.exit(1);
}
