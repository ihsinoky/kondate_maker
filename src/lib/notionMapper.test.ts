/**
 * Unit tests for Notion mapper
 * Run with: npx tsx src/lib/notionMapper.test.ts
 */

import { NotionPage } from './notionClient'
import { mapToRecipe, mapToMealLog, mapToRecipes, mapToMealLogs } from './notionMapper'

interface TestCase {
  description: string
  test: () => void
}

const testCases: TestCase[] = []

// Test 1: Map valid recipe with all properties
testCases.push({
  description: 'Map complete recipe with all properties',
  test: () => {
    const page: NotionPage = {
      id: 'recipe-1',
      properties: {
        Name: {
          type: 'title',
          title: [{ plain_text: '豚の生姜焼き' }]
        },
        URL: {
          type: 'url',
          url: 'https://example.com/shogayaki'
        },
        Rating: {
          type: 'number',
          number: 5
        },
        Ingredients: {
          type: 'multi_select',
          multi_select: [{ name: '豚肉' }, { name: '生姜' }]
        },
        Category: {
          type: 'select',
          select: { name: '主菜' }
        },
        CookTimeMin: {
          type: 'number',
          number: 20
        },
        Active: {
          type: 'checkbox',
          checkbox: true
        }
      }
    }
    
    const recipe = mapToRecipe(page)
    
    if (!recipe) {
      throw new Error('Expected recipe to be mapped')
    }
    if (recipe.id !== 'recipe-1') {
      throw new Error(`Expected id 'recipe-1', got '${recipe.id}'`)
    }
    if (recipe.name !== '豚の生姜焼き') {
      throw new Error(`Expected name '豚の生姜焼き', got '${recipe.name}'`)
    }
    if (recipe.url !== 'https://example.com/shogayaki') {
      throw new Error(`Expected url, got '${recipe.url}'`)
    }
    if (recipe.rating !== 5) {
      throw new Error(`Expected rating 5, got ${recipe.rating}`)
    }
    if (!recipe.ingredients || recipe.ingredients.length !== 2) {
      throw new Error('Expected 2 ingredients')
    }
    if (recipe.category !== '主菜') {
      throw new Error(`Expected category '主菜', got '${recipe.category}'`)
    }
    if (recipe.cookTimeMin !== 20) {
      throw new Error(`Expected cookTimeMin 20, got ${recipe.cookTimeMin}`)
    }
    if (!recipe.active) {
      throw new Error('Expected active to be true')
    }
  }
})

// Test 2: Map recipe with minimal properties (only Name)
testCases.push({
  description: 'Map recipe with only required Name property',
  test: () => {
    const page: NotionPage = {
      id: 'recipe-2',
      properties: {
        Name: {
          type: 'title',
          title: [{ plain_text: '簡単レシピ' }]
        }
      }
    }
    
    const recipe = mapToRecipe(page)
    
    if (!recipe) {
      throw new Error('Expected recipe to be mapped')
    }
    if (recipe.name !== '簡単レシピ') {
      throw new Error(`Expected name '簡単レシピ', got '${recipe.name}'`)
    }
    // Default rating should be 3
    if (recipe.rating !== 3) {
      throw new Error(`Expected default rating 3, got ${recipe.rating}`)
    }
    // Active should default to true
    if (!recipe.active) {
      throw new Error('Expected active to default to true')
    }
    // Optional properties should be undefined
    if (recipe.url !== undefined) {
      throw new Error('Expected url to be undefined')
    }
    if (recipe.ingredients !== undefined) {
      throw new Error('Expected ingredients to be undefined')
    }
  }
})

// Test 3: Map recipe with missing Name (should return null)
testCases.push({
  description: 'Recipe without Name should return null',
  test: () => {
    const page: NotionPage = {
      id: 'recipe-3',
      properties: {
        URL: {
          type: 'url',
          url: 'https://example.com/recipe'
        }
      }
    }
    
    const recipe = mapToRecipe(page)
    
    if (recipe !== null) {
      throw new Error('Expected null for recipe without Name')
    }
  }
})

// Test 4: Map recipe with Rating = 0 (edge case)
testCases.push({
  description: 'Recipe with rating 0 should preserve the value',
  test: () => {
    const page: NotionPage = {
      id: 'recipe-4',
      properties: {
        Name: {
          type: 'title',
          title: [{ plain_text: 'Bad Recipe' }]
        },
        Rating: {
          type: 'number',
          number: 0
        }
      }
    }
    
    const recipe = mapToRecipe(page)
    
    if (!recipe) {
      throw new Error('Expected recipe to be mapped')
    }
    // Rating 0 should be preserved, not defaulted to 3
    if (recipe.rating !== 0) {
      throw new Error(`Expected rating 0, got ${recipe.rating}`)
    }
  }
})

// Test 5: Map valid meal log with all properties
testCases.push({
  description: 'Map complete meal log with all properties',
  test: () => {
    const page: NotionPage = {
      id: 'log-1',
      properties: {
        Date: {
          type: 'date',
          date: { start: '2025-12-20' }
        },
        Recipe: {
          type: 'relation',
          relation: [{ id: 'recipe-1' }]
        },
        RatingAfter: {
          type: 'number',
          number: 4
        },
        Memo: {
          type: 'rich_text',
          rich_text: [{ plain_text: '美味しかった' }]
        }
      }
    }
    
    const log = mapToMealLog(page)
    
    if (!log) {
      throw new Error('Expected meal log to be mapped')
    }
    if (log.id !== 'log-1') {
      throw new Error(`Expected id 'log-1', got '${log.id}'`)
    }
    if (log.date !== '2025-12-20') {
      throw new Error(`Expected date '2025-12-20', got '${log.date}'`)
    }
    if (log.recipeId !== 'recipe-1') {
      throw new Error(`Expected recipeId 'recipe-1', got '${log.recipeId}'`)
    }
    if (log.ratingAfter !== 4) {
      throw new Error(`Expected ratingAfter 4, got ${log.ratingAfter}`)
    }
    if (log.memo !== '美味しかった') {
      throw new Error(`Expected memo '美味しかった', got '${log.memo}'`)
    }
  }
})

