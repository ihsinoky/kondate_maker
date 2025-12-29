/**
 * Notion Client Module
 * Handles fetching data from Notion using API 2025-09-03
 */

import { Client } from '@notionhq/client'

// Configuration from environment variables (for build-time)
// In browser environment, these would need to be passed from a backend
interface NotionConfig {
  token?: string
  recipesDataSourceId?: string
  mealLogsDataSourceId?: string
  notionVersion: string
}

/**
 * Get Notion configuration
 * Note: For browser apps, tokens should be handled server-side
 * This is a placeholder for the configuration structure
 */
export function getNotionConfig(): NotionConfig {
  return {
    token: import.meta.env.VITE_NOTION_TOKEN,
    recipesDataSourceId: import.meta.env.VITE_NOTION_RECIPES_DATA_SOURCE_ID,
    mealLogsDataSourceId: import.meta.env.VITE_NOTION_MEAL_LOGS_DATA_SOURCE_ID,
    notionVersion: '2025-09-03'
  }
}

/**
 * Check if Notion integration is configured
 */
export function isNotionConfigured(): boolean {
  const config = getNotionConfig()
  return !!(config.token && config.recipesDataSourceId && config.mealLogsDataSourceId)
}

/**
 * Create Notion client with configured settings
 */
export function createNotionClient(token?: string): Client | null {
  const config = getNotionConfig()
  const authToken = token || config.token
  
  if (!authToken) {
    return null
  }

  return new Client({
    auth: authToken,
    notionVersion: config.notionVersion
  })
}

/**
 * Raw response type from Notion data source query
 * Simplified version - actual response has more fields
 */
export interface NotionDataSourceQueryResponse {
  results: NotionPage[]
  has_more: boolean
  next_cursor: string | null
}

/**
 * Notion page structure (simplified)
 */
export interface NotionPage {
  id: string
  properties: Record<string, NotionProperty>
}

/**
 * Notion property types (simplified)
 */
export type NotionProperty = 
  | { type: 'title'; title: Array<{ plain_text: string }> }
  | { type: 'rich_text'; rich_text: Array<{ plain_text: string }> }
  | { type: 'url'; url: string | null }
  | { type: 'number'; number: number | null }
  | { type: 'select'; select: { name: string } | null }
  | { type: 'multi_select'; multi_select: Array<{ name: string }> }
  | { type: 'checkbox'; checkbox: boolean }
  | { type: 'date'; date: { start: string } | null }
  | { type: 'relation'; relation: Array<{ id: string }> }

/**
 * Filter type for Notion queries
 */
type NotionFilter = Record<string, unknown>

/**
 * Sort type for Notion queries
 */
type NotionSort = Record<string, unknown>

/**
 * Extended Notion client interface with data source API support
 * The official SDK types don't include dataSources yet (as of v2.2.15)
 */
interface ExtendedNotionClient extends Client {
  dataSources: {
    query(params: {
      data_source_id: string
      start_cursor?: string
      filter?: NotionFilter
      sorts?: NotionSort[]
      page_size?: number
    }): Promise<{
      results: unknown[]
      has_more: boolean
      next_cursor: string | null
    }>
  }
}

/**
 * Query Notion data source with pagination support
 * @param client Notion client
 * @param dataSourceId Data source ID to query
 * @param filter Optional filter object
 * @param sorts Optional sort configuration
 * @returns All pages from the data source
 */
export async function queryDataSource(
  client: Client,
  dataSourceId: string,
  filter?: NotionFilter,
  sorts?: NotionSort[]
): Promise<NotionPage[]> {
  const allPages: NotionPage[] = []
  let hasMore = true
  let startCursor: string | undefined = undefined

  try {
    // Cast to extended client type that includes dataSources API
    const extendedClient = client as unknown as ExtendedNotionClient
    
    while (hasMore) {
      const response = await extendedClient.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: startCursor,
        filter: filter,
        sorts: sorts,
        page_size: 100 // Max page size
      })

      allPages.push(...(response.results as NotionPage[]))
      hasMore = response.has_more
      startCursor = response.next_cursor || undefined
    }

    return allPages
  } catch (error) {
    console.error('Error querying Notion data source:', error)
    throw new Error(`Failed to query Notion data source: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Fetch recipes from Notion Recipes data source
 * @param client Notion client
 * @param dataSourceId Recipes data source ID
 * @returns Array of raw Notion pages
 */
export async function fetchRecipes(
  client: Client,
  dataSourceId: string
): Promise<NotionPage[]> {
  // Filter: Active = true (or Active property doesn't exist/is unchecked by default)
  // Sort: Rating descending (high ratings first)
  const filter = {
    property: 'Active',
    checkbox: {
      equals: true
    }
  }

  const sorts = [
    {
      property: 'Rating',
      direction: 'descending'
    }
  ]

  return queryDataSource(client, dataSourceId, filter, sorts)
}

/**
 * Fetch meal logs from Notion Meal Logs data source
 * @param client Notion client
 * @param dataSourceId Meal Logs data source ID
 * @param daysBack Number of days to look back (default 14)
 * @returns Array of raw Notion pages
 */
export async function fetchMealLogs(
  client: Client,
  dataSourceId: string,
  daysBack: number = 14
): Promise<NotionPage[]> {
  // Calculate date threshold
  const threshold = new Date()
  threshold.setDate(threshold.getDate() - daysBack)
  const thresholdIso = threshold.toISOString().split('T')[0] // YYYY-MM-DD

  // Filter: Date >= threshold
  const filter = {
    property: 'Date',
    date: {
      on_or_after: thresholdIso
    }
  }

  // Sort by date descending (most recent first)
  const sorts = [
    {
      property: 'Date',
      direction: 'descending'
    }
  ]

  return queryDataSource(client, dataSourceId, filter, sorts)
}
