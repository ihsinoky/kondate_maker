/**
 * Nadia（りなてぃ）候補取得モジュール（P0-2）
 * 
 * 一覧/検索結果ページからレシピのtitle/urlを抽出する。
 * 詳細ページではなく一覧に限定することで、HTML構造変更に強くする。
 * 
 * 【修正履歴】
 * 2025-12-20: AWS WAF対策
 *             - Playwrightによるブラウザ自動化を実装
 *             - WAF検出時のfallbackデータ対応
 *             - 詳細ログ出力とhostnameガード追加
 * 
 * 【既知の問題】
 * oceans-nadia.com は AWS WAF (Web Application Firewall) で保護されており、
 * 自動化ブラウザ（Playwright含む）を検出してブロックします。
 * WAFにより取得できない場合は、fallbackデータ（手動キュレーション）を使用します。
 * 詳細: docs/troubleshooting/INCIDENT-20251220-nadia-404.md
 */

import * as cheerio from 'cheerio';
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { CandidateRecipe } from '../types';

/** スクレイピング設定 */
const CONFIG = {
  /** User-Agent（実ブラウザに近い値を使用し、AWS WAF検出を回避する目的） */
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  /** タイムアウト（ミリ秒） */
  timeout: 30000,
  /** ページ読み込み待機時間（ミリ秒） - WAF challenge解決用 */
  navigationTimeout: 30000,
  /** 1ページあたりの最大取得件数 */
  maxItemsPerPage: 30,
  /** 取得するページ数 */
  maxPages: 2,
  /** 目標候補数 */
  targetCandidateCount: 50,
  /** りなてぃのユーザーID */
  rinatyUserId: '22602',
  /** デフォルトの著者名 */
  defaultAuthor: 'りなてぃ',
  /** フォールバックタイトル */
  fallbackTitle: 'Nadiaレシピ',
  /** ページ間の待機時間（ミリ秒） - レート制限対策 */
  delayBetweenPages: 2000,
  /** 期待されるホスト名（相対URL問題検出用） */
  expectedHostname: 'oceans-nadia.com',
};

/**
 * fallbackデータを読み込む
 */
