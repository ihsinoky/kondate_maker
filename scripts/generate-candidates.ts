#!/usr/bin/env node

/**
 * 候補プール生成スクリプト
 * 
 * このスクリプトは GitHub Actions で手動実行され、
 * candidate_pool.json を生成する。
 * 
 * P0-2: Nadia候補取得を実装
 * P0-3: つくおき候補取得（予定）
 * P0-4: 白ごはん.com候補取得（予定）
 */

import * as fs from 'fs';
import * as path from 'path';
import { CandidatePool } from './types';
import { fetchNadiaCandidates } from './scrapers/nadia';

/** 目標候補数 */
const TARGET_CANDIDATE_COUNT = 50;

/**
 * 候補プールを生成してファイルに保存
 */
async function generateCandidatePool(): Promise<void> {
  try {
    console.log('='.repeat(60));
    console.log('候補プール生成を開始します');
    console.log('='.repeat(60));
    console.log('');

    const allCandidates: CandidatePool = [];

    // P0-2: Nadia（りなてぃ）候補を取得
    console.log('[1/1] Nadia候補取得');
    console.log('-'.repeat(60));
    const nadiaCandidates = await fetchNadiaCandidates();
    allCandidates.push(...nadiaCandidates);
    console.log(`✓ Nadia: ${nadiaCandidates.length}件`);
    console.log('');

    // TODO P0-3: つくおき候補を追加
    // TODO P0-4: 白ごはん.com候補を追加

    // 結果サマリー
    console.log('='.repeat(60));
    console.log('候補プール生成結果');
    console.log('='.repeat(60));
    console.log(`総候補数: ${allCandidates.length}件`);
    
    // ソース別の内訳
    const sourceCount = allCandidates.reduce((acc, c) => {
      acc[c.source] = (acc[c.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('ソース別内訳:');
    for (const [source, count] of Object.entries(sourceCount)) {
      console.log(`  - ${source}: ${count}件`);
    }
    console.log('');

    // 目標達成チェック
    if (allCandidates.length < TARGET_CANDIDATE_COUNT) {
      console.warn(`⚠️ 候補数が目標(${TARGET_CANDIDATE_COUNT}件)に達していません: ${allCandidates.length}件`);
      console.warn('   HTML構造変更やネットワークエラーの可能性があります');
    } else {
      console.log(`✓ 目標候補数(${TARGET_CANDIDATE_COUNT}件)を達成: ${allCandidates.length}件`);
    }

    // public/ ディレクトリに保存（GitHub Pages配信対象）
    const outputDir = path.resolve(process.cwd(), 'public');
    const outputPath = path.join(outputDir, 'candidate_pool.json');

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // JSONファイルとして保存
    fs.writeFileSync(outputPath, JSON.stringify(allCandidates, null, 2), 'utf-8');

    console.log('');
    console.log(`✓ 候補プールを保存: ${outputPath}`);
    console.log('候補プール生成が完了しました ✓');
    console.log('');

  } catch (error) {
    // エラーが発生しても詳細をログに残して終了
    console.error('');
    console.error('='.repeat(60));
    console.error('候補プール生成中にエラーが発生しました');
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
generateCandidatePool();