// Test 6: Map meal log with minimal properties
testCases.push({
  description: 'Map meal log with only required properties',
  test: () => {
    const page: NotionPage = {
      id: 'log-2',
      properties: {
        Date: {
          type: 'date',
          date: { start: '2025-12-21' }
        },
        Recipe: {
          type: 'relation',
          relation: [{ id: 'recipe-2' }]
        }
      }
    }
    
    const log = mapToMealLog(page)
    
    if (!log) {
      throw new Error('Expected meal log to be mapped')
    }
    if (log.date !== '2025-12-21') {
      throw new Error(`Expected date '2025-12-21', got '${log.date}'`)
    }
    if (log.recipeId !== 'recipe-2') {
      throw new Error(`Expected recipeId 'recipe-2', got '${log.recipeId}'`)
    }
    // Optional properties should be undefined
    if (log.ratingAfter !== undefined) {
      throw new Error('Expected ratingAfter to be undefined')
    }
    if (log.memo !== undefined) {
      throw new Error('Expected memo to be undefined')
    }
  }
})

// Test 7: Map meal log without Date (should return null)
testCases.push({
  description: 'Meal log without Date should return null',
  test: () => {
    const page: NotionPage = {
      id: 'log-3',
      properties: {
        Recipe: {
          type: 'relation',
          relation: [{ id: 'recipe-1' }]
        }
      }
    }
    
    const log = mapToMealLog(page)
    
    if (log !== null) {
      throw new Error('Expected null for meal log without Date')
    }
  }
})

// Test 8: Map meal log without Recipe relation (should return null)
testCases.push({
  description: 'Meal log without Recipe relation should return null',
  test: () => {
    const page: NotionPage = {
      id: 'log-4',
      properties: {
        Date: {
          type: 'date',
          date: { start: '2025-12-22' }
        }
      }
    }
    
    const log = mapToMealLog(page)
    
    if (log !== null) {
      throw new Error('Expected null for meal log without Recipe')
    }
  }
})

// Test 9: Batch map recipes (filtering invalid)
testCases.push({
  description: 'Batch map should filter out invalid recipes',
  test: () => {
    const pages: NotionPage[] = [
      {
        id: 'recipe-1',
        properties: {
          Name: { type: 'title', title: [{ plain_text: 'Valid Recipe 1' }] }
        }
      },
      {
        id: 'recipe-2',
        properties: {} // Missing Name
      },
      {
        id: 'recipe-3',
        properties: {
          Name: { type: 'title', title: [{ plain_text: 'Valid Recipe 2' }] }
        }
      }
    ]
    
    const recipes = mapToRecipes(pages)
    
    if (recipes.length !== 2) {
      throw new Error(`Expected 2 valid recipes, got ${recipes.length}`)
    }
    if (recipes[0].name !== 'Valid Recipe 1') {
      throw new Error('Expected first recipe to be Valid Recipe 1')
    }
    if (recipes[1].name !== 'Valid Recipe 2') {
      throw new Error('Expected second recipe to be Valid Recipe 2')
    }
  }
})

// Test 10: Batch map meal logs (filtering invalid)
testCases.push({
  description: 'Batch map should filter out invalid meal logs',
  test: () => {
    const pages: NotionPage[] = [
      {
        id: 'log-1',
        properties: {
          Date: { type: 'date', date: { start: '2025-12-20' } },
          Recipe: { type: 'relation', relation: [{ id: 'recipe-1' }] }
        }
      },
      {
        id: 'log-2',
        properties: {
          Date: { type: 'date', date: { start: '2025-12-21' } }
          // Missing Recipe
        }
      },
      {
        id: 'log-3',
        properties: {
          Date: { type: 'date', date: { start: '2025-12-22' } },
          Recipe: { type: 'relation', relation: [{ id: 'recipe-2' }] }
        }
      }
    ]
    
    const logs = mapToMealLogs(pages)
    
    if (logs.length !== 2) {
      throw new Error(`Expected 2 valid logs, got ${logs.length}`)
    }
    if (logs[0].recipeId !== 'recipe-1') {
      throw new Error('Expected first log to reference recipe-1')
    }
    if (logs[1].recipeId !== 'recipe-2') {
      throw new Error('Expected second log to reference recipe-2')
    }
  }
})

// Run all tests
function runTests() {
  console.log('Running Notion mapper tests...\n')
  
  let passed = 0
  let failed = 0
  
  testCases.forEach((testCase, index) => {
    try {
      testCase.test()
      console.log(`✓ Test ${index + 1}: ${testCase.description}`)
      passed++
    } catch (error) {
      console.error(`✗ Test ${index + 1}: ${testCase.description}`)
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`)
      failed++
    }
  })
  
  console.log('\n' + '='.repeat(50))
  console.log(`Tests passed: ${passed}/${testCases.length}`)
  console.log(`Tests failed: ${failed}/${testCases.length}`)
  console.log('='.repeat(50))
  
  if (failed === 0) {
    console.log('\n✓ All tests passed!')
  } else {
    console.log(`\n✗ ${failed} test(s) failed`)
    process.exit(1)
  }
}

runTests()
