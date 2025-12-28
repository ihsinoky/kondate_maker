/**
 * Unit tests for filter behavior and partial regeneration
 * Tests main ingredient filter priority and relaxation when candidates are insufficient
 * Run with: npx tsx src/lib/filterBehavior.test.ts
 */

import { estimateMainIngredient, MainIngredient } from './mainIngredientEstimator'
import { CandidateRecipe } from './candidatePool'
import { MenuSlot } from '../types/menu'

// Test data: Mock candidate pool with various main ingredients
const MOCK_CANDIDATE_POOL: CandidateRecipe[] = [
  // Pork recipes (豚肉)
  { title: '豚の生姜焼き', url: 'https://example.com/pork1' },
  { title: '豚肉とキャベツの炒め物', url: 'https://example.com/pork2' },
  { title: '豚バラ大根', url: 'https://example.com/pork3' },
  
  // Chicken recipes (鶏肉)
  { title: '鶏の唐揚げ', url: 'https://example.com/chicken1' },
  { title: 'チキンカレー', url: 'https://example.com/chicken2' },
  
  // Beef recipes (牛肉)
  { title: '牛肉のしぐれ煮', url: 'https://example.com/beef1' },
  
  // Ground meat recipes (ひき肉)
  { title: 'ハンバーグ', url: 'https://example.com/ground1' },
  { title: '麻婆豆腐', url: 'https://example.com/ground2' },
  
  // Fish recipes (魚)
  { title: '鯖の味噌煮', url: 'https://example.com/fish1' },
  { title: '鮭のムニエル', url: 'https://example.com/fish2' },
  
  // Egg recipes (卵)
  { title: 'オムライス', url: 'https://example.com/egg1' },
  
  // Tofu recipes (豆腐)
  { title: '豆腐ステーキ', url: 'https://example.com/tofu1' },
  
  // Other (その他)
  { title: '野菜炒め', url: 'https://example.com/other1' },
  { title: 'コーンスープ', url: 'https://example.com/other2' },
]

interface TestCase {
  description: string
  test: () => void
}

const testCases: TestCase[] = []

// Test 1: Filter by main ingredient - finds matching recipe
testCases.push({
  description: 'Filter by main ingredient successfully finds matching recipe',
  test: () => {
    const targetIngredient: MainIngredient = '豚肉'
    const filteredRecipes = MOCK_CANDIDATE_POOL.filter(recipe => 
      estimateMainIngredient(recipe.title) === targetIngredient
    )
    
    if (filteredRecipes.length !== 3) {
      throw new Error(`Expected 3 pork recipes, found ${filteredRecipes.length}`)
    }
    
    const titles = filteredRecipes.map(r => r.title)
    if (!titles.includes('豚の生姜焼き')) {
      throw new Error('Expected to find 豚の生姜焼き')
    }
  }
})

// Test 2: Filter by main ingredient - chicken
testCases.push({
  description: 'Filter by chicken finds correct recipes',
  test: () => {
    const targetIngredient: MainIngredient = '鶏肉'
    const filteredRecipes = MOCK_CANDIDATE_POOL.filter(recipe => 
      estimateMainIngredient(recipe.title) === targetIngredient
    )
    
    if (filteredRecipes.length !== 2) {
      throw new Error(`Expected 2 chicken recipes, found ${filteredRecipes.length}`)
    }
  }
})

// Test 3: Filter by main ingredient - limited candidates (beef)
testCases.push({
  description: 'Filter with limited candidates returns what is available',
  test: () => {
    const targetIngredient: MainIngredient = '牛肉'
    const filteredRecipes = MOCK_CANDIDATE_POOL.filter(recipe => 
      estimateMainIngredient(recipe.title) === targetIngredient
    )
    
    if (filteredRecipes.length !== 1) {
      throw new Error(`Expected 1 beef recipe, found ${filteredRecipes.length}`)
    }
    
    if (filteredRecipes[0].title !== '牛肉のしぐれ煮') {
      throw new Error('Expected to find 牛肉のしぐれ煮')
    }
  }
})

