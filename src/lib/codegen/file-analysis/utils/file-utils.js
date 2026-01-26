/**
 * File utility functions for the file analysis system
 */

/**
 * Determines the file type from a file path
 * @param {string} path - File path
 * @returns {string} File type: 'javascript', 'html', 'css', 'manifest', 'json', 'unknown'
 */
export function getFileType(path) {
  if (!path || typeof path !== 'string') {
    return 'unknown'
  }

  const normalizedPath = path.toLowerCase()

  // Check for manifest.json specifically
  if (normalizedPath.endsWith('manifest.json')) {
    return 'manifest'
  }

  // Check file extensions
  if (normalizedPath.endsWith('.js') || normalizedPath.endsWith('.mjs')) {
    return 'javascript'
  }

  if (normalizedPath.endsWith('.html') || normalizedPath.endsWith('.htm')) {
    return 'html'
  }

  if (normalizedPath.endsWith('.css')) {
    return 'css'
  }

  if (normalizedPath.endsWith('.json')) {
    return 'json'
  }

  return 'unknown'
}

/**
 * Gets metadata for a file
 * @param {string} path - File path
 * @param {string} content - File content
 * @returns {Object} File metadata
 */
export function getMetadata(path, content) {
  if (!content || typeof content !== 'string') {
    return {
      path,
      lineCount: 0,
      charCount: 0,
      isEmpty: true
    }
  }

  const lines = content.split('\n')

  return {
    path,
    lineCount: lines.length,
    charCount: content.length,
    isEmpty: content.trim().length === 0
  }
}

/**
 * Extracts the filename from a path
 * @param {string} path - File path
 * @returns {string} Filename
 */
export function getFilename(path) {
  if (!path) return ''
  const parts = path.split('/')
  return parts[parts.length - 1] || ''
}

/**
 * Checks if a file is a binary/asset file
 * @param {string} path - File path
 * @returns {boolean} True if binary/asset
 */
export function isBinaryFile(path) {
  if (!path) return false
  const binaryExtensions = /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp3|mp4|webm|ogg|wav)$/i
  return binaryExtensions.test(path)
}

/**
 * Infers the Chrome extension context from a file path
 * @param {string} path - File path
 * @returns {string|null} Context type: 'background', 'popup', 'content', 'options', 'sidepanel', 'newtab', null
 */
export function inferChromeContext(path) {
  if (!path) return null

  const normalizedPath = path.toLowerCase()

  if (normalizedPath.includes('background') || normalizedPath.includes('service_worker') || normalizedPath.includes('service-worker')) {
    return 'background'
  }

  if (normalizedPath.includes('popup')) {
    return 'popup'
  }

  if (normalizedPath.includes('content') || normalizedPath.includes('inject')) {
    return 'content'
  }

  if (normalizedPath.includes('options') || normalizedPath.includes('settings')) {
    return 'options'
  }

  if (normalizedPath.includes('sidepanel') || normalizedPath.includes('side_panel') || normalizedPath.includes('side-panel')) {
    return 'sidepanel'
  }

  if (normalizedPath.includes('newtab') || normalizedPath.includes('new_tab') || normalizedPath.includes('new-tab')) {
    return 'newtab'
  }

  return null
}
