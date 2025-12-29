/**
 * Notion Mapper Module
 * Maps Notion API responses to internal domain models
 */

import { NotionPage, NotionProperty } from './notionClient'
import { NotionRecipe, NotionMealLog } from './notionTypes'

/**
 * Extract plain text from a title property
 */
function extractTitle(property: NotionProperty | undefined): string {
  if (!property || property.type !== 'title') {
    return ''
  }
  return property.title.map(t => t.plain_text).join('')
}

/**
 * Extract plain text from a rich_text property
 */
function extractRichText(property: NotionProperty | undefined): string {
  if (!property || property.type !== 'rich_text') {
    return ''
  }
  return property.rich_text.map(t => t.plain_text).join('')
}

/**
 * Extract URL from a url property
 */
function extractUrl(property: NotionProperty | undefined): string | undefined {
  if (!property || property.type !== 'url') {
    return undefined
  }
  return property.url || undefined
}

/**
 * Extract number from a number property
 */
function extractNumber(property: NotionProperty | undefined): number | undefined {
  if (!property || property.type !== 'number') {
    return undefined
  }
  return property.number ?? undefined
}

/**
 * Extract select name from a select property
 */
function extractSelect(property: NotionProperty | undefined): string | undefined {
  if (!property || property.type !== 'select') {
    return undefined
  }
  return property.select?.name
}

/**
 * Extract multi-select names from a multi_select property
 */
function extractMultiSelect(property: NotionProperty | undefined): string[] {
  if (!property || property.type !== 'multi_select') {
    return []
  }
  return property.multi_select.map(s => s.name)
}

/**
 * Extract checkbox value from a checkbox property
 * Note: Defaults to true if property doesn't exist, consistent with the query filter
 * that explicitly looks for Active=true. Recipes without Active property won't be
 * returned by the query, so this default only applies to edge cases.
 */
function extractCheckbox(property: NotionProperty | undefined): boolean {
  if (!property || property.type !== 'checkbox') {
    return true // Default to true if property doesn't exist
  }
  return property.checkbox
}

/**
 * Extract date from a date property
 */
function extractDate(property: NotionProperty | undefined): string | undefined {
  if (!property || property.type !== 'date') {
    return undefined
  }
  return property.date?.start
}

/**
 * Extract relation IDs from a relation property
 */
function extractRelation(property: NotionProperty | undefined): string[] {
  if (!property || property.type !== 'relation') {
    return []
  }
  return property.relation.map(r => r.id)
}

/**
 * Map Notion page to NotionRecipe
 * @param page Notion page from Recipes data source
 * @returns NotionRecipe or null if required fields are missing
 */
export function mapToRecipe(page: NotionPage): NotionRecipe | null {
  try {
    const name = extractTitle(page.properties.Name)
    
    // Name is required
    if (!name) {
      console.warn('Recipe missing required Name property:', page.id)
      return null
    }

    const rating = extractNumber(page.properties.Rating)
    const url = extractUrl(page.properties.URL)
    const ingredients = extractMultiSelect(page.properties.Ingredients)
    const category = extractSelect(page.properties.Category)
    const cookTimeMin = extractNumber(page.properties.CookTimeMin)
    const active = extractCheckbox(page.properties.Active)

    return {
      id: page.id,
      name,
      url,
      rating: rating !== undefined ? rating : 3, // Default rating is 3
      ingredients: ingredients.length > 0 ? ingredients : undefined,
      category,
      cookTimeMin,
      active
    }
  } catch (error) {
    console.error('Error mapping Notion page to Recipe:', page.id, error)
    return null
  }
}

/**
 * Map Notion page to NotionMealLog
 * @param page Notion page from Meal Logs data source
 * @returns NotionMealLog or null if required fields are missing
 */
export function mapToMealLog(page: NotionPage): NotionMealLog | null {
  try {
    const date = extractDate(page.properties.Date)
    const recipeRelation = extractRelation(page.properties.Recipe)
    
    // Date and Recipe relation are required
    if (!date || recipeRelation.length === 0) {
      console.warn('Meal log missing required Date or Recipe property:', page.id)
      return null
    }

    const recipeId = recipeRelation[0] // Take first related recipe
    const ratingAfter = extractNumber(page.properties.RatingAfter)
    const memo = extractRichText(page.properties.Memo)

    return {
      id: page.id,
      date,
      recipeId,
      ratingAfter,
      memo: memo || undefined
    }
  } catch (error) {
    console.error('Error mapping Notion page to MealLog:', page.id, error)
    return null
  }
}

/**
 * Batch map Notion pages to recipes, filtering out invalid entries
 * @param pages Array of Notion pages
 * @returns Array of valid NotionRecipes
 */
export function mapToRecipes(pages: NotionPage[]): NotionRecipe[] {
  return pages
    .map(mapToRecipe)
    .filter((recipe): recipe is NotionRecipe => recipe !== null)
}

/**
 * Batch map Notion pages to meal logs, filtering out invalid entries
 * @param pages Array of Notion pages
 * @returns Array of valid NotionMealLogs
 */
export function mapToMealLogs(pages: NotionPage[]): NotionMealLog[] {
  return pages
    .map(mapToMealLog)
    .filter((log): log is NotionMealLog => log !== null)
}
