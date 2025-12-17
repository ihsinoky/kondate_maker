/**
 * Settings storage module
 * Handles reading and writing settings to localStorage
 */

const STORAGE_KEY = 'kondate.settings.v1'

/**
 * Represents a single Wednesday recipe candidate
 */
export interface WednesdayRecipe {
  title: string
  url: string
}

/**
 * Application settings structure
 */
export interface Settings {
  wednesdayRecipes: WednesdayRecipe[]
}

/**
 * Load settings from localStorage
 * @returns Settings object or null if not found or invalid
 */
export function loadSettings(): Settings | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return null
    }
    const parsed = JSON.parse(stored)
    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    if (!Array.isArray(parsed.wednesdayRecipes)) {
      return null
    }
    return parsed as Settings
  } catch (error) {
    console.error('Failed to load settings:', error)
    return null
  }
}

/**
 * Save settings to localStorage
 * @param settings Settings object to save
 */
export function saveSettings(settings: Settings): void {
  try {
    const serialized = JSON.stringify(settings)
    localStorage.setItem(STORAGE_KEY, serialized)
  } catch (error) {
    console.error('Failed to save settings:', error)
    throw new Error('設定の保存に失敗しました')
  }
}

/**
 * Clear all settings from localStorage
 */
export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear settings:', error)
    throw new Error('設定のクリアに失敗しました')
  }
}

/**
 * Parse recipe input text into WednesdayRecipe array
 * @param input Multi-line text input
 * @returns Object with recipes array and errors array
 */
export function parseRecipeInput(input: string): {
  recipes: WednesdayRecipe[]
  errors: string[]
} {
  const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  const recipes: WednesdayRecipe[] = []
  const errors: string[] = []

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    
    // Check if line contains pipe separator
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim())
      if (parts.length !== 2) {
        errors.push(`${lineNumber}行目: パイプ区切りの形式が正しくありません`)
        return
      }
      const [title, url] = parts
      if (!title || !url) {
        errors.push(`${lineNumber}行目: タイトルまたはURLが空です`)
        return
      }
      if (!isValidUrl(url)) {
        errors.push(`${lineNumber}行目: URLの形式が正しくありません`)
        return
      }
      recipes.push({ title, url })
    } else {
      // URL only format
      if (!isValidUrl(line)) {
        errors.push(`${lineNumber}行目: URLの形式が正しくありません`)
        return
      }
      recipes.push({ title: line, url: line })
    }
  })

  return { recipes, errors }
}

/**
 * Validate if a string is a valid URL
 * @param urlString String to validate
 * @returns true if valid URL
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
