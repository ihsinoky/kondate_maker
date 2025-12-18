/**
 * Soup detection utilities
 * Used to identify soup-based recipes for Friday dinner priority
 */

/**
 * Keywords used to detect soup-based recipes
 * These are checked against recipe titles (case-insensitive)
 */
export const SOUP_KEYWORDS = [
  'スープ',
  'シチュー',
  'ポタージュ',
  '豚汁',
  '味噌汁',
  '鍋',
  'みそ汁',
  'ミネストローネ',
  'コンソメ',
  'クリームスープ',
  'けんちん汁',
  'お吸い物',
] as const

/**
 * Pre-computed lowercase versions of soup keywords for performance
 * Frozen to prevent accidental mutations
 */
const SOUP_KEYWORDS_LOWER = Object.freeze(
  SOUP_KEYWORDS.map(keyword => keyword.toLowerCase())
)

/**
 * Check if a recipe title indicates a soup-based dish
 * @param title Recipe title to check
 * @returns true if the title contains soup keywords
 */
export function isSoupRecipe(title: string): boolean {
  if (!title) {
    return false
  }
  
  const normalizedTitle = title.toLowerCase()
  return SOUP_KEYWORDS_LOWER.some(keyword => 
    normalizedTitle.includes(keyword)
  )
}
