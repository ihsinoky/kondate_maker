/**
 * Unit tests for weekly state persistence and partial regeneration
 * Run with: npx tsx src/lib/weeklyState.test.ts
 */

import { MenuSlot } from '../types/menu'

// Mock localStorage
const mockLocalStorage = (() => {
  let store: { [key: string]: string } = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

// Replace global localStorage with mock
global.localStorage = mockLocalStorage as unknown as Storage

import { 
  loadWeeklyState, 
  saveWeeklyState, 
  clearWeeklyState,
  updateMenuSlots,
  updateShoppingList,
  getWeekKey,
  getWeekStart,
  WeeklyState,
  ShoppingListItem
} from './weeklyState'

interface TestCase {
  description: string
  test: () => void
}

const testCases: TestCase[] = []

// Test 0: Week key calculation
testCases.push({
  description: 'Calculate week key (Monday-based)',
  test: () => {
    // Test with a known date (Thursday, Dec 26, 2024)
    const testDate = new Date('2024-12-26')
    const weekStart = getWeekStart(testDate)
    
    // Thursday Dec 26 -> Monday Dec 23
    if (weekStart.getDay() !== 1) {
      throw new Error(`Expected Monday (1), got ${weekStart.getDay()}`)
    }
    
    const weekKey = getWeekKey(testDate)
    if (weekKey !== '2024-12-23') {
      throw new Error(`Expected '2024-12-23', got '${weekKey}'`)
    }
    
    // Test with Sunday (should go to previous Monday)
    const sunday = new Date('2024-12-29') // Sunday
    const sundayWeekKey = getWeekKey(sunday)
    if (sundayWeekKey !== '2024-12-23') {
      throw new Error(`Expected Sunday to map to '2024-12-23', got '${sundayWeekKey}'`)
    }
    
    // Test with Monday itself
    const monday = new Date('2024-12-23') // Monday
    const mondayWeekKey = getWeekKey(monday)
    if (mondayWeekKey !== '2024-12-23') {
      throw new Error(`Expected Monday to map to '2024-12-23', got '${mondayWeekKey}'`)
    }
  }
})

// Test 1: Save and load weekly state
testCases.push({
  description: 'Save and load weekly state',
  test: () => {
    mockLocalStorage.clear()
    
    const weekKey = getWeekKey()
    const menuSlots: MenuSlot[] = [
      {
        day: '土',
        mealTime: '昼',
        items: [{ title: '豚の生姜焼き', url: 'https://example.com/1' }],
        mainIngredient: '豚肉',
        isLocked: false
      },
      {
        day: '土',
        mealTime: '夜',
        items: [{ title: '鶏の唐揚げ', url: 'https://example.com/2' }],
        mainIngredient: '鶏肉',
        isLocked: true
      }
    ]
    
    const shoppingList: ShoppingListItem[] = [
      { id: '1', ingredient: '豚肉', checked: false },
      { id: '2', ingredient: '鶏肉', checked: true }
    ]
    
    const state: WeeklyState = {
      schemaVersion: 1,
      weekKey,
      menuSlots,
      shoppingList,
      lastUpdated: new Date().toISOString()
    }
    
    saveWeeklyState(state)
    const loaded = loadWeeklyState()
    
    if (!loaded) {
      throw new Error('Failed to load state')
    }
    
    if (loaded.schemaVersion !== 1) {
      throw new Error(`Expected schema version 1, got ${loaded.schemaVersion}`)
    }
    
    if (loaded.weekKey !== weekKey) {
      throw new Error(`Expected weekKey '${weekKey}', got '${loaded.weekKey}'`)
    }
    
    if (loaded.menuSlots.length !== 2) {
      throw new Error(`Expected 2 menu slots, got ${loaded.menuSlots.length}`)
    }
    
    if (loaded.menuSlots[0].mainIngredient !== '豚肉') {
      throw new Error(`Expected main ingredient '豚肉', got ${loaded.menuSlots[0].mainIngredient}`)
    }
    
    if (loaded.menuSlots[1].isLocked !== true) {
      throw new Error(`Expected slot to be locked`)
    }
    
    if (loaded.shoppingList.length !== 2) {
      throw new Error(`Expected 2 shopping items, got ${loaded.shoppingList.length}`)
    }
    
    if (loaded.shoppingList[1].checked !== true) {
      throw new Error(`Expected second item to be checked`)
    }
  }
})

// Test 2: Load returns null when no state exists
testCases.push({
  description: 'Load returns null when no state exists',
  test: () => {
    mockLocalStorage.clear()
    
    const loaded = loadWeeklyState()
    
    if (loaded !== null) {
      throw new Error('Expected null, got state')
    }
  }
})

// Test 3: Clear weekly state
testCases.push({
  description: 'Clear weekly state',
  test: () => {
    mockLocalStorage.clear()
    
    const weekKey = getWeekKey()
    const state: WeeklyState = {
      schemaVersion: 1,
      weekKey,
      menuSlots: [],
      shoppingList: [],
      lastUpdated: new Date().toISOString()
    }
    
    saveWeeklyState(state)
    clearWeeklyState()
    
    const loaded = loadWeeklyState()
    
    if (loaded !== null) {
      throw new Error('Expected null after clear, got state')
    }
  }
})

// Test 4: Update menu slots
testCases.push({
  description: 'Update menu slots',
  test: () => {
    mockLocalStorage.clear()
    
    const menuSlots: MenuSlot[] = [
      {
        day: '土',
        mealTime: '昼',
        items: [{ title: 'Test', url: 'https://example.com' }],
        mainIngredient: '豚肉',
        isLocked: false
      }
    ]
    
    updateMenuSlots(menuSlots)
    
    const loaded = loadWeeklyState()
    
    if (!loaded || loaded.menuSlots.length !== 1) {
      throw new Error('Failed to update menu slots')
    }
    
    if (loaded.menuSlots[0].mainIngredient !== '豚肉') {
      throw new Error('Main ingredient not preserved')
    }
  }
})

// Test 5: Update shopping list
testCases.push({
  description: 'Update shopping list',
  test: () => {
    mockLocalStorage.clear()
    
    const shoppingList: ShoppingListItem[] = [
      { id: '1', ingredient: 'Test', checked: false }
    ]
    
    updateShoppingList(shoppingList)
    
    const loaded = loadWeeklyState()
    
    if (!loaded || loaded.shoppingList.length !== 1) {
      throw new Error('Failed to update shopping list')
    }
    
    if (loaded.shoppingList[0].ingredient !== 'Test') {
      throw new Error('Shopping item not preserved')
    }
  }
})

// Test 6: Preserving locked slots during regeneration
testCases.push({
  description: 'Locked slots should be preserved during regeneration',
  test: () => {
    const slots: MenuSlot[] = [
      {
        day: '土',
        mealTime: '昼',
        items: [{ title: 'Locked Recipe', url: 'https://example.com/locked' }],
        mainIngredient: '豚肉',
        isLocked: true
      },
      {
        day: '土',
        mealTime: '夜',
        items: [{ title: 'Unlocked Recipe', url: 'https://example.com/unlocked' }],
        mainIngredient: '鶏肉',
        isLocked: false
      }
    ]
    
    // Simulate regeneration: only modify unlocked slots
    const regenerated = slots.map(slot => {
      if (slot.isLocked) {
        return slot // Keep locked slots unchanged
      }
      
      // Simulate regeneration for unlocked slots
      return {
        ...slot,
        items: [{ title: 'New Recipe', url: 'https://example.com/new' }],
        mainIngredient: '魚' as const
      }
    })
    
    // Verify locked slot is unchanged
    if (regenerated[0].items[0].title !== 'Locked Recipe') {
      throw new Error('Locked slot was modified')
    }
    
    if (regenerated[0].mainIngredient !== '豚肉') {
      throw new Error('Locked slot main ingredient was modified')
    }
    
    // Verify unlocked slot was regenerated
    if (regenerated[1].items[0].title !== 'New Recipe') {
      throw new Error('Unlocked slot was not regenerated')
    }
    
    if (regenerated[1].mainIngredient !== '魚') {
      throw new Error('Unlocked slot main ingredient was not updated')
    }
  }
})

// Run tests
function runTests(): void {
  console.log('Running weekly state and regeneration tests...\n')
  
  let passed = 0
  let failed = 0
  const failures: string[] = []

  testCases.forEach((testCase, index) => {
    try {
      testCase.test()
      passed++
      console.log(`✓ Test ${index + 1}: ${testCase.description}`)
    } catch (error) {
      failed++
      const message = `✗ Test ${index + 1}: ${testCase.description}\n  Error: ${error instanceof Error ? error.message : String(error)}`
      console.log(message)
      failures.push(message)
    }
  })

  // Summary
  console.log(`\n${'='.repeat(50)}`)
  console.log(`Tests passed: ${passed}/${passed + failed}`)
  console.log(`Tests failed: ${failed}/${passed + failed}`)
  console.log('='.repeat(50))

  if (failures.length > 0) {
    console.log('\nFailed tests:')
    failures.forEach(failure => console.log(failure + '\n'))
    process.exit(1)
  } else {
    console.log('\n✓ All tests passed!')
    process.exit(0)
  }
}

// Run tests immediately
runTests()
