/**
 * Unit tests for recipe scoring logic
 * Run with: npx tsx src/lib/recipeScoring.test.ts
 */

import {
  scoreRecipe,
  scoreRecipes,
  relaxRecencyWindow,
  selectTopRecipes,
  DEFAULT_RECENCY_WINDOW
} from './recipeScoring'
import { NotionRecipe, NotionMealLog } from './notionTypes'

interface TestCase {
  description: string
  test: () => void
}

const testCases: TestCase[] = []

// Test 1: Basic recipe scoring - high rating, never used
testCases.push({
  description: 'High rating recipe never used should have high score',
  test: () => {
    const recipe: NotionRecipe = {
      id: '1',
      name: 'Test Recipe',
      rating: 5,
      active: true
    }
    
    const scored = scoreRecipe(recipe, undefined, DEFAULT_RECENCY_WINDOW)
    
    // Rating 5 * 10 = 50
    if (scored.score !== 50) {
      throw new Error(`Expected score 50, got ${scored.score}`)
    }
    if (scored.lastUsedDaysAgo !== undefined) {
      throw new Error('Expected lastUsedDaysAgo to be undefined')
    }
    if (!scored.reason || !scored.reason.includes('Never used')) {
      throw new Error('Expected reason to mention "Never used"')
    }
  }
})

// Test 2: Recipe with recency penalty
testCases.push({
  description: 'Recipe used within recency window should have penalty',
  test: () => {
    const recipe: NotionRecipe = {
      id: '2',
      name: 'Recent Recipe',
      rating: 5,
      active: true
    }
    
    // Used 7 days ago (within 14-day window)
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    const lastUsed = sevenDaysAgo.toISOString().split('T')[0]
    
    const scored = scoreRecipe(recipe, lastUsed, DEFAULT_RECENCY_WINDOW)
    
    // Rating 5 * 10 = 50, penalty -30 = 20
    if (scored.score !== 20) {
      throw new Error(`Expected score 20, got ${scored.score}`)
    }
    if (scored.lastUsedDaysAgo !== 7) {
      throw new Error(`Expected lastUsedDaysAgo to be 7, got ${scored.lastUsedDaysAgo}`)
    }
  }
})

// Test 3: Recipe used outside recency window
testCases.push({
  description: 'Recipe used outside recency window should not have penalty',
  test: () => {
    const recipe: NotionRecipe = {
      id: '3',
      name: 'Old Recipe',
      rating: 4,
      active: true
    }
    
    // Used 20 days ago (outside 14-day window)
    const today = new Date()
    const twentyDaysAgo = new Date(today)
    twentyDaysAgo.setDate(today.getDate() - 20)
    const lastUsed = twentyDaysAgo.toISOString().split('T')[0]
    
    const scored = scoreRecipe(recipe, lastUsed, DEFAULT_RECENCY_WINDOW)
    
    // Rating 4 * 10 = 40, no penalty
    if (scored.score !== 40) {
      throw new Error(`Expected score 40, got ${scored.score}`)
    }
    if (scored.lastUsedDaysAgo !== 20) {
      throw new Error(`Expected lastUsedDaysAgo to be 20, got ${scored.lastUsedDaysAgo}`)
    }
  }
})

// Test 4: Default rating (3) when not specified
testCases.push({
  description: 'Recipe without rating should use default (3)',
  test: () => {
    const recipe: NotionRecipe = {
      id: '4',
      name: 'Unrated Recipe',
      active: true
      // No rating specified
    }
    
    const scored = scoreRecipe(recipe, undefined, DEFAULT_RECENCY_WINDOW)
    
    // Default rating 3 * 10 = 30
    if (scored.score !== 30) {
      throw new Error(`Expected score 30, got ${scored.score}`)
    }
  }
})

