import { useState, useEffect } from 'react'
import { loadSettings, saveSettings, clearSettings, parseRecipeInput, WednesdayRecipe } from '../lib/settings'

function Settings() {
  const [recipeInput, setRecipeInput] = useState('')
  const [currentRecipes, setCurrentRecipes] = useState<WednesdayRecipe[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [saveStatus, setSaveStatus] = useState<string>('')

  // Load settings on mount
  useEffect(() => {
    const settings = loadSettings()
    if (settings && settings.wednesdayRecipes.length > 0) {
      setCurrentRecipes(settings.wednesdayRecipes)
      // Convert recipes back to input format for display
      const inputText = settings.wednesdayRecipes
        .map(recipe => {
          if (recipe.title === recipe.url) {
            return recipe.url
          } else {
            return `${recipe.title} | ${recipe.url}`
          }
        })
        .join('\n')
      setRecipeInput(inputText)
    }
  }, [])

  const handleSave = () => {
    setErrors([])
    setSaveStatus('')

    const { recipes, errors: parseErrors } = parseRecipeInput(recipeInput)

    if (parseErrors.length > 0) {
      setErrors(parseErrors)
      return
    }

    if (recipes.length === 0) {
      setErrors(['少なくとも1件のレシピを入力してください'])
      return
    }

    try {
      saveSettings({ wednesdayRecipes: recipes })
      setCurrentRecipes(recipes)
      setSaveStatus('保存しました！')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      setErrors([error instanceof Error ? error.message : '保存に失敗しました'])
    }
  }

  const handleClear = () => {
    if (!window.confirm('設定をすべて削除してよろしいですか？')) {
      return
    }

    try {
      clearSettings()
      setRecipeInput('')
      setCurrentRecipes([])
      setErrors([])
      setSaveStatus('設定をクリアしました')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'クリアに失敗しました'])
    }
  }

  return (
    <div className="settings-page">
      <h1>設定</h1>

      <section className="settings-section">
        <h2>水曜（冷凍鯖）レシピ候補</h2>
        <p className="settings-description">
          水曜夜に使用する冷凍鯖レシピの候補を登録します。1行につき1件のレシピを入力してください。
        </p>

        <div className="settings-format-info">
          <strong>入力形式：</strong>
          <ul>
            <li><code>タイトル | URL</code> - タイトル付きで登録</li>
            <li><code>URL</code> - URLのみでも可（表示名はURLになります）</li>
          </ul>
        </div>

        <textarea
          className="recipe-input"
          value={recipeInput}
          onChange={(e) => setRecipeInput(e.target.value)}
          placeholder="例：&#10;鯖の味噌煮 | https://example.com/recipe1&#10;https://example.com/recipe2"
          rows={8}
        />

        {errors.length > 0 && (
          <div className="error-messages">
            {errors.map((error, index) => (
              <div key={index} className="error-message">
                ❌ {error}
              </div>
            ))}
          </div>
        )}

        {saveStatus && (
          <div className="save-status">
            {saveStatus}
          </div>
        )}

        <div className="settings-actions">
          <button onClick={handleSave} className="btn btn-primary">
            保存
          </button>
          <button onClick={handleClear} className="btn btn-danger">
            すべてクリア
          </button>
        </div>
      </section>

      {currentRecipes.length > 0 && (
        <section className="settings-section">
          <h2>現在の設定</h2>
          <div className="current-recipes">
            {currentRecipes.map((recipe, index) => (
              <div key={index} className="recipe-card">
                <div className="recipe-card-title">{recipe.title}</div>
                <a 
                  href={recipe.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="recipe-card-link"
                >
                  {recipe.url}
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="settings-section">
        <h2>今後実装予定の設定項目</h2>
        <ul className="future-settings">
          <li>曜日ごとのルール</li>
          <li>全体方針（旬・時短など）</li>
          <li>優先レシピサイト</li>
          <li>Notion連携設定</li>
        </ul>
      </section>
    </div>
  )
}

export default Settings
