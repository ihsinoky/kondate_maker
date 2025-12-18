/**
 * Types for menu planning
 */

/**
 * Represents a single menu item (recipe)
 */
export interface MenuItem {
  title: string
  url: string
  source?: string // e.g., "クックパッド", "楽天レシピ"
}

/**
 * Day of week in Japanese
 */
export type DayOfWeek = '土' | '日' | '月' | '火' | '水' | '木' | '金'

/**
 * Meal time
 */
export type MealTime = '昼' | '夜'

/**
 * A menu slot representing a specific day and meal
 */
export interface MenuSlot {
  day: DayOfWeek
  mealTime: MealTime
  items: MenuItem[]
  warning?: string // Optional warning message (e.g., "要確認（スープ候補不足）")
  isSoup?: boolean // Indicates if this is a soup-based dish
}
