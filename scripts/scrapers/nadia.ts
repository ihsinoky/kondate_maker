/**
 * Nadia（りなてぃ）候補取得モジュール（P0-2）
 * 
 * 一覧/検索結果ページからレシピのtitle/urlを抽出する。
 * 詳細ページではなく一覧に限定することで、HTML構造変更に強くする。
 */

import * as cheerio from 'cheerio';
import { CandidateRecipe } from '../types';

/** スクレイピング設定 */
const CONFIG = {
  /** User-Agent（礼儀正しく識別可能なものを使用） */
  userAgent: 'Mozilla/5.0 (compatible; KondateMaker/1.0; +https://github.com/ihsinoky/kondate_maker)',
  /** タイムアウト（ミリ秒） */
  timeout: 10000,
  /** 1ページあたりの最大取得件数 */
  maxItemsPerPage: 30,
  /** 取得するページ数 */
  maxPages: 2,
};

/**
 * Nadia（りなてぃ）のレシピ候補を取得
 * 
 * @returns 候補レシピの配列（失敗時は空配列）
 */
export async function fetchNadiaCandidates(): Promise<CandidateRecipe[]> {
  const candidates: CandidateRecipe[] = [];
  const urlSet = new Set<string>(); // URL重複チェック用

  try {
    console.log('Nadia候補取得を開始...');

    // りなてぃのユーザーページから取得
    // ユーザーID: 22602 (りなてぃ)
    const rinatyUserId = '22602';
    
    for (let page = 1; page <= CONFIG.maxPages; page++) {
      console.log(`Nadia ページ ${page}/${CONFIG.maxPages} を取得中...`);
      
      const pageUrl = page === 1 
        ? `https://oceans-nadia.com/user/${rinatyUserId}`
        : `https://oceans-nadia.com/user/${rinatyUserId}?page=${page}`;

      try {
        const pageCandidates = await fetchNadiaPage(pageUrl, urlSet);
        candidates.push(...pageCandidates);
        
        console.log(`ページ ${page}: ${pageCandidates.length}件取得（累計: ${candidates.length}件）`);
        
        // 十分な候補が集まったら終了
        if (candidates.length >= 50) {
          console.log('目標候補数(50件)に到達しました');
          break;
        }
      } catch (error) {
        console.warn(`ページ ${page} の取得に失敗:`, error instanceof Error ? error.message : error);
        // 1ページ失敗しても続行
        continue;
      }
    }

    console.log(`Nadia候補取得完了: ${candidates.length}件`);
    
    if (candidates.length === 0) {
      console.warn('⚠️ Nadia候補が0件でした。HTML構造の変更やネットワークエラーの可能性があります。');
    }

    return candidates;

  } catch (error) {
    // 全体エラーでも空配列を返し、パイプラインを継続
    console.error('Nadia候補取得でエラーが発生しました:', error);
    console.warn('⚠️ Nadia候補を0件として継続します');
    return [];
  }
}

/**
 * Nadia の1ページから候補を取得
 */
async function fetchNadiaPage(
  url: string,
  urlSet: Set<string>
): Promise<CandidateRecipe[]> {
  const candidates: CandidateRecipe[] = [];

  // HTMLを取得
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // レシピカードを抽出
  // Nadiaの一覧ページでは、レシピがリンクとして表示される
  // 構造変更に備え、複数のセレクタパターンを試す
  const recipeSelectors = [
    'a[href*="/recipe/"]',           // /recipe/ を含むリンク（最も一般的）
    '.recipe-card a',                // レシピカードクラス（可能性）
    'article a[href*="/recipe/"]',   // article内のレシピリンク
  ];

  let recipeLinks: cheerio.Cheerio<cheerio.Element> | null = null;
  
  for (const selector of recipeSelectors) {
    const links = $(selector);
    if (links.length > 0) {
      recipeLinks = links;
      console.log(`セレクタ "${selector}" で ${links.length} 件のレシピを検出`);
      break;
    }
  }

  if (!recipeLinks || recipeLinks.length === 0) {
    console.warn(`URLからレシピが見つかりませんでした: ${url}`);
    return candidates;
  }

  // 各レシピリンクを処理
  recipeLinks.each((_, element) => {
    try {
      const $link = $(element);
      const href = $link.attr('href');
      
      if (!href) return;

      // 相対URLを絶対URLに変換
      const recipeUrl = href.startsWith('http') 
        ? href 
        : `https://oceans-nadia.com${href}`;

      // /recipe/ を含むURLのみ対象
      if (!recipeUrl.includes('/recipe/')) return;

      // 重複チェック
      if (urlSet.has(recipeUrl)) return;
      urlSet.add(recipeUrl);

      // タイトルを取得（複数パターンを試す）
      let title = $link.attr('title') || 
                  $link.find('img').attr('alt') ||
                  $link.text().trim() ||
                  'Nadiaレシピ';

      // タイトルをクリーンアップ
      title = title.trim().replace(/\s+/g, ' ');

      // 候補として追加
      const candidate: CandidateRecipe = {
        title,
        url: recipeUrl,
        source: 'Nadia',
        author: 'りなてぃ', // りなてぃのページから取得しているため
      };

      candidates.push(candidate);

      // 最大件数に達したら終了
      if (candidates.length >= CONFIG.maxItemsPerPage) {
        return false; // each loop を抜ける
      }
    } catch (error) {
      // 個別のレシピ抽出エラーは無視して続行
      console.warn('レシピ抽出エラー（スキップ）:', error instanceof Error ? error.message : error);
    }
  });

  return candidates;
}

/**
 * URLからHTMLを取得
 */
async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': CONFIG.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}
