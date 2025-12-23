import { useState, useEffect, useRef } from 'react'
import { MenuSlot } from '../types/menu'
import { copyToClipboard } from '../lib/clipboard'
import { loadSettings } from '../lib/settings'
import { isSoupRecipe } from '../lib/soupDetector'
import { loadCandidatePool, formatTimestamp, CandidateRecipe } from '../lib/candidatePool'

const RINATY_AUTHOR_NAME = 'りなてぃ'

interface IngredientItem {
  name: string
  isMust: boolean
}

function Main() {
  const [menuSlots, setMenuSlots] = useState<MenuSlot[]>([])
  const [copyStatus, setCopyStatus] = useState<string>('')
  const [candidateRecipes, setCandidateRecipes] = useState<CandidateRecipe[]>([])
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [poolWarning, setPoolWarning] = useState<string>('')
  const [isLoadingPool, setIsLoadingPool] = useState<boolean>(false)
  const [ingredientInput, setIngredientInput] = useState<string>('')
  const [ingredientWarning, setIngredientWarning] = useState<string>('')
  const statusTimeoutRef = useRef<number | null>(null)

  // Load candidate pool on mount
  useEffect(() => {
    loadPool(false)
  }, [])

  // Clear timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current !== null) {
        clearTimeout(statusTimeoutRef.current)
      }
    }
  }, [])

  // Load candidate pool from cache or network
  const loadPool = async (forceReload: boolean) => {
    setIsLoadingPool(true)
    setPoolWarning('')
    
    try {
      const result = await loadCandidatePool(forceReload)
      setCandidateRecipes(result.recipes)
      setLastUpdate(result.timestamp)
      
      if (result.warning) {
        setPoolWarning(result.warning)
      }
      
      console.log(`Candidate pool loaded from ${result.source}:`, result.recipes.length, 'recipes')
    } catch (error) {
      console.error('Failed to load candidate pool:', error)
      setPoolWarning('候補の読み込みに失敗しました')
    } finally {
      setIsLoadingPool(false)
    }
  }

  // Handler for manual reload button
  const handleReloadCandidates = () => {
    loadPool(true)
  }

  // Parse ingredient input into structured format
  // Format: "ingredient" or "ingredient*" for must (max 2 must items)
  // Returns ingredients array and count of must markers in original input
  const parseIngredientInput = (input: string): { ingredients: IngredientItem[], totalMustCount: number } => {
    const lines = input.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    const ingredients: IngredientItem[] = []
    let mustCount = 0
    let totalMustCount = 0

    lines.forEach(line => {
      const isMust = line.endsWith('*')
      const name = isMust ? line.slice(0, -1).trim() : line
      
      if (name.length > 0) {
        if (isMust) {
          totalMustCount++
          if (mustCount < 2) {
            ingredients.push({ name, isMust: true })
            mustCount++
          } else {
            // Treat as normal ingredient if already have 2 musts
            ingredients.push({ name, isMust: false })
          }
        } else {
          ingredients.push({ name, isMust: false })
        }
      }
    })

    return { ingredients, totalMustCount }
  }

  // Calculate match score for a recipe based on ingredients
  const calculateRecipeScore = (
    recipe: CandidateRecipe,
    ingredients: IngredientItem[],
    isRinaty: boolean
  ): number => {
    let score = 0
    const titleLower = recipe.title.toLowerCase()
    
    // Check each ingredient
    ingredients.forEach(ingredient => {
      const ingredientLower = ingredient.name.toLowerCase()
      if (titleLower.includes(ingredientLower)) {
        if (ingredient.isMust) {
          score += 1000 // Large bonus for must ingredients
        } else {
          score += 100 // Medium bonus for regular ingredients
        }
      }
    })

    // Small bonus for Rinaty recipes as tiebreaker (Q3 in Sprint 02)
    if (isRinaty) {
      score += 10
    }

    return score
  }

  // Generate menu data from candidate pool with ingredient scoring
  const generateMenu = () => {
    if (candidateRecipes.length === 0) {
      setCopyStatus('候補プールが読み込まれていません')
      return
    }

    // Parse ingredient input
    const { ingredients, totalMustCount } = parseIngredientInput(ingredientInput)
    const mustIngredients = ingredients.filter(i => i.isMust)
    
    // Collect all warnings
    const warnings: string[] = []
    
    // Validate must ingredient count
    if (totalMustCount > 2) {
      warnings.push('必須食材は最大2つまでです。最初の2つのみ必須として扱います。')
    }

    const slots: MenuSlot[] = [
      { day: '土', mealTime: '昼', items: [] },
      { day: '土', mealTime: '夜', items: [] },
      { day: '日', mealTime: '昼', items: [] },
      { day: '日', mealTime: '夜', items: [] },
      { day: '月', mealTime: '夜', items: [] },
      { day: '火', mealTime: '夜', items: [] },
      { day: '水', mealTime: '夜', items: [] },
      { day: '木', mealTime: '夜', items: [] },
      { day: '金', mealTime: '夜', items: [] },
    ]

    // Load settings to get Wednesday and Friday recipes
    const settings = loadSettings()
    const wednesdayRecipes = settings?.wednesdayRecipes || []
    const fridaySoupRecipes = settings?.fridaySoupRecipes || []

    // Filter and score recipes
    const allRecipes = [...candidateRecipes]
    const soupRecipes = allRecipes.filter(recipe => isSoupRecipe(recipe.title))
    const nonSoupRecipes = allRecipes.filter(recipe => !isSoupRecipe(recipe.title))

    // Pre-calculate scores for all recipes to avoid rescoring in selectBestRecipe
    const recipeScores = new Map<string, number>()
    allRecipes.forEach(recipe => {
      const score = calculateRecipeScore(
        recipe,
        ingredients,
        recipe.author === RINATY_AUTHOR_NAME
      )
      recipeScores.set(recipe.url, score)
    })

    // Track which recipes have been used to avoid duplicates when possible
    const usedRecipeUrls = new Set<string>()

    // Helper to select best available recipe from a pool
    const selectBestRecipe = (
      pool: CandidateRecipe[],
      allowDuplicates: boolean = false
    ): CandidateRecipe | null => {
      // Sort pool by pre-calculated scores
      const sorted = [...pool].sort((a, b) => {
        const scoreA = recipeScores.get(a.url) || 0
        const scoreB = recipeScores.get(b.url) || 0
        return scoreB - scoreA
      })

      // Find first unused recipe if avoiding duplicates
      if (!allowDuplicates) {
        for (const recipe of sorted) {
          if (!usedRecipeUrls.has(recipe.url)) {
            usedRecipeUrls.add(recipe.url)
            return recipe
          }
        }
      }

      // If all used or duplicates allowed, return best scored
      if (sorted.length > 0) {
        const selected = sorted[0]
        usedRecipeUrls.add(selected.url)
        return selected
      }

      return null
    }

    // Fill slots with recipes
    slots.forEach((slot) => {
      // Special handling for Wednesday night (水曜夜) - use settings
      if (slot.day === '水' && slot.mealTime === '夜' && wednesdayRecipes.length > 0) {
        const randomIndex = Math.floor(Math.random() * wednesdayRecipes.length)
        const selectedRecipe = wednesdayRecipes[randomIndex]
        slot.items = [{
          title: selectedRecipe.title,
          url: selectedRecipe.url
        }]
        usedRecipeUrls.add(selectedRecipe.url)
      } 
      // Special handling for Friday night (金曜夜) - prioritize soup
      else if (slot.day === '金' && slot.mealTime === '夜') {
        // First, try to use Friday soup recipes from settings
        if (fridaySoupRecipes.length > 0) {
          const randomIndex = Math.floor(Math.random() * fridaySoupRecipes.length)
          const selectedRecipe = fridaySoupRecipes[randomIndex]
          slot.items = [{
            title: selectedRecipe.title,
            url: selectedRecipe.url
          }]
          slot.isSoup = true
          usedRecipeUrls.add(selectedRecipe.url)
        }
        // Try to find best soup from candidate pool
        else if (soupRecipes.length > 0) {
          let selected = selectBestRecipe(soupRecipes, false)
          if (!selected) {
            // Allow duplicates if we have run out of unique soup recipes
            selected = selectBestRecipe(soupRecipes, true)
          }
          if (selected) {
            slot.items = [selected]
            slot.isSoup = true
          } else {
            // As a final fallback, treat this as a soup candidate shortage
            slot.items = [{ title: 'レシピなし', url: 'https://example.com' }]
            slot.warning = '要確認（スープ候補不足）'
            slot.isSoup = false
          }
        } 
        // If no soup candidates available, use best non-soup with warning
        else {
          const selected = selectBestRecipe(nonSoupRecipes, true)
          if (selected) {
            slot.items = [selected]
          } else {
            slot.items = [{ title: 'レシピなし', url: 'https://example.com' }]
          }
          slot.warning = '要確認（スープ候補不足）'
          slot.isSoup = false
        }
      } 
      // Use best non-soup recipes for other slots
      else {
        const selected = selectBestRecipe(nonSoupRecipes, false)
        if (selected) {
          slot.items = [selected]
        } else {
          // Allow duplicates if we run out of unique recipes
          const fallback = selectBestRecipe(allRecipes, true)
          if (fallback) {
            slot.items = [fallback]
          } else {
            slot.items = [{ title: 'レシピなし', url: 'https://example.com' }]
          }
        }
      }
    })

    // Check if must ingredients were satisfied
    const selectedTitles = slots.flatMap(s => s.items.map(i => i.title.toLowerCase()))
    mustIngredients.forEach(ingredient => {
      const ingredientName = ingredient.name.toLowerCase()
      const isPresent = selectedTitles.some(title => title.includes(ingredientName))
      if (!isPresent) {
        warnings.push(`必須食材「${ingredient.name}」を含む候補が見つかりませんでした。`)
      }
    })
    
    // Set all warnings at once (or clear if none)
    if (warnings.length > 0) {
      setIngredientWarning(warnings.join('\n'))
    } else {
      setIngredientWarning('')
    }

    setMenuSlots(slots)
    setCopyStatus('')
  }

  // Format menu for Notion (heading-based format)
  const formatForNotion = (): string => {
    let text = ''
    menuSlots.forEach(slot => {
      const warningText = slot.warning ? ` ⚠️ ${slot.warning}` : ''
      text += `## ${slot.day}（${slot.mealTime}）${warningText}\n`
      slot.items.forEach(item => {
        const source = item.source ? `（${item.source}）` : ''
        text += `- ${item.title}${source} ${item.url}\n`
      })
    })
    return text
  }

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    // Clear any existing timeout
    if (statusTimeoutRef.current !== null) {
      clearTimeout(statusTimeoutRef.current)
    }

    if (menuSlots.length === 0) {
      setCopyStatus('献立が作成されていません')
      statusTimeoutRef.current = window.setTimeout(() => setCopyStatus(''), 3000)
      return
    }

    const text = formatForNotion()
    const success = await copyToClipboard(text)
    
    if (success) {
      setCopyStatus('コピーしました！')
    } else {
      setCopyStatus('コピーに失敗しました')
    }

    // Clear status after 3 seconds
    statusTimeoutRef.current = window.setTimeout(() => setCopyStatus(''), 3000)
  }

  return (
    <div className="main-page">
      <h1>献立メーカー</h1>
      
      <div className="pool-status">
        <div className="pool-info">
          <span>候補プール: {candidateRecipes.length}件</span>
          <span className="pool-timestamp">
            最終取得: {formatTimestamp(lastUpdate)}
          </span>
        </div>
        <button 
          onClick={handleReloadCandidates}
          className="btn btn-reload"
          disabled={isLoadingPool}
        >
          {isLoadingPool ? '読み込み中...' : '候補を再読み込み'}
        </button>
      </div>

      {poolWarning && (
        <div className="pool-warning" role="alert">
          ⚠️ {poolWarning}
        </div>
      )}

      <div className="ingredient-pool-section">
        <h2>食材プール（任意）</h2>
        <p className="ingredient-description">
          冷蔵庫にある食材を入力すると、それらを使うレシピを優先的に選びます。
          1行に1食材を入力してください。必須にしたい食材（最大2つ）は末尾に「*」を付けてください。
        </p>
        <textarea
          className="ingredient-input"
          rows={6}
          placeholder={'例：\n白菜*\n豚肉\nにんじん\n\n（*付きは必須食材、最大2つまで）'}
          value={ingredientInput}
          onChange={(e) => setIngredientInput(e.target.value)}
        />
        {ingredientWarning && (
          <div className="ingredient-warning" role="alert">
            ⚠️ {ingredientWarning}
          </div>
        )}
      </div>
      
      <div className="action-buttons">
        <button 
          onClick={generateMenu} 
          className="btn btn-primary"
          disabled={candidateRecipes.length === 0}
        >
          献立を作る
        </button>
        <button 
          onClick={handleCopyToClipboard} 
          className="btn btn-secondary"
          disabled={menuSlots.length === 0}
        >
          Notionに貼る用にコピー
        </button>
      </div>

      {copyStatus && (
        <div className="copy-status" role="status" aria-live="polite">
          {copyStatus}
        </div>
      )}

      <div className="menu-grid">
        {menuSlots.map((slot, index) => (
          <div key={index} className="menu-card">
            <div className="menu-card-header">
              {slot.day}（{slot.mealTime}）
              {slot.isSoup && (
                <span className="soup-badge">🍲 スープ系</span>
              )}
            </div>
            <div className="menu-card-body">
              {slot.warning && (
                <div className="menu-warning">
                  ⚠️ {slot.warning}
                </div>
              )}
              {slot.items.map((item, itemIndex) => (
                <div key={itemIndex} className="menu-item">
                  <div className="menu-item-title">{item.title}</div>
                  {item.source && (
                    <div className="menu-item-source">（{item.source}）</div>
                  )}
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="menu-item-link"
                  >
                    レシピを見る
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="shopping-list-section">
        <h2>買い出しリスト</h2>
        <p className="not-implemented">今回は未対応</p>
      </div>
    </div>
  )
}

export default Main
