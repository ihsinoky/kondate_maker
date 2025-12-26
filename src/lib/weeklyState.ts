/**
 * Weekly State Persistence Module
 * Handles saving and loading complete weekly state to/from localStorage
 */

import { MenuSlot } from '../types/menu'

const WEEKLY_STATE_KEY = 'kondate.weeklyState.v1'

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
  menuSlots: MenuSlot[]
  shoppingList: ShoppingListItem[]
  lastUpdated: string
}

/**
 * Load weekly state from localStorage
 * @returns WeeklyState or null if not found or invalid
 */
export function loadWeeklyState(): WeeklyState | null {
  try {
    const stored = localStorage.getItem(WEEKLY_STATE_KEY)
    if (!stored) {
      return null
    }

    const parsed = JSON.parse(stored) as WeeklyState

    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    if (!Array.isArray(parsed.menuSlots)) {
      return null
    }
    if (!Array.isArray(parsed.shoppingList)) {
      return null
    }
    if (!parsed.lastUpdated || typeof parsed.lastUpdated !== 'string') {
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
 */
export function saveWeeklyState(state: WeeklyState): void {
  try {
    const serialized = JSON.stringify(state)
    localStorage.setItem(WEEKLY_STATE_KEY, serialized)
  } catch (error) {
    console.error('Failed to save weekly state:', error)
    throw new Error('週状態の保存に失敗しました')
  }
}

/**
 * Clear weekly state from localStorage
 */
export function clearWeeklyState(): void {
  try {
    localStorage.removeItem(WEEKLY_STATE_KEY)
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
  
  const newState: WeeklyState = {
    menuSlots,
    shoppingList: currentState?.shoppingList || [],
    lastUpdated: new Date().toISOString(),
  }
  
  saveWeeklyState(newState)
}

/**
 * Update shopping list in the saved state
 * @param shoppingList New shopping list to save
 */
export function updateShoppingList(shoppingList: ShoppingListItem[]): void {
  const currentState = loadWeeklyState()
  
  const newState: WeeklyState = {
    menuSlots: currentState?.menuSlots || [],
    shoppingList,
    lastUpdated: new Date().toISOString(),
  }
  
  saveWeeklyState(newState)
}
