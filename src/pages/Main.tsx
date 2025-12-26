import { useState, useEffect, useRef } from 'react'
import { MenuSlot } from '../types/menu'
import { copyToClipboard } from '../lib/clipboard'
import { loadSettings } from '../lib/settings'
import { isSoupRecipe } from '../lib/soupDetector'
import { loadCandidatePool, formatTimestamp, CandidateRecipe } from '../lib/candidatePool'
import { estimateMainIngredient, getAllMainIngredients, MainIngredient } from '../lib/mainIngredientEstimator'
import { loadWeeklyState, updateMenuSlots, updateShoppingList, clearWeeklyState, ShoppingListItem } from '../lib/weeklyState'

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
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([])
  const [shoppingListInput, setShoppingListInput] = useState<string>('')
  const [shoppingCopyStatus, setShoppingCopyStatus] = useState<string>('')
  const [dataWarning, setDataWarning] = useState<string>('')
  const statusTimeoutRef = useRef<number | null>(null)
  const shoppingStatusTimeoutRef = useRef<number | null>(null)
  const isInitialMountMenuSlots = useRef<boolean>(true)
  const isInitialMountShoppingList = useRef<boolean>(true)
  const shoppingListIdCounter = useRef<number>(0)

  // Load candidate pool and weekly state on mount
  useEffect(() => {
    loadPool(false)
    
    // Load saved weekly state
    try {
      const savedState = loadWeeklyState()
      if (savedState) {
        if (savedState.menuSlots.length > 0) {
          setMenuSlots(savedState.menuSlots)
        }
        if (savedState.shoppingList.length > 0) {
          setShoppingList(savedState.shoppingList)
        }
        if (savedState.menuSlots.length > 0 || savedState.shoppingList.length > 0) {
          console.log(
            'Loaded saved weekly state:',
            savedState.menuSlots.length,
            'slots,',
            savedState.shoppingList.length,
            'shopping items'
          )
        }
      }
    } catch (error) {
      console.error('Failed to load weekly state:', error)
      setDataWarning('保存データの読み込みに失敗しました。データが破損している可能性があります。')
    }
  }, [])

  // Clear timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current !== null) {
        clearTimeout(statusTimeoutRef.current)
      }
      if (shoppingStatusTimeoutRef.current !== null) {
        clearTimeout(shoppingStatusTimeoutRef.current)
      }
    }
  }, [])

  // Auto-save menu slots when they change
  useEffect(() => {
    if (isInitialMountMenuSlots.current) {
      isInitialMountMenuSlots.current = false
      return
    }
    if (menuSlots.length > 0) {
      try {
        updateMenuSlots(menuSlots)
      } catch (error) {
        console.error('Failed to auto-save menu slots:', error)
      }
    }
  }, [menuSlots])

  // Auto-save shopping list when it changes
  useEffect(() => {
    if (isInitialMountShoppingList.current) {
      isInitialMountShoppingList.current = false
      return
    }
    try {
      updateShoppingList(shoppingList)
    } catch (error) {
      console.error('Failed to auto-save shopping list:', error)
    }
  }, [shoppingList])

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

  // Helper to fill a single slot with a recipe
  const fillSlot = (
    slot: MenuSlot,
    usedRecipeUrls: Set<string>,
    recipeScores: Map<string, number>,
    mainIngredientFilter?: MainIngredient
  ): void => {
    const settings = loadSettings()
    const wednesdayRecipes = settings?.wednesdayRecipes || []
    const fridaySoupRecipes = settings?.fridaySoupRecipes || []

    const allRecipes = [...candidateRecipes]
    const soupRecipes = allRecipes.filter(recipe => isSoupRecipe(recipe.title))
    const nonSoupRecipes = allRecipes.filter(recipe => !isSoupRecipe(recipe.title))

    // Helper to select best available recipe from a pool
    const selectBestRecipe = (
      pool: CandidateRecipe[],
      allowDuplicates: boolean = false
    ): CandidateRecipe | null => {
      // Apply main ingredient filter if provided
      let filteredPool = pool
      if (mainIngredientFilter && mainIngredientFilter !== 'その他') {
        filteredPool = pool.filter(recipe => 
          estimateMainIngredient(recipe.title) === mainIngredientFilter
        )
        // If no matches with filter, fall back to full pool
        if (filteredPool.length === 0) {
          filteredPool = pool
        }
      }

      // Sort pool by pre-calculated scores
      const sorted = [...filteredPool].sort((a, b) => {
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

    // Special handling for Wednesday night (水曜夜) - use settings
    if (slot.day === '水' && slot.mealTime === '夜' && wednesdayRecipes.length > 0) {
      const randomIndex = Math.floor(Math.random() * wednesdayRecipes.length)
      const selectedRecipe = wednesdayRecipes[randomIndex]
      slot.items = [{
        title: selectedRecipe.title,
        url: selectedRecipe.url
      }]
      slot.mainIngredient = estimateMainIngredient(selectedRecipe.title)
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
        slot.mainIngredient = estimateMainIngredient(selectedRecipe.title)
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
          slot.mainIngredient = estimateMainIngredient(selected.title)
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
          slot.mainIngredient = estimateMainIngredient(selected.title)
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
        slot.mainIngredient = estimateMainIngredient(selected.title)
      } else {
        // Allow duplicates if we run out of unique recipes
        const fallback = selectBestRecipe(allRecipes, true)
        if (fallback) {
          slot.items = [fallback]
          slot.mainIngredient = estimateMainIngredient(fallback.title)
        } else {
          slot.items = [{ title: 'レシピなし', url: 'https://example.com' }]
        }
      }
    }
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

    // Pre-calculate scores for all recipes
    const recipeScores = new Map<string, number>()
    candidateRecipes.forEach(recipe => {
      const score = calculateRecipeScore(
        recipe,
        ingredients,
        recipe.author === RINATY_AUTHOR_NAME
      )
      recipeScores.set(recipe.url, score)
    })

    // Track which recipes have been used to avoid duplicates when possible
    const usedRecipeUrls = new Set<string>()

    // Fill slots with recipes
    slots.forEach((slot) => {
      fillSlot(slot, usedRecipeUrls, recipeScores)
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

  // Toggle lock status of a slot
  const handleToggleLock = (index: number) => {
    setMenuSlots(slots => {
      const newSlots = [...slots]
      newSlots[index] = {
        ...newSlots[index],
        isLocked: !newSlots[index].isLocked
      }
      return newSlots
    })
  }

  // Update main ingredient for a slot
  const handleUpdateMainIngredient = (index: number, ingredient: MainIngredient) => {
    setMenuSlots(slots => {
      const newSlots = [...slots]
      newSlots[index] = {
        ...newSlots[index],
        mainIngredient: ingredient
      }
      return newSlots
    })
  }

  // Regenerate a single slot
  const handleRegenerateSlot = (index: number) => {
    if (candidateRecipes.length === 0) {
      setCopyStatus('候補プールが読み込まれていません')
      return
    }

    const { ingredients } = parseIngredientInput(ingredientInput)

    // Pre-calculate scores
    const recipeScores = new Map<string, number>()
    candidateRecipes.forEach(recipe => {
      const score = calculateRecipeScore(
        recipe,
        ingredients,
        recipe.author === RINATY_AUTHOR_NAME
      )
      recipeScores.set(recipe.url, score)
    })

    // Collect already used URLs from other slots
    const usedRecipeUrls = new Set<string>()
    menuSlots.forEach((slot, idx) => {
      if (idx !== index) {
        slot.items.forEach(item => usedRecipeUrls.add(item.url))
      }
    })

    setMenuSlots(slots => {
      const newSlots = [...slots]
      const slot = { ...newSlots[index] }
      
      // Get main ingredient filter if set
      const mainIngredientFilter = slot.mainIngredient
      
      // Clear previous content
      slot.items = []
      slot.warning = undefined
      
      // Fill the slot
      fillSlot(slot, usedRecipeUrls, recipeScores, mainIngredientFilter)
      
      newSlots[index] = slot
      return newSlots
    })
  }

  // Regenerate all unlocked slots
  const handleRegenerateUnlocked = () => {
    if (candidateRecipes.length === 0) {
      setCopyStatus('候補プールが読み込まれていません')
      return
    }

    const { ingredients } = parseIngredientInput(ingredientInput)

    // Pre-calculate scores
    const recipeScores = new Map<string, number>()
    candidateRecipes.forEach(recipe => {
      const score = calculateRecipeScore(
        recipe,
        ingredients,
        recipe.author === RINATY_AUTHOR_NAME
      )
      recipeScores.set(recipe.url, score)
    })

    // Collect URLs from locked slots
    const usedRecipeUrls = new Set<string>()
    menuSlots.forEach(slot => {
      if (slot.isLocked) {
        slot.items.forEach(item => usedRecipeUrls.add(item.url))
      }
    })

    setMenuSlots(slots => {
      const newSlots = slots.map(slot => {
        if (slot.isLocked) {
          // Keep locked slots unchanged
          return slot
        }
        
        // Regenerate unlocked slots
        const newSlot = { ...slot }
        const mainIngredientFilter = newSlot.mainIngredient
        
        // Clear previous content
        newSlot.items = []
        newSlot.warning = undefined
        
        // Fill the slot
        fillSlot(newSlot, usedRecipeUrls, recipeScores, mainIngredientFilter)
        
        return newSlot
      })
      
      return newSlots
    })
  }

  // Generate shopping list from main ingredients
  const handleGenerateShoppingList = () => {
    if (menuSlots.length === 0) {
      setShoppingCopyStatus('献立が作成されていません')
      return
    }

    setShoppingList(prevItems => {
      // Preserve checked state by ingredient text
      const prevCheckedByIngredient = new Map<string, boolean>()
      prevItems.forEach(item => {
        prevCheckedByIngredient.set(item.ingredient, item.checked)
      })

      // Count main ingredients
      const ingredientCounts = new Map<string, number>()
      menuSlots.forEach(slot => {
        if (slot.mainIngredient && slot.mainIngredient !== 'その他') {
          const count = ingredientCounts.get(slot.mainIngredient) || 0
          ingredientCounts.set(slot.mainIngredient, count + 1)
        }
      })

      // Convert to shopping list items
      const items: ShoppingListItem[] = []
      ingredientCounts.forEach((count, ingredient) => {
        const ingredientText = `${ingredient}（${count}食分）`
        const prevChecked = prevCheckedByIngredient.get(ingredientText) ?? false
        items.push({
          id: `${ingredient}-${++shoppingListIdCounter.current}`,
          ingredient: ingredientText,
          checked: prevChecked
        })
      })

      // Add custom items from input if any
      if (shoppingListInput.trim()) {
        const customItems = shoppingListInput.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => {
            const prevChecked = prevCheckedByIngredient.get(line) ?? false
            return {
              id: `custom-${++shoppingListIdCounter.current}`,
              ingredient: line,
              checked: prevChecked
            }
          })
        items.push(...customItems)
      }

      return items
    })
    
    // Clear the input after adding custom items
    setShoppingListInput('')
  }

  // Toggle shopping list item checked status
  const handleToggleShoppingItem = (id: string) => {
    setShoppingList(items => 
      items.map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    )
  }

  // Remove shopping list item
  const handleRemoveShoppingItem = (id: string) => {
    setShoppingList(items => items.filter(item => item.id !== id))
  }

  // Copy shopping list to clipboard
  const handleCopyShoppingList = async () => {
    if (shoppingStatusTimeoutRef.current !== null) {
      clearTimeout(shoppingStatusTimeoutRef.current)
    }

    if (shoppingList.length === 0) {
      setShoppingCopyStatus('買い物リストが空です')
      shoppingStatusTimeoutRef.current = window.setTimeout(() => setShoppingCopyStatus(''), 3000)
      return
    }

    const text = shoppingList
      .map(item => `${item.checked ? '☑' : '☐'} ${item.ingredient}`)
      .join('\n')
    
    const success = await copyToClipboard(text)
    
    if (success) {
      setShoppingCopyStatus('コピーしました！')
    } else {
      setShoppingCopyStatus('コピーに失敗しました')
    }

    shoppingStatusTimeoutRef.current = window.setTimeout(() => setShoppingCopyStatus(''), 3000)
  }

  // Reset this week's state
  const handleResetWeek = () => {
    // TODO: Replace with custom accessible modal for better screen reader support
    if (!confirm('今週の献立と買い物リストをリセットしますか？\nこの操作は取り消せません。')) {
      return
    }
    
    try {
      clearWeeklyState()
      setMenuSlots([])
      setShoppingList([])
      setIngredientInput('')
      setShoppingListInput('')
      setCopyStatus('今週の状態をリセットしました')
      
      // Clear copy status after 3 seconds
      if (statusTimeoutRef.current !== null) {
        clearTimeout(statusTimeoutRef.current)
      }
      statusTimeoutRef.current = window.setTimeout(() => setCopyStatus(''), 3000)
    } catch (error) {
      console.error('Failed to reset week:', error)
      setCopyStatus('リセットに失敗しました')
      if (statusTimeoutRef.current !== null) {
        clearTimeout(statusTimeoutRef.current)
      }
      statusTimeoutRef.current = window.setTimeout(() => setCopyStatus(''), 3000)
    }
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

      {dataWarning && (
        <div className="pool-warning" role="alert">
          ⚠️ {dataWarning}
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
          onClick={handleRegenerateUnlocked} 
          className="btn btn-primary"
          disabled={menuSlots.length === 0 || candidateRecipes.length === 0}
        >
          未確定のみ再生成
        </button>
        <button 
          onClick={handleCopyToClipboard} 
          className="btn btn-secondary"
          disabled={menuSlots.length === 0}
        >
          Notionに貼る用にコピー
        </button>
        <button 
          onClick={handleResetWeek} 
          className="btn btn-danger"
          disabled={menuSlots.length === 0 && shoppingList.length === 0}
          title="今週の献立と買い物リストをリセット"
        >
          今週をリセット
        </button>
      </div>

      {copyStatus && (
        <div className="copy-status" role="status" aria-live="polite">
          {copyStatus}
        </div>
      )}

      <div className="menu-grid">
        {menuSlots.map((slot, index) => (
          <div key={index} className={`menu-card ${slot.isLocked ? 'locked' : ''}`}>
            <div className="menu-card-header">
              <span>
                {slot.day}（{slot.mealTime}）
                {slot.isSoup && (
                  <span className="soup-badge">🍲 スープ系</span>
                )}
              </span>
              <button
                onClick={() => handleToggleLock(index)}
                className="btn-lock"
                title={slot.isLocked ? 'ロック解除' : 'ロック'}
                aria-label={slot.isLocked ? '献立をロック解除' : '献立をロック'}
              >
                {slot.isLocked ? '🔒' : '🔓'}
              </button>
            </div>
            <div className="menu-card-body">
              {slot.warning && (
                <div className="menu-warning">
                  ⚠️ {slot.warning}
                </div>
              )}
              
              {/* Main ingredient display and edit */}
              <div className="main-ingredient-section">
                <label htmlFor={`main-ingredient-${index}`} className="main-ingredient-label">主材料:</label>
                <select
                  id={`main-ingredient-${index}`}
                  className="main-ingredient-select"
                  value={slot.mainIngredient || 'その他'}
                  onChange={(e) => handleUpdateMainIngredient(index, e.target.value as MainIngredient)}
                >
                  {getAllMainIngredients().map(ing => (
                    <option key={ing} value={ing}>{ing}</option>
                  ))}
                </select>
              </div>

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
              
              <button
                onClick={() => handleRegenerateSlot(index)}
                className="btn btn-regenerate"
                disabled={slot.isLocked || candidateRecipes.length === 0}
              >
                この枠を再生成
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="shopping-list-section">
        <h2>買い出しリスト</h2>
        <p className="shopping-description">
          主材料に基づいて買い物リストを生成します。手動で項目を追加することもできます。
        </p>
        
        <div className="shopping-input-section">
          <textarea
            className="shopping-input"
            rows={4}
            placeholder="追加する食材を入力（1行に1つ）"
            aria-label="買い出しリストに追加する食材"
            value={shoppingListInput}
            onChange={(e) => setShoppingListInput(e.target.value)}
          />
          <button
            onClick={handleGenerateShoppingList}
            className="btn btn-primary"
            disabled={menuSlots.length === 0}
          >
            リストを生成
          </button>
        </div>

        {shoppingList.length > 0 && (
          <>
            <div className="shopping-list">
              {shoppingList.map(item => (
                <div key={item.id} className="shopping-item">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleToggleShoppingItem(item.id)}
                    className="shopping-checkbox"
                    aria-label={item.ingredient}
                  />
                  <span className={`shopping-ingredient ${item.checked ? 'checked' : ''}`}>
                    {item.ingredient}
                  </span>
                  <button
                    onClick={() => handleRemoveShoppingItem(item.id)}
                    className="btn-remove"
                    title="削除"
                    aria-label={`${item.ingredient}を削除`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            
            <div className="shopping-actions">
              <button
                onClick={handleCopyShoppingList}
                className="btn btn-secondary"
              >
                買い物リストをコピー
              </button>
            </div>
            
            {shoppingCopyStatus && (
              <div className="copy-status" role="status" aria-live="polite">
                {shoppingCopyStatus}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Main
