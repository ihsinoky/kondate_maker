#!/usr/bin/env node

/**
 * merge-inbox のテスト
 * 
 * normalizeUrl 関数と重複排除ロジックをテストする
 */

import { normalizeUrl } from './merge-inbox';
import * as assert from 'assert';

console.log('='.repeat(60));
console.log('merge-inbox テスト開始');
console.log('='.repeat(60));
console.log('');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    if (error instanceof Error) {
      console.error(`  エラー: ${error.message}`);
    }
    failed++;
  }
}

// normalizeUrl のテスト
console.log('normalizeUrl のテスト:');
console.log('-'.repeat(60));

test('基本的なURL正規化', () => {
  const input = 'https://example.com/recipe/123';
  const expected = 'https://example.com/recipe/123';
  assert.strictEqual(normalizeUrl(input), expected);
});

test('fragment (#...) の除去', () => {
  const input = 'https://example.com/recipe/123#comments';
  const expected = 'https://example.com/recipe/123';
  assert.strictEqual(normalizeUrl(input), expected);
});

test('末尾スラッシュの正規化（クエリなし）', () => {
  const input = 'https://example.com/recipe/123/';
  const expected = 'https://example.com/recipe/123';
  assert.strictEqual(normalizeUrl(input), expected);
});

test('末尾スラッシュの保持（クエリあり）', () => {
  const input = 'https://example.com/recipe/?page=1';
  const expected = 'https://example.com/recipe/?page=1';
  assert.strictEqual(normalizeUrl(input), expected);
});

test('utm_* パラメータの除去', () => {
  const input = 'https://example.com/recipe/123?utm_source=twitter&utm_medium=social';
  const expected = 'https://example.com/recipe/123';
  assert.strictEqual(normalizeUrl(input), expected);
});

test('fbclid パラメータの除去', () => {
  const input = 'https://example.com/recipe/123?fbclid=abc123';
  const expected = 'https://example.com/recipe/123';
  assert.strictEqual(normalizeUrl(input), expected);
});

test('gclid パラメータの除去', () => {
  const input = 'https://example.com/recipe/123?gclid=xyz789';
  const expected = 'https://example.com/recipe/123';
  assert.strictEqual(normalizeUrl(input), expected);
});

test('トラッキングパラメータと通常パラメータの混在', () => {
  const input = 'https://example.com/recipe?page=1&utm_source=email&category=soup';
  const expected = 'https://example.com/recipe?page=1&category=soup';
  assert.strictEqual(normalizeUrl(input), expected);
});

test('複数の正規化ルールの組み合わせ', () => {
  const input = 'https://example.com/recipe/123/?utm_source=twitter#section1';
  const expected = 'https://example.com/recipe/123';
  assert.strictEqual(normalizeUrl(input), expected);
});

test('不正なURLの処理（元のURLを返す）', () => {
  const input = 'not-a-valid-url';
  const result = normalizeUrl(input);
  assert.strictEqual(result, input);
});

test('相対URLではなく絶対URLの処理', () => {
  const input = 'https://oceans-nadia.com/user/236306/recipe/515202';
  const expected = 'https://oceans-nadia.com/user/236306/recipe/515202';
  assert.strictEqual(normalizeUrl(input), expected);
});

test('URLのポート番号を保持', () => {
  const input = 'https://example.com:8080/recipe/123';
  const expected = 'https://example.com:8080/recipe/123';
  assert.strictEqual(normalizeUrl(input), expected);
});

console.log('');
console.log('='.repeat(60));
console.log('テスト結果');
console.log('='.repeat(60));
console.log(`成功: ${passed}`);
console.log(`失敗: ${failed}`);
console.log('');

if (failed > 0) {
  console.error('テストに失敗しました');
  process.exit(1);
} else {
  console.log('すべてのテストが成功しました ✓');
  process.exit(0);
}
