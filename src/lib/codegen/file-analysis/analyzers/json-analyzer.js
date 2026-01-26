/**
 * JSON file analyzer (non-manifest)
 * Extracts structure, depth, and inferred type
 */

/**
 * Analyzes a JSON file (non-manifest)
 * @param {string} content - File content
 * @param {string} path - File path
 * @returns {Object} Analysis result
 */
export function analyzeJson(content, path) {
  const result = {
    structure: null,
    maxDepth: 0,
    inferredType: 'unknown',
    topLevelKeys: [],
    parseError: null
  }

  try {
    const parsed = JSON.parse(content)
    result.structure = getStructureType(parsed)
    result.maxDepth = calculateMaxDepth(parsed)
    result.inferredType = inferJsonType(parsed, path)

    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      result.topLevelKeys = Object.keys(parsed)
    }
  } catch (error) {
    result.parseError = error.message
  }

  return result
}

/**
 * Gets the top-level structure type
 */
function getStructureType(parsed) {
  if (Array.isArray(parsed)) {
    return 'array'
  }
  if (parsed === null) {
    return 'null'
  }
  return typeof parsed
}

/**
 * Calculates maximum nesting depth
 */
function calculateMaxDepth(value, currentDepth = 0) {
  if (value === null || typeof value !== 'object') {
    return currentDepth
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return currentDepth + 1
    }
    return Math.max(...value.map(item => calculateMaxDepth(item, currentDepth + 1)))
  }

  const keys = Object.keys(value)
  if (keys.length === 0) {
    return currentDepth + 1
  }
  return Math.max(...keys.map(key => calculateMaxDepth(value[key], currentDepth + 1)))
}

/**
 * Infers the JSON file type based on content and path
 */
function inferJsonType(parsed, path) {
  const normalizedPath = path.toLowerCase()

  // Localization files (_locales/*/messages.json)
  if (normalizedPath.includes('_locales') || normalizedPath.includes('messages.json')) {
    return 'localization'
  }

  // Package/config files
  if (normalizedPath.includes('package.json') || normalizedPath.includes('tsconfig') ||
      normalizedPath.includes('.eslintrc') || normalizedPath.includes('.prettierrc')) {
    return 'config'
  }

  // Check content patterns for localization
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    const keys = Object.keys(parsed)

    // Localization pattern: keys with "message" property
    if (keys.length > 0 && keys.every(key => {
      const val = parsed[key]
      return typeof val === 'object' && val !== null && 'message' in val
    })) {
      return 'localization'
    }

    // Config pattern: has common config keys
    const configKeys = ['version', 'name', 'description', 'settings', 'options', 'config']
    if (keys.some(key => configKeys.includes(key.toLowerCase()))) {
      return 'config'
    }
  }

  // Array of objects - likely data
  if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
    return 'data'
  }

  // Simple array - likely list
  if (Array.isArray(parsed)) {
    return 'list'
  }

  return 'data'
}
