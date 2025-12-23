import { useState, useEffect, useRef } from 'react'
import { MenuSlot } from '../types/menu'
import { copyToClipboard } from '../lib/clipboard'
import { loadSettings } from '../lib/settings'
import { isSoupRecipe } from '../lib/soupDetector'
import { loadCandidatePool, formatTimestamp, CandidateRecipe } from '../lib/candidatePool'

/**
 * Helper function to get a fallback recipe when no specific recipes are available
 * @param nonSoupRecipes Array of non-soup recipes
 * @param allRecipes Array of all recipes
 * @param currentIndex Current index in non-soup recipes
 * @param useRandom If true, use random selection from all recipes; if false, use first recipe
 * @returns Object with the selected recipe and the next index
 */
type FallbackRecipeResult = {
  recipe: { title: string; url: string; source?: string }
  nextIndex: number
}

function getFallbackRecipe(
  nonSoupRecipes: CandidateRecipe[],
  allRecipes: CandidateRecipe[],
  currentIndex: number,
  useRandom: boolean = false
): FallbackRecipeResult {
  // First, try to use non-soup recipes sequentially
  if (currentIndex < nonSoupRecipes.length) {
    return {
      recipe: nonSoupRecipes[currentIndex],
      nextIndex: currentIndex + 1
    }
  }
  
  // If we run out of non-soup recipes, fallback to all recipes
  if (allRecipes.length > 0) {
    const selectedRecipe = useRandom 
      ? allRecipes[Math.floor(Math.random() * allRecipes.length)]
      : allRecipes[0]
    return {
      recipe: selectedRecipe,
      nextIndex: currentIndex
    }
  }
  
  // If no recipes at all, create a placeholder
  return {
    recipe: { title: 'レシピなし', url: 'https://example.com' },
    nextIndex: currentIndex
  }
}

function Main() {
  const [menuSlots, setMenuSlots] = useState<MenuSlot[]>([])
  const [copyStatus, setCopyStatus] = useState<string>('')
  const [candidateRecipes, setCandidateRecipes] = useState<CandidateRecipe[]>([])
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [poolWarning, setPoolWarning] = useState<string>('')
  const [isLoadingPool, setIsLoadingPool] = useState<boolean>(false)
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

  // Generate menu data from candidate pool
  const generateMenu = () => {
    if (candidateRecipes.length === 0) {
      setCopyStatus('候補プールが読み込まれていません')
      return
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

    // Filter soup recipes from candidate pool
    const allRecipes = [...candidateRecipes]
    const soupRecipes = allRecipes.filter(recipe => isSoupRecipe(recipe.title))
    const nonSoupRecipes = allRecipes.filter(recipe => !isSoupRecipe(recipe.title))

    // Fill with placeholder data
    let nonSoupIndex = 0
    slots.forEach((slot) => {
      // Special handling for Wednesday night (水曜夜)
      if (slot.day === '水' && slot.mealTime === '夜' && wednesdayRecipes.length > 0) {
        // Randomly select one recipe from Wednesday candidates
        const randomIndex = Math.floor(Math.random() * wednesdayRecipes.length)
        const selectedRecipe = wednesdayRecipes[randomIndex]
        slot.items = [{
          title: selectedRecipe.title,
          url: selectedRecipe.url
        }]
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
        }
        // If no Friday soup recipes configured, try to find soup from placeholders
        else if (soupRecipes.length > 0) {
          const randomIndex = Math.floor(Math.random() * soupRecipes.length)
          slot.items = [soupRecipes[randomIndex]]
          slot.isSoup = true
        } 
        // If no soup candidates available, use non-soup recipe with warning
        else {
          const fallback = getFallbackRecipe(nonSoupRecipes, allRecipes, nonSoupIndex, false)
          slot.items = [fallback.recipe]
          nonSoupIndex = fallback.nextIndex
          slot.warning = '要確認（スープ候補不足）'
          slot.isSoup = false
        }
      } 
      // Use non-soup recipes for other slots
      else {
        const fallback = getFallbackRecipe(nonSoupRecipes, allRecipes, nonSoupIndex, true)
        slot.items = [fallback.recipe]
        nonSoupIndex = fallback.nextIndex
      }
    })

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
      
      <div className="action-buttons">
        <button 
          onClick={generateMenu} 
          className="btn btn-primary"
          disabled={candidateRecipes.length === 0 || isLoadingPool}
        >
          {isLoadingPool ? '候補読み込み中...' : '献立を作る'}
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
