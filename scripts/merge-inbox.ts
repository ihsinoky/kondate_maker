#!/usr/bin/env node

/**
 * Inbox マージスクリプト
 * Inbox merge script
 * 
 * data/candidate_inbox/ 配下のJSONファイルを読み込み、
 * 正規化・重複排除を行い、public/candidate_pool.json を更新する。
 * 
 * Reads JSON files from data/candidate_inbox/, performs normalization
 * and deduplication, and updates public/candidate_pool.json.
 * 
 * Sprint 2 P0: Bookmarklet方式の候補プール運用
 */

import * as fs from 'fs';
import * as path from 'path';
import { CandidateRecipe } from './types';

/**
 * inbox JSON のラッパー形式
 */
interface InboxWrapper {
  generatedAt?: string;
  sourcePage?: string;
  sourceHint?: string;
  candidates: CandidateRecipe[];
}

/**
 * トラッキングパラメータのリスト
 * Tracking parameters to be removed from URLs
 */
const TRACKING_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'] as const;

/**
 * URL正規化関数
 * URL normalization function
 * - fragment (#...) を除去 / Remove fragments
 * - 末尾スラッシュを正規化 / Normalize trailing slashes
 * - トラッキングパラメータ (utm_*, fbclid等) を除去 / Remove tracking parameters
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // fragmentを除去
    urlObj.hash = '';
    
    // トラッキングパラメータを除去
    TRACKING_PARAMS.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // URLを文字列化
    let normalized = urlObj.toString();
    
    // 末尾スラッシュを正規化（クエリパラメータがない場合のみ）
    if (!urlObj.search && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized;
  } catch (error) {
    // URL解析に失敗した場合は元のURLを返す
    console.warn(`URL正規化に失敗: ${url}`, error);
    return url;
  }
}

/**
 * inbox JSONファイルを読み込み、候補配列に変換
 */
function readInboxFile(filePath: string): CandidateRecipe[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // ラッパー形式か配列形式かを判定
    if (Array.isArray(data)) {
      // 配列形式
      return data.filter(item => item.url?.trim() && item.title?.trim());
    } else if (data.candidates && Array.isArray(data.candidates)) {
      // ラッパー形式
      const wrapper = data as InboxWrapper;
      const candidates = wrapper.candidates.filter(item => item.url?.trim() && item.title?.trim());
      
      // sourceHintがあり、各候補にsourceがない場合は補完
      if (wrapper.sourceHint) {
        candidates.forEach(candidate => {
          if (!candidate.source) {
            candidate.source = wrapper.sourceHint;
          }
        });
      }
      
      return candidates;
    } else {
      console.warn(`不明なJSON形式: ${filePath}`);
      return [];
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read inbox file ${filePath}: ${errorMsg}`);
  }
}

/**
 * inbox配下の全JSONファイルを読み込む
 */
function readAllInboxFiles(inboxDir: string): CandidateRecipe[] {
  const allCandidates: CandidateRecipe[] = [];
  
  if (!fs.existsSync(inboxDir)) {
    console.log(`inbox ディレクトリが存在しません: ${inboxDir}`);
    return allCandidates;
  }
  
  // 再帰的にJSONファイルを探す
  function walkDir(dir: string): void {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.json')) {
        console.log(`  読み込み: ${path.relative(process.cwd(), filePath)}`);
        const candidates = readInboxFile(filePath);
        allCandidates.push(...candidates);
      }
    }
  }
  
  walkDir(inboxDir);
  return allCandidates;
}

/**
 * 重複排除（既存優先）
 * 正規化URLをキーにして、既存の候補を優先する
 */
function deduplicateCandidates(
  existing: CandidateRecipe[],
  newCandidates: CandidateRecipe[]
): CandidateRecipe[] {
  // 既存の正規化URLのセットを作成
  const existingUrls = new Set(existing.map(c => normalizeUrl(c.url)));
  
  // 新規候補から未出のものだけを抽出
  const uniqueNew = newCandidates.filter(c => {
    const normalized = normalizeUrl(c.url);
    return !existingUrls.has(normalized);
  });
  
  // 新規候補内でも重複排除（最初に出現したものを優先）
  const seen = new Set<string>();
  const dedupedNew = uniqueNew.filter(c => {
    const normalized = normalizeUrl(c.url);
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
  
  return [...existing, ...dedupedNew];
}

/**
 * メイン処理
 */
async function mergeInbox(): Promise<void> {
  try {
    console.log('='.repeat(60));
    console.log('inbox マージを開始します');
    console.log('='.repeat(60));
    console.log('');
    
    const inboxDir = path.resolve(process.cwd(), 'data/candidate_inbox');
    const poolPath = path.resolve(process.cwd(), 'public/candidate_pool.json');
    
    // 既存の候補プールを読み込む
    let existingPool: CandidateRecipe[] = [];
    if (fs.existsSync(poolPath)) {
      const content = fs.readFileSync(poolPath, 'utf-8');
      existingPool = JSON.parse(content);
      console.log(`既存候補数: ${existingPool.length}件`);
    } else {
      console.log('既存の候補プールが存在しません（新規作成）');
    }
    console.log('');
    
    // inbox配下のJSONファイルを読み込む
    console.log('inbox配下のJSONを読み込みます:');
    const inboxCandidates = readAllInboxFiles(inboxDir);
    console.log(`inbox候補数: ${inboxCandidates.length}件`);
    console.log('');
    
    // 重複排除してマージ
    console.log('重複排除とマージを実行します...');
    const mergedPool = deduplicateCandidates(existingPool, inboxCandidates);
    const addedCount = mergedPool.length - existingPool.length;
    console.log(`追加された候補: ${addedCount}件`);
    console.log(`マージ後の総候補数: ${mergedPool.length}件`);
    console.log('');
    
    // 候補数の警告（0件や少数でも処理は継続）
    if (addedCount === 0) {
      console.warn('⚠️ 新規候補が追加されませんでした（すべて重複またはinboxが空）');
    } else if (addedCount < 5) {
      console.warn(`⚠️ 追加候補数が少なめです: ${addedCount}件`);
    }
    
    // public/ ディレクトリに保存
    const outputDir = path.dirname(poolPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(poolPath, JSON.stringify(mergedPool, null, 2), 'utf-8');
    
    console.log('='.repeat(60));
    console.log('inbox マージが完了しました ✓');
    console.log('='.repeat(60));
    console.log(`出力: ${poolPath}`);
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('inbox マージ中にエラーが発生しました');
    console.error('='.repeat(60));
    if (error instanceof Error) {
      console.error(`エラーメッセージ: ${error.message}`);
      console.error(`スタックトレース:\n${error.stack}`);
    } else {
      console.error(error);
    }
    console.error('');
    
    // 非ゼロの終了コードで終了してActionsでエラーを検知可能に
    process.exit(1);
  }
}

// メイン処理実行
mergeInbox();
