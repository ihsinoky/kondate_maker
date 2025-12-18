import { useState, useEffect, useRef } from 'react'
import { loadSettings, saveSettings, clearSettings, parseRecipeInput, WednesdayRecipe, FridaySoupRecipe, DEFAULT_SETTINGS } from '../lib/settings'
import type { Settings as SettingsType } from '../lib/settings'
import { isSoupRecipe } from '../lib/soupDetector'

// Helper function to get settings with defaults
const getSettingsOrDefault = (): SettingsType => {
  return loadSettings() || DEFAULT_SETTINGS
}

// Helper function to convert recipes to input text format
const recipesToInputText = (recipes: { title: string; url: string }[]): string => {
  return recipes
    .map(recipe => {
      if (recipe.title === recipe.url) {
        return recipe.url
      } else {
        return `${recipe.title} | ${recipe.url}`
      }
    })
    .join('\n')
}

// Helper function to handle recipe save logic
type SaveRecipeParams = {
  input: string
  setErrors: (errors: string[]) => void
  setStatus: (status: string) => void
  statusTimeoutRef: React.MutableRefObject<number | null>
  recipeKey: 'wednesdayRecipes' | 'fridaySoupRecipes'
  onSuccess: (recipes: { title: string; url: string }[]) => void
  requireAtLeastOne?: boolean
  validateSoupKeywords?: boolean
}

const handleRecipeSave = ({
  input,
  setErrors,
  setStatus,
  statusTimeoutRef,
  recipeKey,
  onSuccess,
  requireAtLeastOne = true,
  validateSoupKeywords = false,
}: SaveRecipeParams): void => {
  // Clear any existing timeout
  if (statusTimeoutRef.current !== null) {
    clearTimeout(statusTimeoutRef.current)
  }

  setErrors([])
  setStatus('')

  const { recipes, errors: parseErrors } = parseRecipeInput(input)

  if (parseErrors.length > 0) {
    setErrors(parseErrors)
    return
  }

  if (requireAtLeastOne && recipes.length === 0) {
    setErrors(['少なくとも1件のレシピを入力してください'])
    return
  }

  // Validate soup keywords for Friday soup recipes
  if (validateSoupKeywords && recipes.length > 0) {
    const hasSoupRecipe = recipes.some(recipe => isSoupRecipe(recipe.title))
    if (!hasSoupRecipe) {
      setErrors([
        '警告: 入力されたレシピにスープ系のキーワードが含まれていません。',
        'スープ、シチュー、ポタージュ、豚汁、味噌汁、鍋などのキーワードを含むレシピを推奨します。'
      ])
      // Allow saving but show warning
    }
  }

  try {
    const settings = getSettingsOrDefault()
    saveSettings({ ...settings, [recipeKey]: recipes })
    onSuccess(recipes)
    setStatus('保存しました！')
    statusTimeoutRef.current = window.setTimeout(() => setStatus(''), 3000)
  } catch (error) {
    setErrors([error instanceof Error ? error.message : '保存に失敗しました'])
  }
}

