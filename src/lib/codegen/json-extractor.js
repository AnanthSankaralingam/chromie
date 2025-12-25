/**
 * JSON Extraction and Parsing Utilities
 * Handles extraction and parsing of JSON from LLM output
 */

/**
 * Extracts JSON content from LLM output text
 * Handles three formats: ```json blocks, ``` blocks, and raw JSON
 * @param {string} outputText - The LLM output text
 * @returns {string} Extracted JSON content or empty string
 */
export function extractJsonContent(outputText) {
  if (!outputText || typeof outputText !== 'string') return ""

  // Try extracting from ```json code blocks
  if (outputText.includes('```json')) {
    const jsonMatch = outputText.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      return jsonMatch[1].trim()
    }
  }

  // Try extracting from generic ``` code blocks
  if (outputText.includes('```')) {
    const codeMatch = outputText.match(/```\s*([\s\S]*?)\s*```/)
    if (codeMatch) {
      return codeMatch[1].trim()
    }
  }

  // Try extracting raw JSON by finding matching braces
  const jsonStart = outputText.indexOf('{')
  if (jsonStart === -1) return ""

  let braceCount = 0
  let jsonEnd = jsonStart
  let inString = false
  let escapeNext = false

  for (let i = jsonStart; i < outputText.length; i++) {
    const char = outputText[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\') {
      escapeNext = true
      continue
    }

    if (char === '"' && !escapeNext) {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === '{') braceCount++
      if (char === '}') braceCount--
      if (braceCount === 0) {
        jsonEnd = i + 1
        break
      }
    }
  }

  return outputText.substring(jsonStart, jsonEnd).trim()
}

/**
 * Sanitizes control characters in JSON string values
 * @param {string} jsonContent - The JSON string to sanitize
 * @returns {string} Sanitized JSON string
 */
function sanitizeJsonControlCharacters(jsonContent) {
  if (!jsonContent) return jsonContent

  let result = ''
  let inString = false
  let escapeNext = false

  for (let i = 0; i < jsonContent.length; i++) {
    const char = jsonContent[i]
    const code = char.charCodeAt(0)

    if (escapeNext) {
      result += char
      escapeNext = false
      continue
    }

    if (char === '\\') {
      escapeNext = true
      result += char
      continue
    }

    if (char === '"') {
      inString = !inString
      result += char
      continue
    }

    if (inString) {
      if (code < 0x20) {
        if (code === 0x09) {
          result += '\\t'
        } else if (code === 0x0A) {
          result += '\\n'
        } else if (code === 0x0D) {
          result += '\\r'
        } else {
          result += '\\u' + ('0000' + code.toString(16)).slice(-4)
        }
      } else {
        result += char
      }
    } else {
      result += char
    }
  }

  return result
}

/**
 * Parses JSON with fallback retry logic
 * @param {string} jsonContent - The JSON string to parse
 * @returns {Object|null} Parsed object or null if parsing fails
 */
export function parseJsonWithRetry(jsonContent) {
  if (!jsonContent) return null

  try {
    return JSON.parse(jsonContent)
  } catch (parseError) {
    console.warn("⚠️ Initial JSON parse failed, attempting recovery:", parseError.message)

    // Try sanitizing control characters
    try {
      const sanitized = sanitizeJsonControlCharacters(jsonContent)
      const result = JSON.parse(sanitized)
      console.log("✅ Successfully parsed JSON after sanitizing control characters")
      return result
    } catch (sanitizeError) {
      console.warn("⚠️ Sanitization didn't fix the issue, trying progressive trimming")
    }

    // Try progressive trimming
    for (let i = jsonContent.length; i > 0; i--) {
      try {
        const substr = jsonContent.substring(0, i).trim()
        if (substr.endsWith('}')) {
          const sanitized = sanitizeJsonControlCharacters(substr)
          const result = JSON.parse(sanitized)
          console.log("✅ Successfully extracted valid JSON by trimming extra content")
          return result
        }
      } catch (e) {
        // Continue trying
      }
    }

    console.error("❌ Could not parse JSON even with retry logic")
    return null
  }
}

/**
 * Normalizes generated file content
 * @param {string} str - Content to normalize
 * @returns {string} Normalized content
 */
export function normalizeGeneratedFileContent(str) {
  try {
    if (typeof str !== "string") return str
    let out = str.replace(/\r\n/g, "\n")
    out = out.replace(/[ \t]+$/gm, "")
    out = out.replace(/\n{3,}/g, "\n\n")
    out = out.trim()
    return out
  } catch (_) {
    return str
  }
}

