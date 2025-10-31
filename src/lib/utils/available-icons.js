/**
 * Available Icons Dictionary
 * This file contains a list of all available icons in the icons/ directory
 * Used for validating icon references in HTML preview
 */

// List of all available icon filenames (without icons/ prefix)
export const AVAILABLE_ICONS = [
  'add.png',
  'angle-left.png',
  'angle-right.png',
  'bulb.png',
  'calendar-icon.png',
  'check.png',
  'cloud-icon.png',
  'cross.png',
  'download.png',
  'globe.png',
  'heart-icon.png',
  'home-icon.png',
  'icon128.png',
  'icon16.png',
  'icon48.png',
  'info.png',
  'instagram.png',
  'linkedin.png',
  'list-check.png',
  'marker.png',
  'menu-burger.png',
  'note-icon.png',
  'paper-plane.png',
  'planet-icon.png',
  'refresh.png',
  'search-icon.png',
  'settings-sliders.png',
  'shopping-cart.png',
  'timer-icon.png',
  'trash.png',
  'user.png',
  'users-alt.png',
  'world.png',
  'youtube.png'
]

// Full paths with icons/ prefix
export const AVAILABLE_ICON_PATHS = AVAILABLE_ICONS.map(name => `icons/${name}`)

// Map of icon filename to full path
export const ICON_PATH_MAP = new Map(
  AVAILABLE_ICONS.map(name => [name, `icons/${name}`])
)

// Map of full path to icon filename
export const ICON_FILENAME_MAP = new Map(
  AVAILABLE_ICONS.map(name => [`icons/${name}`, name])
)

/**
 * Check if an icon exists by full path (e.g., "icons/check.png")
 */
export function hasIcon(iconPath) {
  const normalized = iconPath.startsWith('/') ? iconPath.slice(1) : iconPath
  return AVAILABLE_ICON_PATHS.includes(normalized)
}

/**
 * Check if an icon exists by filename (e.g., "check.png")
 */
export function hasIconByFilename(filename) {
  return AVAILABLE_ICONS.includes(filename)
}

/**
 * Get icon filename from full path
 */
export function getIconFilename(iconPath) {
  const normalized = iconPath.startsWith('/') ? iconPath.slice(1) : iconPath
  return normalized.startsWith('icons/') ? normalized.slice(6) : normalized
}

/**
 * Get full icon path from filename
 */
export function getIconPath(filename) {
  return filename.startsWith('icons/') ? filename : `icons/${filename}`
}

