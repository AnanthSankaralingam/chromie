/**
 * Static JSON formatter utility for ensuring proper formatting of JSON files
 * Specifically designed to handle manifest.json files that may be generated as single-line JSON
 */

/**
 * Formats a JSON string with proper indentation and line breaks
 * @param {string} jsonString - The JSON string to format
 * @param {number} indent - Number of spaces for indentation (default: 2)
 * @returns {string} - Properly formatted JSON string
 */
export function formatJsonString(jsonString, indent = 2) {
  try {
    // First, try to parse the JSON to ensure it's valid
    const parsed = JSON.parse(jsonString)
    
    // Format with proper indentation and line breaks
    return JSON.stringify(parsed, null, indent)
  } catch (error) {
    console.error('Error formatting JSON:', error.message)
    throw new Error(`Invalid JSON provided to formatter: ${error.message}`)
  }
}

/**
 * Formats a JSON object with proper indentation and line breaks
 * @param {Object} jsonObject - The JSON object to format
 * @param {number} indent - Number of spaces for indentation (default: 2)
 * @returns {string} - Properly formatted JSON string
 */
export function formatJsonObject(jsonObject, indent = 2) {
  try {
    return JSON.stringify(jsonObject, null, indent)
  } catch (error) {
    console.error('Error formatting JSON object:', error.message)
    throw new Error(`Error formatting JSON object: ${error.message}`)
  }
}

/**
 * Ensures a manifest.json file is properly formatted
 * Handles both string and object inputs
 * @param {string|Object} manifest - The manifest content (string or object)
 * @returns {string} - Properly formatted manifest.json string
 */
export function formatManifestJson(manifest) {
  try {
    let manifestObject
    
    if (typeof manifest === 'string') {
      // Parse the string first
      manifestObject = JSON.parse(manifest)
    } else if (typeof manifest === 'object' && manifest !== null) {
      // Already an object
      manifestObject = manifest
    } else {
      throw new Error('Manifest must be a string or object')
    }
    
    // Validate it's a proper manifest structure
    if (!manifestObject.manifest_version && !manifestObject.version) {
      console.warn('Warning: This may not be a valid Chrome extension manifest')
    }
    
    // Format with 2-space indentation (standard for JSON)
    return JSON.stringify(manifestObject, null, 2)
  } catch (error) {
    console.error('Error formatting manifest.json:', error.message)
    throw new Error(`Failed to format manifest.json: ${error.message}`)
  }
}

/**
 * Validates and formats any JSON file content
 * @param {string} filename - The filename (for context in error messages)
 * @param {string|Object} content - The JSON content to format
 * @returns {string} - Properly formatted JSON string
 */
export function formatJsonFile(filename, content) {
  try {
    let jsonObject
    
    if (typeof content === 'string') {
      jsonObject = JSON.parse(content)
    } else if (typeof content === 'object' && content !== null) {
      jsonObject = content
    } else {
      throw new Error(`Content for ${filename} must be a string or object`)
    }
    
    return JSON.stringify(jsonObject, null, 2)
  } catch (error) {
    console.error(`Error formatting ${filename}:`, error.message)
    throw new Error(`Failed to format ${filename}: ${error.message}`)
  }
}
