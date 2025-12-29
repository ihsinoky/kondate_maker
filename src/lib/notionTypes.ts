/**
 * Internal types for Notion integration
 * Maps Notion API responses to application domain models
 */

/**
 * Internal representation of a recipe from Notion
 */
export interface NotionRecipe {
  id: string
  name: string
  url?: string
  rating?: number // 1-5, default 3
  ingredients?: string[]
  category?: string
  cookTimeMin?: number
  active: boolean
}

/**
 * Internal representation of a meal log from Notion
 */
export interface NotionMealLog {
  id: string
  date: string // ISO date string
  recipeId: string
  recipeName?: string
  ratingAfter?: number
  memo?: string
}

/**
 * Recipe with scoring for candidate selection
 */
export interface ScoredRecipe {
  recipe: NotionRecipe
  score: number
  lastUsedDaysAgo?: number
  reason?: string // Debug info about scoring
}
