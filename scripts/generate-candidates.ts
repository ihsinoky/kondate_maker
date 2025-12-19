#!/usr/bin/env node

/**
 * 候補プール生成スクリプト（P0-1: 基盤実装）
 * 
 * このスクリプトは GitHub Actions で手動実行され、
 * candidate_pool.json を生成する。
 * 
 * P0-1では最小限の構造のみを実装し、
 * 実際の外部サイト取得はP0-2〜P0-4で実装予定。
 */

import * as fs from 'fs';
import * as path from 'path';
import { CandidatePool } from './types';

/**
 * サンプル候補データを生成（P0-1: 基盤確認用）
 * P0-2〜P0-4で実際の取得ロジックに置き換え予定
 */
function generateSampleCandidates(): CandidatePool {
  return [
    {
      title: "サンプルレシピ1",
      url: "https://example.com/recipe1",
      source: "サンプル",
      timeText: "30分",
      tags: ["和食"],
      author: "テスト"
    },
    {
      title: "サンプルレシピ2",
      url: "https://example.com/recipe2",
      source: "サンプル",
      timeText: "20分",
      tags: ["スープ"]
    }
  ];
}

/**
 * 候補プールを生成してファイルに保存
 */
async function generateCandidatePool(): Promise<void> {
  try {
    console.log('候補プール生成を開始します...');

    // 現時点ではサンプルデータを生成
    // P0-2〜P0-4で実際の外部サイトからの取得を実装
    const candidates = generateSampleCandidates();

    console.log(`候補数: ${candidates.length}件`);

    // public/ ディレクトリに保存（GitHub Pages配信対象）
    const outputDir = path.resolve(process.cwd(), 'public');
    const outputPath = path.join(outputDir, 'candidate_pool.json');

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // JSONファイルとして保存
    fs.writeFileSync(outputPath, JSON.stringify(candidates, null, 2), 'utf-8');

    console.log(`候補プールを保存しました: ${outputPath}`);
    console.log('候補プール生成が完了しました ✓');

  } catch (error) {
    // エラーが発生しても詳細をログに残して終了
    console.error('候補プール生成中にエラーが発生しました:');
    if (error instanceof Error) {
      console.error(`エラーメッセージ: ${error.message}`);
      console.error(`スタックトレース:\n${error.stack}`);
    } else {
      console.error(error);
    }
    
    // 非ゼロの終了コードで終了してActionsでエラーを検知可能に
    process.exit(1);
  }
}

// メイン処理実行
generateCandidatePool();