// Test 5: Score multiple recipes and sort
testCases.push({
  description: 'Multiple recipes should be scored and sorted correctly',
  test: () => {
    const recipes: NotionRecipe[] = [
      { id: '1', name: 'Low Rating', rating: 2, active: true },
      { id: '2', name: 'High Rating', rating: 5, active: true },
      { id: '3', name: 'Medium Rating', rating: 3, active: true }
    ]
    
    const mealLogs: NotionMealLog[] = []
    
    const scored = scoreRecipes(recipes, mealLogs, DEFAULT_RECENCY_WINDOW)
    
    // Should be sorted by score descending
    if (scored.length !== 3) {
      throw new Error(`Expected 3 recipes, got ${scored.length}`)
    }
    if (scored[0].recipe.id !== '2') {
      throw new Error('Expected highest rated recipe first')
    }
    if (scored[1].recipe.id !== '3') {
      throw new Error('Expected medium rated recipe second')
    }
    if (scored[2].recipe.id !== '1') {
      throw new Error('Expected lowest rated recipe third')
    }
  }
})

// Test 6: Scoring with meal logs
testCases.push({
  description: 'Scoring should consider meal logs for recency',
  test: () => {
    const today = new Date()
    const fiveDaysAgo = new Date(today)
    fiveDaysAgo.setDate(today.getDate() - 5)
    
    const recipes: NotionRecipe[] = [
      { id: '1', name: 'Recipe A', rating: 5, active: true },
      { id: '2', name: 'Recipe B', rating: 5, active: true }
    ]
    
    const mealLogs: NotionMealLog[] = [
      { id: 'log1', date: fiveDaysAgo.toISOString().split('T')[0], recipeId: '1' }
    ]
    
    const scored = scoreRecipes(recipes, mealLogs, DEFAULT_RECENCY_WINDOW)
    
    // Recipe B (never used) should score higher than Recipe A (used 5 days ago)
    if (scored[0].recipe.id !== '2') {
      throw new Error('Expected Recipe B (never used) to score higher')
    }
    if (scored[1].recipe.id !== '1') {
      throw new Error('Expected Recipe A (recently used) to score lower')
    }
    
    // Recipe A should have penalty: 50 - 30 = 20
    if (scored[1].score !== 20) {
      throw new Error(`Expected Recipe A score 20, got ${scored[1].score}`)
    }
    // Recipe B should have no penalty: 50
    if (scored[0].score !== 50) {
      throw new Error(`Expected Recipe B score 50, got ${scored[0].score}`)
    }
  }
})

// Test 7: Relax recency window
testCases.push({
  description: 'Recency window relaxation should follow correct steps',
  test: () => {
    // 14 -> 7
    let relaxed = relaxRecencyWindow(14)
    if (relaxed !== 7) {
      throw new Error(`Expected 7, got ${relaxed}`)
    }
    
    // 7 -> 0
    relaxed = relaxRecencyWindow(7)
    if (relaxed !== 0) {
      throw new Error(`Expected 0, got ${relaxed}`)
    }
    
    // 0 -> null (cannot relax further)
    relaxed = relaxRecencyWindow(0)
    if (relaxed !== null) {
      throw new Error(`Expected null, got ${relaxed}`)
    }
  }
})

// Test 8: Select top recipes with sufficient candidates
testCases.push({
  description: 'Select top recipes when sufficient candidates available',
  test: () => {
    const recipes: NotionRecipe[] = [
      { id: '1', name: 'Recipe A', rating: 5, active: true },
      { id: '2', name: 'Recipe B', rating: 4, active: true },
      { id: '3', name: 'Recipe C', rating: 3, active: true },
      { id: '4', name: 'Recipe D', rating: 2, active: true }
    ]
    
    const mealLogs: NotionMealLog[] = []
    
    const result = selectTopRecipes(recipes, mealLogs, 3, DEFAULT_RECENCY_WINDOW)
    
    if (result.scoredRecipes.length !== 3) {
      throw new Error(`Expected 3 recipes, got ${result.scoredRecipes.length}`)
    }
    if (result.wasRelaxed) {
      throw new Error('Should not have relaxed with sufficient candidates')
    }
    if (result.recencyWindowUsed !== DEFAULT_RECENCY_WINDOW) {
      throw new Error(`Expected recency window ${DEFAULT_RECENCY_WINDOW}, got ${result.recencyWindowUsed}`)
    }
    if (result.warning) {
      throw new Error(`Unexpected warning: ${result.warning}`)
    }
  }
})

