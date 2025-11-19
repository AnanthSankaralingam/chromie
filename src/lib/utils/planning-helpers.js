/**
 * Planning helper utilities
 * Reusable functions for planning phase error recovery and fallback detection
 */

/**
 * Fallback website detection - scans user prompt for common website names
 * This runs AFTER the AI planning to catch any missed detections
 * @param {string} userPrompt - Original user request
 * @param {Array} existingWebPageData - Websites already detected by AI
 * @returns {Array} Updated webPageData with any missed websites
 */
export function detectWebsitesInPrompt(userPrompt, existingWebPageData = []) {
  const prompt = userPrompt.toLowerCase()

  // Common website mappings (name -> domain)
  const websiteMap = {
    'youtube': 'youtube.com',
    'x.com': 'x.com',
    'reddit': 'reddit.com',
    'github': 'github.com',
    'amazon': 'amazon.com',
    'linkedin': 'linkedin.com',
    'instagram': 'instagram.com',
    'facebook': 'facebook.com',
    'tiktok': 'tiktok.com',
    'netflix': 'netflix.com',
    'spotify': 'spotify.com',
    'pinterest': 'pinterest.com',
    'ebay': 'ebay.com',
    'wikipedia': 'wikipedia.org',
    'google': 'google.com',
    'gmail': 'mail.google.com',
    'stackoverflow': 'stackoverflow.com',
    'medium': 'medium.com',
    'twitch': 'twitch.tv',
    'discord': 'discord.com',
    'slack': 'slack.com',
    'notion': 'notion.so',
    'figma': 'figma.com',
    'canva': 'canva.com',
    'dropbox': 'dropbox.com',
    'trello': 'trello.com',
    'asana': 'asana.com',
    'zoom': 'zoom.us'
  }

  const detectedWebsites = new Set(existingWebPageData)

  // Check for each website name in the prompt
  for (const [name, domain] of Object.entries(websiteMap)) {
    // Match word boundaries to avoid false positives
    const regex = new RegExp(`\\b${name}\\b`, 'i')
    if (regex.test(prompt)) {
      detectedWebsites.add(domain)
      console.log(`🔍 [Fallback Detection] Found "${name}" in prompt → adding ${domain}`)
    }
  }

  // Also check for direct domain mentions (e.g., "example.com")
  const domainRegex = /\b([a-z0-9-]+\.[a-z]{2,})\b/gi
  const domainMatches = prompt.match(domainRegex)
  if (domainMatches) {
    domainMatches.forEach(domain => {
      detectedWebsites.add(domain.toLowerCase())
      console.log(`🔍 [Fallback Detection] Found domain in prompt → adding ${domain}`)
    })
  }

  return Array.from(detectedWebsites)
}

/**
 * Manually extract JSON fields when parsing fails (fallback)
 * Attempts to extract JSON structure by finding object boundaries
 * @param {string} content - Raw content to extract from
 * @returns {Object} Extracted JSON object
 */
export function extractJsonFieldsManually(content) {
  console.warn('⚠️ [Planning Helpers] Using manual JSON extraction fallback')

  // Try to find JSON object boundaries
  const jsonStart = content.indexOf('{')
  if (jsonStart === -1) {
    throw new Error('No JSON object found in response')
  }

  let braceCount = 0
  let jsonEnd = jsonStart
  let inString = false
  let escapeNext = false

  for (let i = jsonStart; i < content.length; i++) {
    const char = content[i]

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

  const jsonContent = content.substring(jsonStart, jsonEnd).trim()
  return JSON.parse(jsonContent)
}
