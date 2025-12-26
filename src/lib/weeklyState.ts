/**
 * Weekly State Persistence Module
 * Handles saving and loading complete weekly state to/from localStorage
 */

import { MenuSlot } from '../types/menu'

const WEEKLY_STATE_KEY_PREFIX = 'kondate.weeklyState'
const SCHEMA_VERSION = 1

/**
 * Shopping list item
 */
export interface ShoppingListItem {
  id: string
  ingredient: string
  checked: boolean
}

/**
 * Complete weekly state
 */
export interface WeeklyState {
  schemaVersion: number
  weekKey: string
  menuSlots: MenuSlot[]
  shoppingList: ShoppingListItem[]
  lastUpdated: string
}

/**
 * Get the start of the week (Monday) for a given date
 * Note: Sunday is treated as the last day of the previous week
 * @param date Date to get week start for (defaults to today)
 * @returns Date object representing Monday of that week
 * @example
 * // For any day from Monday to Saturday, returns the Monday of that week
 * getWeekStart(new Date('2024-12-26')) // Thursday -> Monday Dec 23
 * // For Sunday, returns the Monday of the previous week
 * getWeekStart(new Date('2024-12-29')) // Sunday -> Monday Dec 23
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // If Sunday (0), go back 6 days; otherwise go to Monday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Generate a week key from a date (YYYY-MM-DD format of Monday)
 * @param date Date to generate key for (defaults to today)
 * @returns Week key string
 */
export function getWeekKey(date: Date = new Date()): string {
  const weekStart = getWeekStart(date)
  const year = weekStart.getFullYear()
  const month = String(weekStart.getMonth() + 1).padStart(2, '0')
  const day = String(weekStart.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get storage key for a specific week
 * @param weekKey Week key (defaults to current week)
 * @returns Storage key string
 */
function getStorageKey(weekKey: string = getWeekKey()): string {
  return `${WEEKLY_STATE_KEY_PREFIX}.${weekKey}`
}

/**
 * Load weekly state from localStorage
 * @param weekKey Optional week key (defaults to current week)
 * @returns WeeklyState or null if not found or invalid
 */
export function loadWeeklyState(weekKey?: string): WeeklyState | null {
  try {
    const key = weekKey || getWeekKey()
    const storageKey = getStorageKey(key)
    const stored = localStorage.getItem(storageKey)
    
    if (!stored) {
      return null
    }

    const parsed = JSON.parse(stored) as WeeklyState

    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      console.warn('Invalid weekly state structure')
      return null
    }
    
    // Check schema version
    if (!parsed.schemaVersion || typeof parsed.schemaVersion !== 'number' || 
        parsed.schemaVersion < 1 || !Number.isInteger(parsed.schemaVersion)) {
      console.warn('Missing or invalid schema version')
      return null
    }
    
    // For now, we only support schema version 1
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      console.warn(`Unsupported schema version: ${parsed.schemaVersion}`)
      return null
    }
    
    if (!Array.isArray(parsed.menuSlots)) {
      console.warn('Invalid menuSlots structure')
      return null
    }
    if (!Array.isArray(parsed.shoppingList)) {
      console.warn('Invalid shoppingList structure')
      return null
    }
    if (!parsed.lastUpdated || typeof parsed.lastUpdated !== 'string') {
      console.warn('Missing or invalid lastUpdated')
      return null
    }
    if (!parsed.weekKey || typeof parsed.weekKey !== 'string') {
      console.warn('Missing or invalid weekKey')
      return null
    }

    return parsed
  } catch (error) {
    console.error('Failed to load weekly state:', error)
    return null
  }
}

/**
 * Save weekly state to localStorage
 * @param state WeeklyState to save
 * @param weekKey Optional week key (defaults to current week)
 */
export function saveWeeklyState(state: WeeklyState, weekKey?: string): void {
  try {
    const key = weekKey || getWeekKey()
    const storageKey = getStorageKey(key)
    
    // Ensure state has schema version and weekKey
    const stateToSave: WeeklyState = {
      ...state,
      schemaVersion: SCHEMA_VERSION,
      weekKey: key,
    }
    
    const serialized = JSON.stringify(stateToSave)
    localStorage.setItem(storageKey, serialized)
  } catch (error) {
    console.error('Failed to save weekly state:', error)
    throw new Error('週状態の保存に失敗しました')
  }
}

/**
 * Clear weekly state from localStorage
 * @param weekKey Optional week key (defaults to current week)
 */
export function clearWeeklyState(weekKey?: string): void {
  try {
    const key = weekKey || getWeekKey()
    const storageKey = getStorageKey(key)
    localStorage.removeItem(storageKey)
  } catch (error) {
    console.error('Failed to clear weekly state:', error)
    throw new Error('週状態のクリアに失敗しました')
  }
}

/**
 * Update menu slots in the saved state
 * @param menuSlots New menu slots to save
 */
export function updateMenuSlots(menuSlots: MenuSlot[]): void {
  const currentState = loadWeeklyState()
  const weekKey = getWeekKey()
  
  const newState: WeeklyState = {
    schemaVersion: SCHEMA_VERSION,
    weekKey,
    menuSlots,
    shoppingList: currentState?.shoppingList || [],
    lastUpdated: new Date().toISOString(),
  }
  
  saveWeeklyState(newState, weekKey)
}

/**
 * Update shopping list in the saved state
 * @param shoppingList New shopping list to save
 */
export function updateShoppingList(shoppingList: ShoppingListItem[]): void {
  const currentState = loadWeeklyState()
  const weekKey = getWeekKey()
  
  const newState: WeeklyState = {
    schemaVersion: SCHEMA_VERSION,
    weekKey,
    menuSlots: currentState?.menuSlots || [],
    shoppingList,
    lastUpdated: new Date().toISOString(),
  }
  
  saveWeeklyState(newState, weekKey)
}
