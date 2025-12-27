/**
 * ESLint Validator Utility
 * Provides programmatic JavaScript and JSON validation for generated code
 * Uses ESLint's Linter class for syntax checking
 */

import { Linter } from 'eslint'

// Create a singleton linter instance
const linter = new Linter()

/**
 * Default ESLint rules for syntax validation
 */
const SYNTAX_RULES = {
  'no-unexpected-multiline': 'error',
}

/**
 * Validates JSON code for syntax errors
 * @param {string} code - JSON code to validate
 * @param {string} filename - Optional filename for error messages
 * @returns {Object} - { valid: boolean, errors: Array<{ line, column, message, severity }> }
 */
export function validateJSON(code, filename = 'file.json') {
  if (!code || typeof code !== 'string') {
    return { valid: false, errors: [{ line: 0, column: 0, message: 'No code provided', severity: 'error' }] }
  }

  try {
    JSON.parse(code)
    return {
      valid: true,
      errors: []
    }
  } catch (error) {
    // Try to extract position from error message
    // JSON.parse errors can have formats like:
    // - "Unexpected token X in JSON at position Y"
    // - "Expected property name or '}' in JSON at position Y"
    let line = 1
    let column = 1
    
    const positionMatch = error.message.match(/position\s+(\d+)/i)
    if (positionMatch) {
      const position = parseInt(positionMatch[1], 10)
      const beforeError = code.substring(0, position)
      const lines = beforeError.split('\n')
      line = lines.length
      column = lines[lines.length - 1].length + 1
    } else {
      // If no position found, try to find the error location by parsing character by character
      // This is a fallback for cases where the error message doesn't include position
      const trimmedCode = code.trim()
      if (trimmedCode.length === 0) {
        line = 1
        column = 1
      } else {
        // Try to find common JSON error patterns
        const lines = code.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const lineContent = lines[i]
          // Look for common JSON syntax issues
          if (lineContent.includes('undefined') || 
              lineContent.match(/['"]\s*:\s*['"]/) ||
              lineContent.includes('NaN') ||
              lineContent.includes('Infinity')) {
            line = i + 1
            column = 1
            break
          }
        }
      }
    }

    return {
      valid: false,
      errors: [{
        line,
        column,
        message: `JSON parse error: ${error.message}`,
        severity: 'fatal'
      }]
    }
  }
}

/**
 * Validates JavaScript code for syntax errors
 * @param {string} code - JavaScript code to validate
 * @param {string} filename - Optional filename for error messages
 * @returns {Object} - { valid: boolean, errors: Array<{ line, column, message, severity }> }
 */
export function validateJavaScript(code, filename = 'code.js') {
  if (!code || typeof code !== 'string') {
    return { valid: false, errors: [{ line: 0, column: 0, message: 'No code provided', severity: 'error' }] }
  }

  try {
    const messages = linter.verify(code, {
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        globals: {
          // Browser globals
          window: 'readonly',
          document: 'readonly',
          console: 'readonly',
          fetch: 'readonly',
          setTimeout: 'readonly',
          setInterval: 'readonly',
          clearTimeout: 'readonly',
          clearInterval: 'readonly',
          localStorage: 'readonly',
          sessionStorage: 'readonly',
          navigator: 'readonly',
          location: 'readonly',
          // Chrome extension globals
          chrome: 'readonly',
          browser: 'readonly',
        }
      },
      rules: SYNTAX_RULES
    }, { filename })

    // Filter to only fatal/error messages (syntax errors)
    const errors = messages
      .filter(msg => msg.fatal || msg.severity === 2)
      .map(msg => ({
        line: msg.line || 0,
        column: msg.column || 0,
        message: msg.message,
        severity: msg.fatal ? 'fatal' : 'error',
        ruleId: msg.ruleId
      }))

    return {
      valid: errors.length === 0,
      errors
    }
  } catch (error) {
    return {
      valid: false,
      errors: [{
        line: 0,
        column: 0,
        message: `ESLint error: ${error.message}`,
        severity: 'fatal'
      }]
    }
  }
}

/**
 * Checks if a file is a JavaScript file based on extension
 * @param {string} filePath - File path to check
 * @returns {boolean} - True if it's a JS file
 */
function isJavaScriptFile(filePath) {
  if (!filePath) return false
  const ext = filePath.split('.').pop()?.toLowerCase()
  return ['js', 'mjs', 'cjs'].includes(ext)
}

/**
 * Checks if a file is a JSON file based on extension
 * @param {string} filePath - File path to check
 * @returns {boolean} - True if it's a JSON file
 */
function isJSONFile(filePath) {
  if (!filePath) return false
  const ext = filePath.split('.').pop()?.toLowerCase()
  return ext === 'json'
}

/**
 * Validates multiple JS and JSON files and returns a summary
 * Validates .js, .mjs, .cjs, and .json files - skips all others
 * @param {Object} files - Map of file paths to contents
 * @returns {Object} - { allValid: boolean, results: Object, failedFiles: Array<string> }
 */
export function validateFiles(files) {
  if (!files || typeof files !== 'object') {
    return { allValid: true, results: {}, failedFiles: [] }
  }

  const results = {}
  const failedFiles = []

  for (const [filePath, content] of Object.entries(files)) {
    // Validate JavaScript files
    if (isJavaScriptFile(filePath)) {
      const result = validateJavaScript(content, filePath)
      results[filePath] = result

      if (!result.valid) {
        failedFiles.push(filePath)
        console.log(`❌ [eslint-validator] Validation failed for ${filePath}:`, result.errors)
      } else {
        console.log(`✅ [eslint-validator] Validation passed for ${filePath}`)
      }
      continue
    }

    // Validate JSON files
    if (isJSONFile(filePath)) {
      const result = validateJSON(content, filePath)
      results[filePath] = result

      if (!result.valid) {
        failedFiles.push(filePath)
        console.log(`❌ [eslint-validator] JSON validation failed for ${filePath}:`, result.errors)
      } else {
        console.log(`✅ [eslint-validator] JSON validation passed for ${filePath}`)
      }
      continue
    }

    // Skip other file types
    results[filePath] = { valid: true, errors: [], skipped: true }
  }

  return {
    allValid: failedFiles.length === 0,
    results,
    failedFiles
  }
}
