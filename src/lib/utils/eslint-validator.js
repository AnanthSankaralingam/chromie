/**
 * ESLint Validator Utility
 * Provides programmatic JavaScript validation for generated code
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
 * Validates multiple JS files and returns a summary
 * Only validates .js, .mjs, .cjs files - skips all others
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
    // Only validate JavaScript files
    if (!isJavaScriptFile(filePath)) {
      results[filePath] = { valid: true, errors: [], skipped: true }
      continue
    }

    const result = validateJavaScript(content, filePath)
    results[filePath] = result

    if (!result.valid) {
      failedFiles.push(filePath)
      console.log(`❌ [eslint-validator] Validation failed for ${filePath}:`, result.errors)
    } else {
      console.log(`✅ [eslint-validator] Validation passed for ${filePath}`)
    }
  }

  return {
    allValid: failedFiles.length === 0,
    results,
    failedFiles
  }
}