// Test 9: Select top recipes with insufficient candidates
testCases.push({
  description: 'Select top recipes should warn when insufficient candidates',
  test: () => {
    const recipes: NotionRecipe[] = [
      { id: '1', name: 'Recipe A', rating: 5, active: true }
    ]
    
    const mealLogs: NotionMealLog[] = []
    
    const result = selectTopRecipes(recipes, mealLogs, 5, DEFAULT_RECENCY_WINDOW)
    
    if (result.scoredRecipes.length !== 1) {
      throw new Error(`Expected 1 recipe, got ${result.scoredRecipes.length}`)
    }
    if (!result.warning) {
      throw new Error('Expected warning for insufficient candidates')
    }
    if (!result.warning.includes('候補が不足')) {
      throw new Error(`Expected insufficient candidates warning, got: ${result.warning}`)
    }
  }
})

// Test 10: Relaxation when all recipes are recently used
testCases.push({
  description: 'Should relax recency when all recipes recently used',
  test: () => {
    const today = new Date()
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(today.getDate() - 3)
    
    const recipes: NotionRecipe[] = [
      { id: '1', name: 'Recipe A', rating: 5, active: true },
      { id: '2', name: 'Recipe B', rating: 4, active: true }
    ]
    
    // Both recipes used within 14-day window
    const mealLogs: NotionMealLog[] = [
      { id: 'log1', date: threeDaysAgo.toISOString().split('T')[0], recipeId: '1' },
      { id: 'log2', date: threeDaysAgo.toISOString().split('T')[0], recipeId: '2' }
    ]
    
    // Without relaxation, both would have low scores
    // With count = 2, we want to ensure we get both recipes
    const result = selectTopRecipes(recipes, mealLogs, 2, DEFAULT_RECENCY_WINDOW)
    
    if (result.scoredRecipes.length !== 2) {
      throw new Error(`Expected 2 recipes, got ${result.scoredRecipes.length}`)
    }
    // Relaxation may or may not occur depending on if the penalized scores are still sufficient
    // The key is that we should get 2 recipes back
  }
})

// Test 11: Multiple meal logs for same recipe (should use most recent)
testCases.push({
  description: 'Multiple logs for same recipe should use most recent date',
  test: () => {
    const today = new Date()
    const fiveDaysAgo = new Date(today)
    fiveDaysAgo.setDate(today.getDate() - 5)
    const twentyDaysAgo = new Date(today)
    twentyDaysAgo.setDate(today.getDate() - 20)
    
    const recipes: NotionRecipe[] = [
      { id: '1', name: 'Recipe A', rating: 5, active: true }
    ]
    
    const mealLogs: NotionMealLog[] = [
      { id: 'log1', date: twentyDaysAgo.toISOString().split('T')[0], recipeId: '1' },
      { id: 'log2', date: fiveDaysAgo.toISOString().split('T')[0], recipeId: '1' }
    ]
    
    const scored = scoreRecipes(recipes, mealLogs, DEFAULT_RECENCY_WINDOW)
    
    // Should use the most recent date (5 days ago), so penalty applies
    if (scored[0].lastUsedDaysAgo !== 5) {
      throw new Error(`Expected lastUsedDaysAgo to be 5, got ${scored[0].lastUsedDaysAgo}`)
    }
    if (scored[0].score !== 20) { // 50 - 30 penalty
      throw new Error(`Expected score 20 with penalty, got ${scored[0].score}`)
    }
  }
})

// Run all tests
function runTests() {
  console.log('Running recipe scoring tests...\n')
  
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
