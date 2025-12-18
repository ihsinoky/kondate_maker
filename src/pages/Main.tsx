import { useState, useEffect, useRef } from 'react'
import { MenuSlot } from '../types/menu'
import { copyToClipboard } from '../lib/clipboard'
import { loadSettings } from '../lib/settings'
import { isSoupRecipe } from '../lib/soupDetector'

// Placeholder recipe data (will be replaced with actual API calls later)
const PLACEHOLDER_RECIPES = [
  { title: 'ハンバーグ', url: 'https://example.com/recipe1', source: 'クックパッド' },
  { title: '唐揚げ', url: 'https://example.com/recipe2', source: '楽天レシピ' },
  { title: 'カレー', url: 'https://example.com/recipe3', source: 'クックパッド' },
  { title: '豚の生姜焼き', url: 'https://example.com/recipe4', source: 'クックパッド' },
  { title: 'パスタ', url: 'https://example.com/recipe5', source: '楽天レシピ' },
  { title: 'チャーハン', url: 'https://example.com/recipe6', source: 'クックパッド' },
  { title: '焼き魚', url: 'https://example.com/recipe7', source: '楽天レシピ' },
  { title: '肉じゃが', url: 'https://example.com/recipe8', source: 'クックパッド' },
  { title: 'オムライス', url: 'https://example.com/recipe9', source: 'クックパッド' },
  { title: '味噌汁', url: 'https://example.com/recipe10', source: 'クックパッド' },
  { title: 'コーンスープ', url: 'https://example.com/recipe11', source: '楽天レシピ' },
  { title: 'クリームシチュー', url: 'https://example.com/recipe12', source: 'クックパッド' },
]

function Main() {
  const [menuSlots, setMenuSlots] = useState<MenuSlot[]>([])
  const [copyStatus, setCopyStatus] = useState<string>('')
  const statusTimeoutRef = useRef<number | null>(null)

  // Clear timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current !== null) {
        clearTimeout(statusTimeoutRef.current)
      }
    }
  }, [])

  // Generate placeholder menu data
  const generateMenu = () => {
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

    // Filter soup recipes from all available recipes
    const allRecipes = [...PLACEHOLDER_RECIPES]
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
          if (nonSoupIndex < nonSoupRecipes.length) {
            slot.items = [nonSoupRecipes[nonSoupIndex]]
            nonSoupIndex++
          } else {
            // Fallback to any recipe
            slot.items = [allRecipes[0]]
          }
          slot.warning = '要確認（スープ候補不足）'
          slot.isSoup = false
        }
      } 
      // Use non-soup recipes for other slots
      else {
        if (nonSoupIndex < nonSoupRecipes.length) {
          slot.items = [nonSoupRecipes[nonSoupIndex]]
          nonSoupIndex++
        } else {
          // Fallback if we run out of non-soup recipes
          slot.items = [allRecipes[Math.floor(Math.random() * allRecipes.length)]]
        }
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
      
      <div className="action-buttons">
        <button onClick={generateMenu} className="btn btn-primary">
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
