/**
 * Candidate Pool Loader Module
 * Handles fetching, caching, and managing recipe candidate pool
 */

const CACHE_KEY = 'kondate.candidatePool.v1'
const CACHE_TIMESTAMP_KEY = 'kondate.candidatePool.timestamp.v1'

/**
 * Candidate recipe structure from candidate_pool.json
 */
export interface CandidateRecipe {
  title: string
  url: string
  source?: string
  author?: string
}

/**
 * Cached candidate pool data
 */
interface CandidatePoolCache {
  recipes: CandidateRecipe[]
  timestamp: string
}

/**
 * Minimal fallback recipes (embedded as last resort)
 * Used when both network fetch and cache fail
 */
const FALLBACK_RECIPES: CandidateRecipe[] = [
  { title: '豚の生姜焼き', url: 'https://www.sirogohan.com/recipe/syogayaki/', source: '白ごはん.com' },
  { title: '鶏の唐揚げ', url: 'https://www.sirogohan.com/recipe/karaage/', source: '白ごはん.com' },
  { title: '肉じゃが', url: 'https://www.sirogohan.com/recipe/nikujaga/', source: '白ごはん.com' },
  { title: 'ハンバーグ', url: 'https://www.sirogohan.com/recipe/hanba-gu/', source: '白ごはん.com' },
  { title: '麻婆豆腐', url: 'https://www.sirogohan.com/recipe/mabodofu/', source: '白ごはん.com' },
  { title: '豚汁', url: 'https://www.sirogohan.com/recipe/tonjiru/', source: '白ごはん.com' },
  { title: 'けんちん汁', url: 'https://www.sirogohan.com/recipe/kenchin/', source: '白ごはん.com' },
  { title: '味噌汁', url: 'https://www.sirogohan.com/recipe/misosiru/', source: '白ごはん.com' },
  { title: '鯖の味噌煮', url: 'https://www.sirogohan.com/recipe/sabamisoni/', source: '白ごはん.com' },
  { title: '鯖の塩焼き', url: 'https://www.sirogohan.com/recipe/yakizakana/', source: '白ごはん.com' },
  { title: 'かぼちゃの煮物', url: 'https://www.sirogohan.com/recipe/kabocha/', source: '白ごはん.com' },
  { title: '筑前煮', url: 'https://www.sirogohan.com/recipe/chikuzenni/', source: '白ごはん.com' },
  { title: 'コーンスープ', url: 'https://www.sirogohan.com/recipe/corn-soup/', source: '白ごはん.com' },
  { title: '野菜スープ', url: 'https://www.sirogohan.com/recipe/vegetable-soup/', source: '白ごはん.com' },
  { title: '鶏肉と大根の煮物', url: 'https://www.sirogohan.com/recipe/toridaikon/', source: '白ごはん.com' },
]

/**
 * Get the base path for assets
 * Respects VITE_BASE environment variable for GitHub Pages deployment
 */
function getBasePath(): string {
  // In production build, import.meta.env.BASE_URL contains the base path
  // For GitHub Pages: /kondate_maker/
  // For local dev: /
  return import.meta.env.BASE_URL || '/'
}

/**
 * Fetch candidate pool from public/candidate_pool.json
 */
async function fetchCandidatePool(): Promise<CandidateRecipe[]> {
  const basePath = getBasePath()
  const url = `${basePath}candidate_pool.json`
  
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch candidate pool: ${response.status} ${response.statusText}`)
    }
    const data = await response.json()
    
    // Validate the data structure
    if (!Array.isArray(data)) {
      throw new Error('Candidate pool data is not an array')
    }
    
    // Basic validation of recipe items
    const validRecipes = data.filter(item => 
      item && 
      typeof item === 'object' && 
      typeof item.title === 'string' && 
      typeof item.url === 'string'
    )
    
    if (validRecipes.length === 0) {
      throw new Error('No valid recipes found in candidate pool')
    }
    
    return validRecipes as CandidateRecipe[]
  } catch (error) {
    console.error('Error fetching candidate pool:', error)
    throw error
  }
}

/**
 * Load cached candidate pool from localStorage
 */
function loadCachedPool(): CandidatePoolCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    
    if (!cached || !timestamp) {
      return null
    }
    
    const recipes = JSON.parse(cached) as CandidateRecipe[]
    
    // Validate cached data structure
    if (!Array.isArray(recipes) || recipes.length === 0) {
      return null
    }
    
    // Validate individual recipe objects (same validation as fetchCandidatePool)
    const validRecipes = recipes.filter(item => 
      item && 
      typeof item === 'object' && 
      typeof item.title === 'string' && 
      typeof item.url === 'string'
    )
    
    if (validRecipes.length === 0) {
      return null
    }
    
    return { recipes: validRecipes, timestamp }
  } catch (error) {
    console.error('Error loading cached pool:', error)
    return null
  }
}

/**
 * Save candidate pool to localStorage cache
 */
function saveCachedPool(recipes: CandidateRecipe[]): void {
  try {
    const timestamp = new Date().toISOString()
    localStorage.setItem(CACHE_KEY, JSON.stringify(recipes))
    localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp)
  } catch (error) {
    console.error('Error saving cached pool:', error)
    // Non-fatal - continue without caching
  }
}

/**
 * Load candidate pool with caching strategy:
 * 1. Try to use cache
 * 2. If no cache or forceReload, fetch from network
 * 3. If fetch fails, use cache if available
 * 4. If all fails, use fallback recipes
 * 
 * @param forceReload If true, always fetch from network
 * @returns Object with recipes and metadata
 */
export async function loadCandidatePool(forceReload: boolean = false): Promise<{
  recipes: CandidateRecipe[]
  timestamp: string | null
  source: 'network' | 'cache' | 'fallback'
  warning?: string
}> {
  // Try cache first (unless force reload)
  if (!forceReload) {
    const cached = loadCachedPool()
    if (cached) {
      return {
        recipes: cached.recipes,
        timestamp: cached.timestamp,
        source: 'cache'
      }
    }
  }
  
  // Try to fetch from network
  try {
    const recipes = await fetchCandidatePool()
    const timestamp = new Date().toISOString()
    saveCachedPool(recipes)
    
    return {
      recipes,
      timestamp,
      source: 'network'
    }
  } catch (fetchError) {
    console.error('Failed to fetch candidate pool:', fetchError)
    
    // Fall back to cache if available
    const cached = loadCachedPool()
    if (cached) {
      return {
        recipes: cached.recipes,
        timestamp: cached.timestamp,
        source: 'cache',
        warning: '候補の取得に失敗しました。キャッシュを使用しています。'
      }
    }
    
    // Last resort: use fallback recipes
    return {
      recipes: FALLBACK_RECIPES,
      timestamp: null,
      source: 'fallback',
      warning: '候補の取得に失敗しました。最小限の候補で動作しています。'
    }
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return '未取得'
  }
  
  try {
    const date = new Date(timestamp)
    // ja-JP locale produces "YYYY/MM/DD HH:MM" format with space separator
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
  } catch {
    return '不明'
  }
}
