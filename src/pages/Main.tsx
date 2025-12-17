import { useState } from 'react'
import { MenuSlot } from '../types/menu'
import { copyToClipboard } from '../lib/clipboard'

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
]

function Main() {
  const [menuSlots, setMenuSlots] = useState<MenuSlot[]>([])
  const [copyStatus, setCopyStatus] = useState<string>('')

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

    // Fill with placeholder data
    slots.forEach((slot, index) => {
      slot.items = [PLACEHOLDER_RECIPES[index]]
    })

    setMenuSlots(slots)
    setCopyStatus('')
  }

  // Format menu for Notion (heading-based format)
  const formatForNotion = (): string => {
    let text = ''
    menuSlots.forEach(slot => {
      text += `## ${slot.day}（${slot.mealTime}）\n`
      slot.items.forEach(item => {
        const source = item.source ? `（${item.source}）` : ''
        text += `- ${item.title}${source} ${item.url}\n`
      })
    })
    return text
  }

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    if (menuSlots.length === 0) {
      setCopyStatus('献立が作成されていません')
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
    setTimeout(() => setCopyStatus(''), 3000)
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
        <div className="copy-status">{copyStatus}</div>
      )}

      <div className="menu-grid">
        {menuSlots.map((slot, index) => (
          <div key={index} className="menu-card">
            <div className="menu-card-header">
              {slot.day}（{slot.mealTime}）
            </div>
            <div className="menu-card-body">
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
