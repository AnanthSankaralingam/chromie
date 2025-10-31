/**
 * Icon loader utility
 * Loads icons from the local public/icons/ directory for HTML preview
 * This avoids client-side database calls for security
 */

import { hasIcon } from './available-icons'

// Map of icon paths to their data URLs (cached)
const iconMap = new Map()

/**
 * Get icon data URL by path (e.g., "icons/check.png")
 * Returns null if icon not found
 */
export function getIconDataUrl(iconPath) {
  return iconMap.get(iconPath) || null
}

/**
 * Get all available icon paths
 */
export function getAvailableIcons() {
  return Array.from(iconMap.keys())
}

/**
 * Check if an icon exists (uses available-icons.js dictionary)
 */
export function iconExists(iconPath) {
  return hasIcon(iconPath)
}

/**
 * Load icon from public directory (client-side)
 * This fetches the icon from /icons/ directory and converts to data URL
 * Only loads icons that exist in the available-icons dictionary
 */
export async function loadIconAsDataUrl(iconPath) {
  // Normalize path: ensure it starts with icons/ and remove leading slash
  const normalized = iconPath.startsWith('/') ? iconPath.slice(1) : iconPath
  const path = normalized.startsWith('icons/') ? normalized : `icons/${normalized}`
  
  // Check if icon exists in our dictionary first
  if (!hasIcon(path)) {
    console.warn('[icon-loader] Icon not in available icons dictionary:', path)
    return null
  }
  
  // Check cache first
  if (iconMap.has(path)) {
    return iconMap.get(path)
  }
  
  try {
    // Fetch from public directory (Next.js serves files from public/ at root)
    const response = await fetch(`/${path}`)
    if (!response.ok) {
      console.warn('[icon-loader] Icon not found at:', `/${path}`, response.status)
      return null
    }
    
    const blob = await response.blob()
    const reader = new FileReader()
    
    return new Promise((resolve) => {
      reader.onloadend = () => {
        const dataUrl = reader.result
        // Cache it
        iconMap.set(path, dataUrl)
        console.log('[icon-loader] Loaded icon:', path)
        resolve(dataUrl)
      }
      reader.onerror = () => {
        console.error('[icon-loader] Error reading icon:', path)
        resolve(null)
      }
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.error('[icon-loader] Error loading icon:', path, e)
    return null
  }
}

/**
 * Load multiple icons and return a map
 */
export async function loadIcons(iconPaths) {
  const results = new Map()
  const loadPromises = iconPaths.map(async (path) => {
    const dataUrl = await loadIconAsDataUrl(path)
    if (dataUrl) {
      results.set(path, dataUrl)
    }
  })
  
  await Promise.all(loadPromises)
  return results
}

