/**
 * Clipboard operations module
 * Handles copying text to clipboard with Safari fallback
 */

/**
 * Copy text to clipboard
 * Tries modern Clipboard API first, falls back to textarea method
 * @param text Text to copy
 * @returns Promise<boolean> true if successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first (works in most browsers)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback:', err)
    }
  }

  // Fallback for Safari and older browsers
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    
    const successful = document.execCommand('copy')
    document.body.removeChild(textarea)
    
    return successful
  } catch (err) {
    console.error('Fallback copy failed:', err)
    return false
  }
}
