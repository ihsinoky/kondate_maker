/**
 * Recipe Scoring Module
 * Implements recency suppression and high-rating priority
 */

import { NotionRecipe, NotionMealLog, ScoredRecipe } from './notionTypes'

/**
 * Default recency window in days
 */
export const DEFAULT_RECENCY_WINDOW = 14

/**
 * Scoring weights
 */
const RATING_WEIGHT = 10 // Each rating point adds 10 to score
const RECENCY_PENALTY = 30 // Penalty for recipes used within recency window

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const diff = date1.getTime() - date2.getTime()
  return Math.floor(diff / msPerDay)
}

/**
 * Build a map of recipe ID to last used date
 * @param mealLogs Array of meal logs
 * @returns Map of recipe ID to most recent usage date
 */
function buildLastUsedMap(mealLogs: NotionMealLog[]): Map<string, string> {
  const lastUsedMap = new Map<string, string>()
  
  for (const log of mealLogs) {
    const existing = lastUsedMap.get(log.recipeId)
    // Keep the most recent date (logs should be sorted descending by date)
    if (!existing || log.date > existing) {
      lastUsedMap.set(log.recipeId, log.date)
    }
  }
  
  return lastUsedMap
}

/**
 * Calculate score for a recipe based on rating and recency
 * @param recipe Recipe to score
 * @param lastUsed Last used date (ISO string) or undefined
 * @param recencyWindowDays Number of days for recency penalty
 * @returns Scored recipe with score and metadata
 */
export function scoreRecipe(
  recipe: NotionRecipe,
  lastUsed: string | undefined,
  recencyWindowDays: number = DEFAULT_RECENCY_WINDOW
): ScoredRecipe {
  // Base score from rating (1-5, default 3)
  const rating = recipe.rating ?? 3
  let score = rating * RATING_WEIGHT
  
  let lastUsedDaysAgo: number | undefined
  let reason = `Rating: ${rating}`
  
  // Apply recency penalty if recipe was used recently
  if (lastUsed) {
    const lastUsedDate = new Date(lastUsed)
    const today = new Date()
    lastUsedDaysAgo = daysBetween(today, lastUsedDate)
    
    if (lastUsedDaysAgo <= recencyWindowDays) {
      score -= RECENCY_PENALTY
      reason += `, Used ${lastUsedDaysAgo} days ago (penalty applied)`
    } else {
      reason += `, Last used ${lastUsedDaysAgo} days ago (no penalty)`
    }
  } else {
    reason += ', Never used (no penalty)'
  }
  
  return {
    recipe,
    score,
    lastUsedDaysAgo,
    reason
  }
}

/**
 * Score all recipes based on meal log history
 * @param recipes Array of recipes to score
 * @param mealLogs Array of meal logs
 * @param recencyWindowDays Number of days for recency penalty
 * @returns Array of scored recipes, sorted by score (descending)
 */
export function scoreRecipes(
  recipes: NotionRecipe[],
  mealLogs: NotionMealLog[],
  recencyWindowDays: number = DEFAULT_RECENCY_WINDOW
): ScoredRecipe[] {
  const lastUsedMap = buildLastUsedMap(mealLogs)
  
  const scoredRecipes = recipes.map(recipe => {
    const lastUsed = lastUsedMap.get(recipe.id)
    return scoreRecipe(recipe, lastUsed, recencyWindowDays)
  })
  
  // Sort by score descending (highest score first)
  scoredRecipes.sort((a, b) => b.score - a.score)
  
  return scoredRecipes
}

/**
 * Relaxation strategy for insufficient candidates
 * Returns a new recency window that's less restrictive
 */
export function relaxRecencyWindow(currentWindow: number): number | null {
  if (currentWindow > 14) {
    return 14 // Reset to standard if already relaxed beyond
  } else if (currentWindow === 14) {
    return 7 // First relaxation: 14 days -> 7 days
  } else if (currentWindow === 7) {
    return 0 // Second relaxation: 7 days -> no recency restriction
  }
  return null // Already at maximum relaxation
}

/**
 * Get top N recipes with optional relaxation if insufficient candidates
 * @param recipes Array of all recipes
 * @param mealLogs Array of meal logs
 * @param count Number of recipes to select
 * @param initialRecencyWindow Initial recency window (default 14 days)
 * @returns Object with selected recipes and metadata
 */
export function selectTopRecipes(
  recipes: NotionRecipe[],
  mealLogs: NotionMealLog[],
  count: number,
  initialRecencyWindow: number = DEFAULT_RECENCY_WINDOW
): {
  scoredRecipes: ScoredRecipe[]
  recencyWindowUsed: number
  wasRelaxed: boolean
  warning?: string
} {
  let recencyWindow = initialRecencyWindow
  let scoredRecipes = scoreRecipes(recipes, mealLogs, recencyWindow)
  let wasRelaxed = false
  let warning: string | undefined
  
  // If we don't have enough candidates, try relaxing the recency window
  while (scoredRecipes.length < count && recencyWindow > 0) {
    const newWindow = relaxRecencyWindow(recencyWindow)
    if (newWindow === null) {
      break // Can't relax further
    }
    
    wasRelaxed = true
    recencyWindow = newWindow
    scoredRecipes = scoreRecipes(recipes, mealLogs, recencyWindow)
    
    if (recencyWindow === 0) {
      warning = '候補不足のため、直近抑制を解除しました。'
    } else {
      warning = `候補不足のため、直近抑制を${recencyWindow}日に緩和しました。`
    }
  }
  
  // Take top N
  const selected = scoredRecipes.slice(0, count)
  
  // If still insufficient, add warning
  if (selected.length < count) {
    warning = `候補が不足しています（必要: ${count}件、取得: ${selected.length}件）。Notionのレシピを追加してください。`
  }
  
  return {
    scoredRecipes: selected,
    recencyWindowUsed: recencyWindow,
    wasRelaxed,
    warning
  }
}