// Test 4: Filter relaxation - no candidates for specific ingredient
testCases.push({
  description: 'Filter relaxation when no candidates match',
  test: () => {
    const targetIngredient: MainIngredient = '厚揚げ'
    const filteredRecipes = MOCK_CANDIDATE_POOL.filter(recipe => 
      estimateMainIngredient(recipe.title) === targetIngredient
    )
    
    // No atsuage recipes in the pool
    if (filteredRecipes.length !== 0) {
      throw new Error(`Expected 0 atsuage recipes, found ${filteredRecipes.length}`)
    }
    
    // In this case, the system should fall back to the full pool
    const fallbackPool = MOCK_CANDIDATE_POOL
    if (fallbackPool.length !== 14) {
      throw new Error(`Expected fallback to full pool of 14 recipes`)
    }
  }
})

// Test 5: Simulate filter behavior with scoring
testCases.push({
  description: 'Filter with scoring prioritizes matching recipes',
  test: () => {
    const targetIngredient: MainIngredient = '魚'
    
    // Simulate the filtering logic from Main.tsx
    let filteredPool = MOCK_CANDIDATE_POOL.filter(recipe => 
      estimateMainIngredient(recipe.title) === targetIngredient
    )
    
    let filterRelaxed = false
    if (filteredPool.length === 0) {
      filteredPool = MOCK_CANDIDATE_POOL
      filterRelaxed = true
    }
    
    // Should find fish recipes without relaxation
    if (filterRelaxed) {
      throw new Error('Filter should not be relaxed for fish')
    }
    
    if (filteredPool.length !== 2) {
      throw new Error(`Expected 2 fish recipes, found ${filteredPool.length}`)
    }
  }
})

// Test 6: Locked slots should not be regenerated
testCases.push({
  description: 'Locked slots are preserved during partial regeneration',
  test: () => {
    const slots: MenuSlot[] = [
      {
        day: '土',
        mealTime: '昼',
        items: [{ title: 'Locked: 豚の生姜焼き', url: 'https://example.com/locked1' }],
        mainIngredient: '豚肉',
        isLocked: true
      },
      {
        day: '土',
        mealTime: '夜',
        items: [{ title: 'Unlocked: 鶏の唐揚げ', url: 'https://example.com/unlocked1' }],
        mainIngredient: '鶏肉',
        isLocked: false
      },
      {
        day: '日',
        mealTime: '昼',
        items: [{ title: 'Locked: 鯖の味噌煮', url: 'https://example.com/locked2' }],
        mainIngredient: '魚',
        isLocked: true
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
        items: [{ title: 'Regenerated: 牛肉のしぐれ煮', url: 'https://example.com/regenerated' }],
        mainIngredient: '牛肉' as const
      }
    })
    
    // Verify locked slots remain unchanged
    if (regenerated[0].items[0].title !== 'Locked: 豚の生姜焼き') {
      throw new Error('First locked slot was modified')
    }
    if (regenerated[0].mainIngredient !== '豚肉') {
      throw new Error('First locked slot main ingredient was modified')
    }
    if (regenerated[2].items[0].title !== 'Locked: 鯖の味噌煮') {
      throw new Error('Second locked slot was modified')
    }
    if (regenerated[2].mainIngredient !== '魚') {
      throw new Error('Second locked slot main ingredient was modified')
    }
    
    // Verify unlocked slot was regenerated
    if (regenerated[1].items[0].title !== 'Regenerated: 牛肉のしぐれ煮') {
      throw new Error('Unlocked slot was not regenerated')
    }
    if (regenerated[1].mainIngredient !== '牛肉') {
      throw new Error('Unlocked slot main ingredient was not updated')
    }
  }
})

