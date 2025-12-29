/**
 * Notion Integration Module
 * Provides high-level functions to load recipes from Notion with scoring
 */

import { createNotionClient, isNotionConfigured, getNotionConfig, fetchRecipes, fetchMealLogs } from './notionClient'
import { mapToRecipes, mapToMealLogs } from './notionMapper'
import { scoreRecipes, selectTopRecipes, DEFAULT_RECENCY_WINDOW } from './recipeScoring'
import { CandidateRecipe } from './candidatePool'
import { NotionRecipe, ScoredRecipe } from './notionTypes'

// Re-export for external use
export { isNotionConfigured }

/**
 * Result of loading recipes from Notion
 */
export interface NotionLoadResult {
  recipes: CandidateRecipe[]
  timestamp: string
  source: 'notion'
  notionMetadata?: {
    totalRecipes: number
    scoredRecipes: ScoredRecipe[]
    recencyWindowUsed: number
    wasRelaxed: boolean
  }
  warning?: string
  error?: string
}

/**
 * Convert NotionRecipe to CandidateRecipe format
 */
function notionRecipeToCandidateRecipe(notionRecipe: NotionRecipe): CandidateRecipe {
  return {
    title: notionRecipe.name,
    url: notionRecipe.url || '#', // Use placeholder if no URL
    source: 'Notion'
  }
}

/**
 * Load recipes from Notion with scoring
 * @param count Number of recipes to select (optional, returns all if not specified)
 * @param recencyWindowDays Number of days for recency suppression (default 14)
 * @returns NotionLoadResult with recipes and metadata
 */
export async function loadNotionRecipes(
  count?: number,
  recencyWindowDays: number = DEFAULT_RECENCY_WINDOW
): Promise<NotionLoadResult> {
  // Check if Notion is configured
  if (!isNotionConfigured()) {
    return {
      recipes: [],
      timestamp: new Date().toISOString(),
      source: 'notion',
      error: 'Notion integration is not configured. Please set VITE_NOTION_TOKEN, VITE_NOTION_RECIPES_DATA_SOURCE_ID, and VITE_NOTION_MEAL_LOGS_DATA_SOURCE_ID.'
    }
  }

  const config = getNotionConfig()
  
  try {
    // Create Notion client
    const client = createNotionClient()
    if (!client) {
      throw new Error('Failed to create Notion client')
    }

    // Fetch recipes and meal logs
    const [recipesPages, mealLogsPages] = await Promise.all([
      fetchRecipes(client, config.recipesDataSourceId!),
      fetchMealLogs(client, config.mealLogsDataSourceId!, recencyWindowDays)
    ])

    // Map to internal types
    const recipes = mapToRecipes(recipesPages)
    const mealLogs = mapToMealLogs(mealLogsPages)

    console.log(`Loaded ${recipes.length} recipes and ${mealLogs.length} meal logs from Notion`)

    // If no recipes found
    if (recipes.length === 0) {
      return {
        recipes: [],
        timestamp: new Date().toISOString(),
        source: 'notion',
        warning: 'No active recipes found in Notion. Please add recipes or check the Active filter.',
        notionMetadata: {
          totalRecipes: 0,
          scoredRecipes: [],
          recencyWindowUsed: recencyWindowDays,
          wasRelaxed: false
        }
      }
    }

    // Score and select recipes
    let scoredRecipes: ScoredRecipe[]
    let recencyWindowUsed = recencyWindowDays
    let wasRelaxed = false
    let warning: string | undefined

    if (count !== undefined) {
      // Select top N recipes with optional relaxation
      const result = selectTopRecipes(recipes, mealLogs, count, recencyWindowDays)
      scoredRecipes = result.scoredRecipes
      recencyWindowUsed = result.recencyWindowUsed
      wasRelaxed = result.wasRelaxed
      warning = result.warning
    } else {
      // Return all recipes, sorted by score
      scoredRecipes = scoreRecipes(recipes, mealLogs, recencyWindowDays)
    }

    // Convert to CandidateRecipe format
    const candidateRecipes = scoredRecipes.map(scored => 
      notionRecipeToCandidateRecipe(scored.recipe)
    )

    return {
      recipes: candidateRecipes,
      timestamp: new Date().toISOString(),
      source: 'notion',
      notionMetadata: {
        totalRecipes: recipes.length,
        scoredRecipes,
        recencyWindowUsed,
        wasRelaxed
      },
      warning
    }
  } catch (error) {
    console.error('Error loading recipes from Notion:', error)
    return {
      recipes: [],
      timestamp: new Date().toISOString(),
      source: 'notion',
      error: `Failed to load recipes from Notion: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Check if Notion integration is available and working
 * @returns Object with availability status and message
 */
export async function checkNotionAvailability(): Promise<{
  available: boolean
  message: string
}> {
  if (!isNotionConfigured()) {
    return {
      available: false,
      message: 'Notion integration is not configured. Missing environment variables.'
    }
  }

  try {
    const config = getNotionConfig()
    const client = createNotionClient()
    
    if (!client) {
      return {
        available: false,
        message: 'Failed to create Notion client'
      }
    }

    // Try to fetch a small sample to verify connectivity
    await fetchRecipes(client, config.recipesDataSourceId!)
    
    return {
      available: true,
      message: 'Notion integration is configured and accessible'
    }
  } catch (error) {
    return {
      available: false,
      message: `Notion connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
