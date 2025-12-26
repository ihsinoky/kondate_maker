/**
 * Unit tests for main ingredient estimator
 * Run with: tsx src/lib/mainIngredientEstimator.test.ts
 */

import { estimateMainIngredient, getAllMainIngredients } from './mainIngredientEstimator'

interface TestCase {
  title: string
  expected: string
  description: string
}

const testCases: TestCase[] = [
  // Pork (豚肉)
  { title: '豚の生姜焼き', expected: '豚肉', description: 'Basic pork dish' },
  { title: '豚肉とキャベツの炒め物', expected: '豚肉', description: 'Pork with vegetables' },
  { title: 'ポークソテー', expected: '豚肉', description: 'Pork in katakana' },
  { title: '豚バラ大根', expected: '豚肉', description: 'Pork belly' },
  
  // Chicken (鶏肉)
  { title: '鶏の唐揚げ', expected: '鶏肉', description: 'Basic chicken dish' },
  { title: 'チキンカレー', expected: '鶏肉', description: 'Chicken in katakana' },
  { title: '鶏もも肉のソテー', expected: '鶏肉', description: 'Chicken thigh' },
  { title: '鶏むね肉の照り焼き', expected: '鶏肉', description: 'Chicken breast' },
  
  // Beef (牛肉)
  { title: '牛肉のしぐれ煮', expected: '牛肉', description: 'Basic beef dish' },
  { title: 'ビーフストロガノフ', expected: '牛肉', description: 'Beef in katakana' },
  { title: '牛バラの煮込み', expected: '牛肉', description: 'Beef belly' },
  
  // Ground meat (ひき肉)
  { title: 'ハンバーグ', expected: 'ひき肉', description: 'Hamburg steak' },
  { title: '肉団子スープ', expected: 'ひき肉', description: 'Meatballs' },
  { title: 'ミートソース', expected: 'ひき肉', description: 'Meat sauce' },
  { title: '麻婆豆腐', expected: 'ひき肉', description: 'Mapo tofu with ground meat' },
  
  // Fish (魚)
  { title: '鯖の味噌煮', expected: '魚', description: 'Mackerel' },
  { title: '鮭のムニエル', expected: '魚', description: 'Salmon' },
  { title: 'アジフライ', expected: '魚', description: 'Horse mackerel' },
  { title: 'ぶり大根', expected: '魚', description: 'Yellowtail' },
  { title: '魚の照り焼き', expected: '魚', description: 'Generic fish' },
  
  // Egg (卵)
  { title: 'オムライス', expected: '卵', description: 'Omurice' },
  { title: '卵焼き', expected: '卵', description: 'Japanese omelet' },
  { title: 'たまご丼', expected: '卵', description: 'Egg bowl' },
  { title: 'エッグベネディクト', expected: '卵', description: 'Egg in katakana' },
  
  // Tofu (豆腐)
  { title: '豆腐ステーキ', expected: '豆腐', description: 'Tofu steak' },
  { title: '揚げ出し豆腐', expected: '豆腐', description: 'Fried tofu' },
  { title: '肉豆腐', expected: '豆腐', description: 'Tofu with meat - both are present' },
  
  // Atsuage (厚揚げ)
  { title: '厚揚げの煮物', expected: '厚揚げ', description: 'Simmered atsuage' },
  { title: '厚揚げと野菜の炒め物', expected: '厚揚げ', description: 'Stir-fried atsuage' },
  
  // Other / No match (その他)
  { title: '野菜炒め', expected: 'その他', description: 'Only vegetables' },
  { title: 'コーンスープ', expected: 'その他', description: 'Vegetable soup' },
  { title: 'きんぴらごぼう', expected: 'その他', description: 'Root vegetable dish' },
  { title: 'ポテトサラダ', expected: 'その他', description: 'Potato salad' },
  { title: '', expected: 'その他', description: 'Empty string' },
]

function runTests(): void {
  console.log('Running main ingredient estimator tests...\n')
  
  let passed = 0
  let failed = 0
  const failures: string[] = []

  testCases.forEach((testCase, index) => {
    const result = estimateMainIngredient(testCase.title)
    const success = result === testCase.expected
    
    if (success) {
      passed++
      console.log(`✓ Test ${index + 1}: ${testCase.description}`)
    } else {
      failed++
      const message = `✗ Test ${index + 1}: ${testCase.description}\n  Title: "${testCase.title}"\n  Expected: "${testCase.expected}", Got: "${result}"`
      console.log(message)
      failures.push(message)
    }
  })

  // Test getAllMainIngredients
  console.log('\nTesting getAllMainIngredients...')
  const allIngredients = getAllMainIngredients()
  const expectedCount = 9 // Total number of ingredient types
  if (allIngredients.length === expectedCount) {
    console.log(`✓ getAllMainIngredients returns ${expectedCount} ingredients`)
    passed++
  } else {
    console.log(`✗ getAllMainIngredients expected ${expectedCount} ingredients, got ${allIngredients.length}`)
    failed++
  }

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