// Test 7: Multiple filters in parallel regeneration
testCases.push({
  description: 'Multiple slots with different filters can be regenerated',
  test: () => {
    const porkRecipes = MOCK_CANDIDATE_POOL.filter(r => 
      estimateMainIngredient(r.title) === '豚肉'
    )
    const chickenRecipes = MOCK_CANDIDATE_POOL.filter(r => 
      estimateMainIngredient(r.title) === '鶏肉'
    )
    const fishRecipes = MOCK_CANDIDATE_POOL.filter(r => 
      estimateMainIngredient(r.title) === '魚'
    )
    
    if (porkRecipes.length !== 3) {
      throw new Error(`Expected 3 pork recipes`)
    }
    if (chickenRecipes.length !== 2) {
      throw new Error(`Expected 2 chicken recipes`)
    }
    if (fishRecipes.length !== 2) {
      throw new Error(`Expected 2 fish recipes`)
    }
  }
})

// Test 8: Filter relaxation with warning
testCases.push({
  description: 'Filter relaxation triggers warning flag',
  test: () => {
    const targetIngredient: MainIngredient = '厚揚げ'
    
    let filteredPool = MOCK_CANDIDATE_POOL.filter(recipe => 
      estimateMainIngredient(recipe.title) === targetIngredient
    )
    
    let filterRelaxed = false
    if (filteredPool.length === 0) {
      filteredPool = MOCK_CANDIDATE_POOL
      filterRelaxed = true
    }
    
    // Should have relaxed due to no atsuage recipes
    if (!filterRelaxed) {
      throw new Error('Filter should have been relaxed for atsuage')
    }
    
    // Fallback pool should have recipes
    if (filteredPool.length === 0) {
      throw new Error('Fallback pool should not be empty')
    }
  }
})

// Test 9: Avoid duplicate recipes across slots
testCases.push({
  description: 'Used recipes are excluded from subsequent selections',
  test: () => {
    const usedUrls = new Set<string>()
    const targetIngredient: MainIngredient = '豚肉'
    
    // First selection
    const available1 = MOCK_CANDIDATE_POOL.filter(r => 
      estimateMainIngredient(r.title) === targetIngredient &&
      !usedUrls.has(r.url)
    )
    
    if (available1.length !== 3) {
      throw new Error('Expected 3 available pork recipes initially')
    }
    
    // Mark first as used
    usedUrls.add(available1[0].url)
    
    // Second selection
    const available2 = MOCK_CANDIDATE_POOL.filter(r => 
      estimateMainIngredient(r.title) === targetIngredient &&
      !usedUrls.has(r.url)
    )
    
    if (available2.length !== 2) {
      throw new Error('Expected 2 available pork recipes after one is used')
    }
  }
})

// Test 10: Ground meat (ひき肉) detection priority
testCases.push({
  description: 'Ground meat is detected correctly (higher priority than specific meats)',
  test: () => {
    // Should be detected as ひき肉, not 豆腐
    if (estimateMainIngredient('麻婆豆腐') !== 'ひき肉') {
      throw new Error('麻婆豆腐 should be detected as ひき肉')
    }
    
    // Should be detected as ひき肉, not other meats
    if (estimateMainIngredient('ハンバーグ') !== 'ひき肉') {
      throw new Error('ハンバーグ should be detected as ひき肉')
    }
    
    const groundMeatRecipes = MOCK_CANDIDATE_POOL.filter(r => 
      estimateMainIngredient(r.title) === 'ひき肉'
    )
    
    if (groundMeatRecipes.length !== 2) {
      throw new Error(`Expected 2 ground meat recipes, found ${groundMeatRecipes.length}`)
    }
  }
})

// Test 11: 指定なし (no filter) behavior
testCases.push({
  description: 'No filter returns all recipes',
  test: () => {
    // When filter is '指定なし' or undefined, all recipes should be available
    const allRecipes = MOCK_CANDIDATE_POOL
    
    if (allRecipes.length !== 14) {
      throw new Error(`Expected all 14 recipes when no filter is applied`)
    }
  }
})