function loadFallbackData(): CandidateRecipe[] {
  try {
    // ES modulesでは__dirnameが使えないため、import.meta.urlを使用
    // fileURLToPathを使用してクロスプラットフォーム対応
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFile);
    const fallbackPath = path.join(currentDir, '../data/nadia-fallback.json');
    console.log(`  fallbackデータを読み込み中: ${fallbackPath}`);
    
    if (!fs.existsSync(fallbackPath)) {
      console.warn(`  ⚠️ fallbackファイルが見つかりません: ${fallbackPath}`);
      return [];
    }
    
    const data = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
    const recipes = data.recipes || [];
    
    console.log(`  ✓ fallbackデータ読み込み成功: ${recipes.length}件`);
    console.log(`  最終更新: ${data.lastUpdated || '不明'} (${data.updateMethod || '不明'})`);
    
    return recipes;
  } catch (error) {
    console.error(`  ❌ fallbackデータ読み込みエラー:`, error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Nadia（りなてぃ）のレシピ候補を取得
 * 
 * AWS WAFを回避するため、Playwrightを使用してブラウザ経由で取得を試みます。
 * WAFによりブロックされた場合は、fallbackデータ（手動キュレーション）を返します。
 * 
 * @returns 候補レシピの配列（失敗時はfallbackまたは空配列）
 */
export async function fetchNadiaCandidates(): Promise<CandidateRecipe[]> {
  const candidates: CandidateRecipe[] = [];
  const urlSet = new Set<string>(); // URL重複チェック用
  let browser: Browser | null = null;
  let usedFallback = false;

  try {
    console.log('Nadia候補取得を開始...');
    console.log('Playwrightブラウザを起動中...');

    // ブラウザを起動
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled', // Automation検出を無効化
      ],
    });

    const context = await browser.newContext({
      userAgent: CONFIG.userAgent,
      viewport: { width: 1280, height: 720 },
      locale: 'ja-JP',
      ignoreHTTPSErrors: true, // 証明書エラーを無視（GitHub Actions環境対策）
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    const page = await context.newPage();
    
    // navigator.webdriver を削除（自動化検出対策）
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
    
    // ページタイムアウトを設定
    page.setDefaultTimeout(CONFIG.timeout);
    page.setDefaultNavigationTimeout(CONFIG.navigationTimeout);

    // りなてぃのユーザーページから取得
    for (let pageNum = 1; pageNum <= CONFIG.maxPages; pageNum++) {
      console.log(`Nadia ページ ${pageNum}/${CONFIG.maxPages} を取得中...`);
      
      const pageUrl = pageNum === 1 
        ? `https://oceans-nadia.com/user/${CONFIG.rinatyUserId}`
        : `https://oceans-nadia.com/user/${CONFIG.rinatyUserId}?page=${pageNum}`;

      try {
        const pageCandidates = await fetchNadiaPageWithBrowser(page, pageUrl, urlSet);
        candidates.push(...pageCandidates);
        
        console.log(`ページ ${pageNum}: ${pageCandidates.length}件取得（累計: ${candidates.length}件）`);
        
        // 十分な候補が集まったら終了
        if (candidates.length >= CONFIG.targetCandidateCount) {
          console.log(`目標候補数(${CONFIG.targetCandidateCount}件)に到達しました`);
          break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`ページ ${pageNum} の取得に失敗:`, errorMessage);
        
        // WAFチャレンジエラーの場合、fallbackに切り替え
        if (errorMessage.includes('AWS WAF challenge') && candidates.length === 0) {
          console.warn('');
          console.warn('⚠️ AWS WAF により自動取得がブロックされました');
          console.warn('   fallbackデータ（手動キュレーション）に切り替えます');
          console.warn('   詳細: docs/troubleshooting/INCIDENT-20251220-nadia-404.md');
          console.warn('');
          
          // fallbackデータを読み込み
          const fallbackCandidates = loadFallbackData();
          if (fallbackCandidates.length > 0) {
            candidates.push(...fallbackCandidates);
            usedFallback = true;
            break; // fallback使用時はループを抜ける
          } else {
            // fallbackも失敗した場合は続行を試みる
            console.warn('  ⚠️ fallbackデータの読み込みに失敗しました。次のページを試みます。');
          }
        }
        
        // 1ページ失敗しても続行（fallback未使用の場合）
        if (!usedFallback) {
          continue;
        }
      }

      // 次のページへ進む前に待機（レート制限対策）
      if (pageNum < CONFIG.maxPages && candidates.length < CONFIG.targetCandidateCount) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenPages));
      }
    }

    if (usedFallback) {
      console.log(`Nadia候補取得完了（fallback使用）: ${candidates.length}件`);
    } else {
      console.log(`Nadia候補取得完了: ${candidates.length}件`);
    }
    
    if (candidates.length === 0) {
      console.warn('⚠️ Nadia候補が0件でした。HTML構造の変更やネットワークエラーの可能性があります。');
      console.warn('   fallbackデータも利用できませんでした。');
    }

    return candidates;

  } catch (error) {
    // 全体エラーでもfallbackを試す
    console.error('Nadia候補取得でエラーが発生しました:', error);
    
    if (!usedFallback) {
      console.warn('⚠️ fallbackデータ読み込みを試みます...');
      const fallbackCandidates = loadFallbackData();
      if (fallbackCandidates.length > 0) {
        console.log(`✓ fallbackデータを使用: ${fallbackCandidates.length}件`);
        return fallbackCandidates;
      }
    }
    
    console.warn('⚠️ Nadia候補を0件として継続します');
    return [];
  } finally {
    // ブラウザを必ずクローズ
    if (browser) {
      await browser.close();
      console.log('Playwrightブラウザを終了しました');
    }
  }
}

/**
 * Nadia の1ページから候補を取得（Playwright版）
 */
