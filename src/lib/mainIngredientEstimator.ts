/**
 * Main Ingredient Estimator Module
 * Estimates primary protein ingredient from recipe titles
 */

/**
 * Main ingredient categories (primarily protein-based)
 */
export type MainIngredient = 
  | '豚肉'
  | '鶏肉'
  | '牛肉'
  | 'ひき肉'
  | '魚'
  | '卵'
  | '豆腐'
  | '厚揚げ'
  | 'その他'

/**
 * Keywords for detecting main ingredients in recipe titles
 * Order matters - more specific terms should come first
 */
const INGREDIENT_PATTERNS: { ingredient: MainIngredient; keywords: string[] }[] = [
  {
    ingredient: '豚肉',
    keywords: ['豚', '豚肉', 'ポーク', '豚バラ', '豚ロース', '豚こま', '豚ひき肉は除外'],
  },
  {
    ingredient: '鶏肉',
    keywords: ['鶏', '鶏肉', 'チキン', '鶏もも', '鶏むね', '鶏ささみ', '手羽', '鶏ひき肉は除外'],
  },
  {
    ingredient: '牛肉',
    keywords: ['牛', '牛肉', 'ビーフ', '牛バラ', '牛ロース', '牛こま', '牛ひき肉は除外'],
  },
  {
    ingredient: 'ひき肉',
    keywords: [
      'ひき肉', 'ひきにく', '挽肉', '挽き肉', 'ミンチ', '肉だね', '肉団子',
      'ハンバーグ', 'はんばーぐ',
      'ミートソース', 'ミートボール',
      '麻婆', 'マーボー',
    ],
  },
  {
    ingredient: '魚',
    keywords: [
      '鯖', 'さば', 'サバ',
      '鮭', 'さけ', 'サーモン',
      '鯵', 'あじ', 'アジ',
      '鰆', 'さわら', 'サワラ',
      '鱈', 'たら', 'タラ',
      '秋刀魚', 'さんま', 'サンマ',
      '鰤', 'ぶり', 'ブリ',
      '鰹', 'かつお', 'カツオ',
      'マグロ', 'まぐろ', 'ツナ',
      'カレイ', '平目', 'ヒラメ',
      '魚', '白身魚', '青魚',
    ],
  },
  {
    ingredient: '卵',
    keywords: ['卵', 'たまご', 'タマゴ', 'エッグ', 'オムレツ', 'オムライス'],
  },
  {
    ingredient: '豆腐',
    keywords: ['豆腐', 'とうふ', '絹ごし', '木綿豆腐'],
  },
  {
    ingredient: '厚揚げ',
    keywords: ['厚揚げ', 'あつあげ', '油揚げ'],
  },
]

/**
 * Estimate the main ingredient (protein) from a recipe title
 * @param title Recipe title to analyze
 * @returns Estimated main ingredient, or 'その他' if no match found
 */
export function estimateMainIngredient(title: string): MainIngredient {
  if (!title || title.trim().length === 0) {
    return 'その他'
  }

  const normalizedTitle = title.toLowerCase()

  // Check each pattern in order (more specific first)
  for (const pattern of INGREDIENT_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (normalizedTitle.includes(keyword.toLowerCase())) {
        return pattern.ingredient
      }
    }
  }

  return 'その他'
}

/**
 * Get a list of all available main ingredient options
 * Useful for UI dropdowns
 */
export function getAllMainIngredients(): MainIngredient[] {
  return [
    '豚肉',
    '鶏肉', 
    '牛肉',
    'ひき肉',
    '魚',
    '卵',
    '豆腐',
    '厚揚げ',
    'その他',
  ]
}