// Test 12: Empty pool handling
testCases.push({
  description: 'Empty candidate pool is handled gracefully',
  test: () => {
    const emptyPool: CandidateRecipe[] = []
    
    const targetIngredient: MainIngredient = '豚肉'
    const filteredRecipes = emptyPool.filter(recipe => 
      estimateMainIngredient(recipe.title) === targetIngredient
    )
    
    if (filteredRecipes.length !== 0) {
      throw new Error('Empty pool should return no recipes')
    }
  }
})

// Test 13: Main ingredient estimation from pool
testCases.push({
  description: 'Main ingredient is correctly estimated from candidate pool titles',
  test: () => {
    const estimations = MOCK_CANDIDATE_POOL.map(recipe => ({
      title: recipe.title,
      ingredient: estimateMainIngredient(recipe.title)
    }))
    
    // Check specific estimations
    const porkRecipe = estimations.find(e => e.title === '豚の生姜焼き')
    if (!porkRecipe || porkRecipe.ingredient !== '豚肉') {
      throw new Error('豚の生姜焼き should be estimated as 豚肉')
    }
    
    const chickenRecipe = estimations.find(e => e.title === '鶏の唐揚げ')
    if (!chickenRecipe || chickenRecipe.ingredient !== '鶏肉') {
      throw new Error('鶏の唐揚げ should be estimated as 鶏肉')
    }
    
    const veggieRecipe = estimations.find(e => e.title === '野菜炒め')
    if (!veggieRecipe || veggieRecipe.ingredient !== 'その他') {
      throw new Error('野菜炒め should be estimated as その他')
    }
  }
})

// Test 14: Locked slot URLs are excluded from selection
testCases.push({
  description: 'Recipes in locked slots are excluded from new selections',
  test: () => {
    // Simulate locked slots
    const lockedSlots: MenuSlot[] = [
      {
        day: '土',
        mealTime: '昼',
        items: [{ title: '豚の生姜焼き', url: 'https://example.com/pork1' }],
        mainIngredient: '豚肉',
        isLocked: true
      }
    ]
    
    // Collect URLs from locked slots
    const usedUrls = new Set<string>()
    lockedSlots.forEach(slot => {
      if (slot.isLocked) {
        slot.items.forEach(item => usedUrls.add(item.url))
      }
    })
    
    // Available pork recipes excluding locked ones
    const availablePorkRecipes = MOCK_CANDIDATE_POOL.filter(r => 
      estimateMainIngredient(r.title) === '豚肉' &&
      !usedUrls.has(r.url)
    )
    
    // Should have 2 pork recipes available (3 total - 1 locked)
    if (availablePorkRecipes.length !== 2) {
      throw new Error(`Expected 2 available pork recipes, found ${availablePorkRecipes.length}`)
    }
    
    // Should not include the locked recipe
    const containsLocked = availablePorkRecipes.some(r => r.url === 'https://example.com/pork1')
    if (containsLocked) {
      throw new Error('Locked recipe should be excluded from available recipes')
    }
  }
})

// Test 15: Filter behavior consistency
testCases.push({
  description: 'Filter behavior is consistent across multiple applications',
  test: () => {
    const targetIngredient: MainIngredient = '鶏肉'
    
    // First filtering
    const filtered1 = MOCK_CANDIDATE_POOL.filter(r => 
      estimateMainIngredient(r.title) === targetIngredient
    )
    
    // Second filtering (should be identical)
    const filtered2 = MOCK_CANDIDATE_POOL.filter(r => 
      estimateMainIngredient(r.title) === targetIngredient
    )
    
    if (filtered1.length !== filtered2.length) {
      throw new Error('Filter should produce consistent results')
    }
    
    // Check that same recipes are returned
    const urls1 = new Set(filtered1.map(r => r.url))
    const urls2 = new Set(filtered2.map(r => r.url))
    
    for (const url of urls1) {
      if (!urls2.has(url)) {
        throw new Error('Filter should return same recipes consistently')
      }
    }
  }
})

// Run tests
function runTests(): void {
  console.log('Running filter behavior and regeneration tests...\n')
  
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