async function fetchNadiaPageWithBrowser(
  page: Page,
  url: string,
  urlSet: Set<string>
): Promise<CandidateRecipe[]> {
  const candidates: CandidateRecipe[] = [];

  console.log(`  リクエストURL: ${url}`);
  
  // hostnameガード: 相対URL問題を即検出
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== CONFIG.expectedHostname) {
      console.error(`❌ hostnameエラー: 期待値="${CONFIG.expectedHostname}", 実際="${parsedUrl.hostname}"`);
      console.error(`   これは相対URL問題の可能性があります！`);
      throw new Error(`Invalid hostname: expected ${CONFIG.expectedHostname}, got ${parsedUrl.hostname}`);
    }
  } catch (error) {
    if (error instanceof TypeError) {
      console.error(`❌ 無効なURL: ${url}`);
      throw new Error(`Invalid URL: ${url}`);
    }
    throw error;
  }

  try {
    // ページに移動（WAFチャレンジを自動的に解決）
    console.log(`  ページに移動中...`);
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded', // まずDOMロードを待つ
      timeout: CONFIG.navigationTimeout,
    });

    const finalUrl = page.url();
    const status = response?.status() || 0;
    
    console.log(`  初期レスポンス: ${status}`);
    console.log(`  最終URL: ${finalUrl}`);

    // HTMLを取得（早期チェック用）
    const html = await page.content();
    console.log(`  HTML長: ${html.length} bytes`);

    // WAFチャレンジページかチェック（早期に検出して即座に失敗させる）
    if (html.includes('awsWafCookieDomainList') || html.includes('AwsWafIntegration')) {
      console.error(`  ❌ AWS WAFチャレンジページが検出されました`);
      console.error(`  これは環境の制限により、ブラウザ自動化が検出されている可能性があります`);
      const bodySnippet = html.substring(0, 300).replace(/\s+/g, ' ');
      console.error(`  ボディスニペット: ${bodySnippet}...`);
      throw new Error('AWS WAF challenge page detected - automated browser may have been detected');
    }

    // WAFでない場合は、レシピリンクの読み込みを待つ
    console.log(`  レシピコンテンツの読み込みを待機中（最大15秒）...`);
    
    try {
      // ページがリロードされるまで待機、またはレシピリンクが表示されるまで待機
      await Promise.race([
        page.waitForSelector('a[href*="/recipe/"]', { timeout: 15000 }),
        page.waitForLoadState('networkidle', { timeout: 15000 }),
      ]);
      console.log(`  ページ読み込み完了`);
    } catch (waitError) {
      console.warn(`  待機タイムアウト: レシピリンクが見つからない可能性`);
    }

    // 再度HTMLを取得（動的コンテンツ対応）
    const finalHtml = await page.content();

    // ステータスコードチェック
    // 202はWAFチャレンジページなので、実際のコンテンツが取得できているかで判断
    const hasRecipeLinks = finalHtml.includes('/recipe/');
    if (!hasRecipeLinks && (status === 202 || !response?.ok())) {
      console.warn(`  ⚠️ HTTPエラーまたはコンテンツなし: ${status}`);
      const bodySnippet = finalHtml.substring(0, 300).replace(/\s+/g, ' ');
      console.warn(`  ボディスニペット: ${bodySnippet}...`);
      throw new Error(`HTTP ${status}: No recipe content found`);
    }

    const $ = cheerio.load(finalHtml);

    // レシピカードを抽出
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
        console.log(`  セレクタ "${selector}" で ${links.length} 件のレシピを検出`);
        break;
      }
    }

    if (!recipeLinks || recipeLinks.length === 0) {
      console.warn(`  ⚠️ URLからレシピが見つかりませんでした`);
      // HTML構造が変わっている可能性があるので、デバッグ情報を出力
      const bodySnippet = html.substring(0, 500).replace(/\s+/g, ' ');
      console.warn(`  ボディスニペット: ${bodySnippet}...`);
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
          : new URL(href, `https://${CONFIG.expectedHostname}`).toString();

        // hostnameガード: Candidate.urlが必ず期待されるホストになることを保証
        const recipeUrlParsed = new URL(recipeUrl);
        if (recipeUrlParsed.hostname !== CONFIG.expectedHostname) {
          console.warn(`  ⚠️ スキップ: 想定外のhostname "${recipeUrlParsed.hostname}" のURL: ${recipeUrl}`);
          return;
        }

        // /recipe/ を含むURLのみ対象
        if (!recipeUrl.includes('/recipe/')) return;

        // 重複チェック
        if (urlSet.has(recipeUrl)) return;
        urlSet.add(recipeUrl);

        // タイトルを取得（複数パターンを試す）
        let title = $link.attr('title') || 
                    $link.find('img').attr('alt') ||
                    $link.text().trim() ||
                    CONFIG.fallbackTitle;

        // タイトルをクリーンアップ
        title = title.trim().replace(/\s+/g, ' ');

        // 候補として追加
        const candidate: CandidateRecipe = {
          title,
          url: recipeUrl,
          source: 'Nadia',
          author: CONFIG.defaultAuthor,
        };

        candidates.push(candidate);

        // 最大件数に達したら終了
        if (candidates.length >= CONFIG.maxItemsPerPage) {
          return false; // each loop を抜ける
        }
      } catch (error) {
        // 個別のレシピ抽出エラーは無視して続行
        console.warn('  レシピ抽出エラー（スキップ）:', error instanceof Error ? error.message : error);
      }
    });

    console.log(`  抽出成功: ${candidates.length}件`);
    return candidates;

  } catch (error) {
    console.error(`  ページ取得エラー:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