function Settings() {
  const [recipeInput, setRecipeInput] = useState('')
  const [currentRecipes, setCurrentRecipes] = useState<WednesdayRecipe[]>([])
  const [fridaySoupInput, setFridaySoupInput] = useState('')
  const [currentFridaySoupRecipes, setCurrentFridaySoupRecipes] = useState<FridaySoupRecipe[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [fridaySoupErrors, setFridaySoupErrors] = useState<string[]>([])
  const [saveStatus, setSaveStatus] = useState<string>('')
  const [fridaySoupSaveStatus, setFridaySoupSaveStatus] = useState<string>('')
  const statusTimeoutRef = useRef<number | null>(null)
  const fridaySoupStatusTimeoutRef = useRef<number | null>(null)

  // Clear timeout on unmount to prevent memory leaks
  useEffect(() => {
    // Capture the current ref values for cleanup
    const currentStatusTimeout = statusTimeoutRef.current
    const currentFridayTimeout = fridaySoupStatusTimeoutRef.current
    return () => {
      if (currentStatusTimeout !== null) {
        clearTimeout(currentStatusTimeout)
      }
      if (currentFridayTimeout !== null) {
        clearTimeout(currentFridayTimeout)
      }
    }
  }, [])

  // Load settings on mount
  useEffect(() => {
    const settings = loadSettings()
    if (settings) {
      if (settings.wednesdayRecipes.length > 0) {
        setCurrentRecipes(settings.wednesdayRecipes)
        setRecipeInput(recipesToInputText(settings.wednesdayRecipes))
      }
      if (settings.fridaySoupRecipes && settings.fridaySoupRecipes.length > 0) {
        setCurrentFridaySoupRecipes(settings.fridaySoupRecipes)
        setFridaySoupInput(recipesToInputText(settings.fridaySoupRecipes))
      }
    }
  }, [])

  const handleSave = () => {
    handleRecipeSave({
      input: recipeInput,
      setErrors,
      setStatus: setSaveStatus,
      statusTimeoutRef,
      recipeKey: 'wednesdayRecipes',
      onSuccess: setCurrentRecipes,
      requireAtLeastOne: true,
    })
  }

  const handleFridaySoupSave = () => {
    handleRecipeSave({
      input: fridaySoupInput,
      setErrors: setFridaySoupErrors,
      setStatus: setFridaySoupSaveStatus,
      statusTimeoutRef: fridaySoupStatusTimeoutRef,
      recipeKey: 'fridaySoupRecipes',
      onSuccess: setCurrentFridaySoupRecipes,
      requireAtLeastOne: false, // Allow empty for Friday soup (optional)
      validateSoupKeywords: true, // Validate soup keywords
    })
  }

  const handleClear = () => {
    // Clear any existing timeout
    if (statusTimeoutRef.current !== null) {
      clearTimeout(statusTimeoutRef.current)
    }
    if (fridaySoupStatusTimeoutRef.current !== null) {
      clearTimeout(fridaySoupStatusTimeoutRef.current)
    }

    if (!window.confirm('設定をすべて削除してよろしいですか？')) {
      return
    }

    try {
      clearSettings()
      setRecipeInput('')
      setCurrentRecipes([])
      setFridaySoupInput('')
      setCurrentFridaySoupRecipes([])
      setErrors([])
      setFridaySoupErrors([])
      setSaveStatus('設定をクリアしました')
      statusTimeoutRef.current = window.setTimeout(() => setSaveStatus(''), 3000)
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
          placeholder={'例：\n鯖の味噌煮 | https://example.com/recipe1\nhttps://example.com/recipe2'}
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
        <h2>金曜（スープ系）レシピ候補</h2>
        <p className="settings-description">
          金曜夜に使用するスープ系レシピの候補を登録します。1行につき1件のレシピを入力してください。
          登録がない場合は、プレースホルダーからスープ系が自動選択されます（候補がない場合は警告が表示されます）。
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
          value={fridaySoupInput}
          onChange={(e) => setFridaySoupInput(e.target.value)}
          placeholder={'例：\nコーンスープ | https://example.com/recipe1\nhttps://example.com/recipe2'}
          rows={8}
        />

        {fridaySoupErrors.length > 0 && (
          <div className="error-messages">
            {fridaySoupErrors.map((error, index) => (
              <div key={index} className="error-message">
                ❌ {error}
              </div>
            ))}
          </div>
        )}

        {fridaySoupSaveStatus && (
          <div className="save-status">
            {fridaySoupSaveStatus}
          </div>
        )}

        <div className="settings-actions">
          <button onClick={handleFridaySoupSave} className="btn btn-primary">
            保存
          </button>
        </div>
      </section>

      {currentFridaySoupRecipes.length > 0 && (
        <section className="settings-section">
          <h2>現在の金曜スープ設定</h2>
          <div className="current-recipes">
            {currentFridaySoupRecipes.map((recipe, index) => (
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
