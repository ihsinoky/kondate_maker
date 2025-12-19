/**
 * Nadiaスクレイパー検証スクリプト
 * 
 * 実際のHTML構造でスクレイピングロジックが動作することを確認
 * このスクリプトは開発・デバッグ用です
 */

import * as cheerio from 'cheerio';
import { CandidateRecipe } from '../types';

/**
 * サンプルHTMLでスクレイピングロジックを検証
 */
function verifyScrapingLogic(): void {
  console.log('Nadiaスクレイピングロジック検証');
  console.log('='.repeat(60));

  // Nadiaの実際のHTML構造に基づくサンプル
  const sampleHtml = `
    <html>
      <body>
        <div class="recipe-list">
          <a href="/recipe/471234" title="鶏むね肉の照り焼き">
            <img src="image1.jpg" alt="鶏むね肉の照り焼き">
          </a>
          <a href="/recipe/471235" title="豚バラとキャベツの味噌炒め">
            <img src="image2.jpg" alt="豚バラとキャベツの味噌炒め">
          </a>
          <a href="/recipe/471236">
            <img src="image3.jpg" alt="ほうれん草とベーコンのスープ">
          </a>
        </div>
      </body>
    </html>
  `;

  const $ = cheerio.load(sampleHtml);
  const candidates: CandidateRecipe[] = [];
  const urlSet = new Set<string>();

  // レシピリンクを抽出
  $('a[href*="/recipe/"]').each((_, element) => {
    const $link = $(element);
    const href = $link.attr('href');
    
    if (!href) return;

    const recipeUrl = href.startsWith('http') 
      ? href 
      : `https://oceans-nadia.com${href}`;

    if (urlSet.has(recipeUrl)) return;
    urlSet.add(recipeUrl);

    const title = $link.attr('title') || 
                  $link.find('img').attr('alt') ||
                  $link.text().trim() ||
                  'Nadiaレシピ';

    candidates.push({
      title: title.trim(),
      url: recipeUrl,
      source: 'Nadia',
      author: 'りなてぃ',
    });
  });

  console.log(`抽出されたレシピ数: ${candidates.length}`);
  console.log('');

  candidates.forEach((candidate, index) => {
    console.log(`[${index + 1}] ${candidate.title}`);
    console.log(`    URL: ${candidate.url}`);
    console.log(`    ソース: ${candidate.source} (${candidate.author})`);
    console.log('');
  });

  // 検証結果
  console.log('='.repeat(60));
  console.log('検証結果:');
  
  const checks = [
    { name: 'レシピが抽出された', pass: candidates.length === 3 },
    { name: 'タイトルが正しく抽出された', pass: candidates.every(c => c.title.length > 0) },
    { name: 'URLが正しい形式', pass: candidates.every(c => c.url.startsWith('https://oceans-nadia.com/recipe/')) },
    { name: 'ソースが設定されている', pass: candidates.every(c => c.source === 'Nadia') },
    { name: '著者が設定されている', pass: candidates.every(c => c.author === 'りなてぃ') },
    { name: 'URL重複がない', pass: candidates.length === new Set(candidates.map(c => c.url)).size },
  ];

  checks.forEach(check => {
    const status = check.pass ? '✓' : '✗';
    console.log(`${status} ${check.name}`);
  });

  const allPassed = checks.every(c => c.pass);
  console.log('');
  console.log(allPassed ? '✓ すべての検証に成功しました' : '✗ 一部の検証に失敗しました');
  console.log('='.repeat(60));
}

// 検証実行
verifyScrapingLogic();
