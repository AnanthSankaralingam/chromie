/**
 * Patch Applier Utilities
 * Handles V4A diff format patch parsing and application
 * Simplified and more robust implementation
 */

/**
 * Checks if the output text contains a valid patch
 * @param {string} outputText - LLM response text
 * @returns {boolean} True if patch markers are found
 */
export function containsPatch(outputText) {
  if (!outputText || typeof outputText !== 'string') {
    return false
  }
  
  const hasBeginMarker = /^\*\*\*\s+Begin\s+Patch\s*$/m.test(outputText)
  const hasEndMarker = /^\*\*\*\s+End\s+Patch\s*$/m.test(outputText)
  
  return hasBeginMarker && hasEndMarker
}

/**
 * Extracts explanation text that appears before the patch
 * @param {string} outputText - LLM response text
 * @returns {string} Explanation text or empty string
 */
export function extractExplanation(outputText) {
  if (!outputText || typeof outputText !== 'string') {
    return ''
  }
  
  const beginMatch = outputText.match(/^\*\*\*\s+Begin\s+Patch\s*$/m)
  if (!beginMatch) {
    return outputText.trim()
  }
  
  const explanation = outputText.substring(0, beginMatch.index).trim()
  return explanation
}

/**
 * Parses a V4A patch format and applies it to existing files
 * @param {Object} existingFiles - Map of file paths to contents
 * @param {string} patchText - Patch text in V4A format
 * @returns {Object} - { success, updatedFiles, deletedFiles, failedFiles, errors }
 */
export function applyAllPatches(existingFiles, patchText) {
  const result = {
    success: true,
    updatedFiles: {},
    deletedFiles: [],
    failedFiles: [],
    errors: []
  }
  
  if (!containsPatch(patchText)) {
    result.success = false
    result.errors.push('No valid patch markers found')
    return result
  }
  
  // Extract patch content between markers
  const beginMatch = patchText.match(/^\*\*\*\s+Begin\s+Patch\s*$/m)
  const endMatch = patchText.match(/^\*\*\*\s+End\s+Patch\s*$/m)
  
  if (!beginMatch || !endMatch || beginMatch.index >= endMatch.index) {
    result.success = false
    result.errors.push('Invalid patch markers')
    return result
  }
  
  const patchContent = patchText.substring(beginMatch.index + beginMatch[0].length, endMatch.index).trim()
  
  // Parse file sections using regex to find all file markers
  const fileMarkerRegex = /^\*\*\*\s+(Add|Update|Delete)\s+File:\s*(.+)$/gm
  const fileMarkers = []
  let match
  while ((match = fileMarkerRegex.exec(patchContent)) !== null) {
    fileMarkers.push({
      action: match[1],
      filePath: match[2].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length
    })
  }
  
  if (fileMarkers.length === 0) {
    result.success = false
    result.errors.push('No file markers found in patch')
    return result
  }
  
  // Process each file section
  for (let i = 0; i < fileMarkers.length; i++) {
    const marker = fileMarkers[i]
    const nextMarker = fileMarkers[i + 1]
    
    // Extract content for this file (from end of marker to start of next marker or end of patch)
    const contentStart = marker.endIndex
    const contentEnd = nextMarker ? nextMarker.startIndex : patchContent.length
    const fileContent = patchContent.substring(contentStart, contentEnd).trim()
    
    // Check if file exists for Update/Delete actions
    if ((marker.action === 'Update' || marker.action === 'Delete') && !existingFiles[marker.filePath]) {
      result.errors.push(`File ${marker.filePath} does not exist in project. Available files: ${Object.keys(existingFiles).join(', ')}`)
      result.success = false
      continue
    }
    
    // Apply patch for this file
    const fileResult = applyFilePatch(
      marker.action,
      marker.filePath,
      fileContent,
      existingFiles[marker.filePath] || ''
    )
    
    if (fileResult.success) {
      if (fileResult.deleted) {
        result.deletedFiles.push(marker.filePath)
      } else if (fileResult.content !== undefined) {
        result.updatedFiles[marker.filePath] = fileResult.content
      }
    } else {
      result.failedFiles.push({
        filePath: marker.filePath,
        action: marker.action,
        error: fileResult.error
      })
      result.errors.push(`Failed to apply patch to ${marker.filePath}: ${fileResult.error}`)
      result.success = false
    }
  }
  
  return result
}

/**
 * Applies a patch to a single file
 * @param {string} action - 'Add', 'Update', or 'Delete'
 * @param {string} filePath - Path to the file
 * @param {string} patchContent - Patch content for this file
 * @param {string} existingContent - Existing file content
 * @returns {Object} - { success, content, deleted, error }
 */
function applyFilePatch(action, filePath, patchContent, existingContent) {
  if (action === 'Delete') {
    return { success: true, deleted: true }
  }
  
  if (action === 'Add') {
    // For Add, extract all lines starting with +
    const lines = patchContent.split('\n')
    const newContent = lines
      .map(line => {
        if (line.startsWith('+')) {
          return line.substring(1)
        }
        return null
      })
      .filter(line => line !== null)
      .join('\n')
    
    const content = newContent.trim()
    
    // Validate JSON files for incomplete content
    if (filePath.toLowerCase().endsWith('.json')) {
      const validation = validateJSONPatch(content)
      if (!validation.valid) {
        return { success: false, error: `Incomplete or invalid JSON patch: ${validation.error}` }
      }
    }
    
    return { success: true, content }
  }
  
  if (action === 'Update') {
    return applyUpdatePatch(patchContent, existingContent, filePath)
  }
  
  return { success: false, error: `Unknown action: ${action}` }
}

/**
 * Validates JSON patch content for common issues like incomplete strings
 */
function validateJSONPatch(content) {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Empty content' }
  }
  
  // Check for incomplete strings (common in truncated patches)
  const incompleteStringPatterns = [
    /"https?:\/\/[^"]*$/,  // Incomplete URL strings
    /"[^"]*$/,              // Unclosed string
    /'[^']*$/,              // Unclosed single-quoted string
  ]
  
  for (const pattern of incompleteStringPatterns) {
    if (pattern.test(content)) {
      return { valid: false, error: 'Patch appears to be truncated (incomplete string detected)' }
    }
  }
  
  return { valid: true }
}

/**
 * Applies an Update patch using simplified context matching
 * @param {string} patchContent - Patch content with context lines and +/- markers
 * @param {string} existingContent - Original file content
 * @param {string} filePath - File path for validation
 * @returns {Object} - { success, content, error }
 */
function applyUpdatePatch(patchContent, existingContent, filePath) {
  const originalLines = existingContent.split('\n')
  const patchLines = patchContent.split('\n')
  
  // Parse patch into hunks (groups of changes)
  const hunks = parsePatchHunks(patchLines)
  
  if (hunks.length === 0) {
    return { success: false, error: 'No valid patch hunks found' }
  }
  
  // Apply hunks in reverse order to maintain line indices
  let resultLines = [...originalLines]
  
  for (const hunk of hunks) {
    const applyResult = applyHunk(resultLines, hunk, filePath)
    
    if (!applyResult.success) {
      return { success: false, error: applyResult.error }
    }
    
    resultLines = applyResult.lines
  }
  
  const content = resultLines.join('\n')
  
  // Validate JSON files after patching
  if (filePath && filePath.toLowerCase().endsWith('.json')) {
    const validation = validateJSONPatch(content)
    if (!validation.valid) {
      return { success: false, error: `Patch resulted in invalid JSON: ${validation.error}` }
    }
  }
  
  return { success: true, content }
}

/**
 * Parses patch lines into hunks (groups of changes with context)
 * Simplified parser that handles common patch formats
 * @param {Array<string>} patchLines - Patch lines
 * @returns {Array<Object>} Array of hunk objects
 */
function parsePatchHunks(patchLines) {
  const hunks = []
  let currentHunk = null
  
  for (let i = 0; i < patchLines.length; i++) {
    const line = patchLines[i]
    
    // Check for @@ marker (function/class context) - optional
    if (line.trim().startsWith('@@')) {
      // Save previous hunk if any
      if (currentHunk && hasChanges(currentHunk)) {
        hunks.push(currentHunk)
      }
      // Start new hunk
      currentHunk = {
        marker: line.trim().substring(2).trim(),
        beforeContext: [],
        deletions: [],
        additions: []
      }
      continue
    }
    
    // Context line (starts with single space)
    if (line.length > 0 && line[0] === ' ' && !line.startsWith('  ')) {
      if (!currentHunk) {
        currentHunk = { beforeContext: [], deletions: [], additions: [] }
      }
      const contextLine = line.substring(1)
      // If we have deletions/additions, this is after context, otherwise before context
      if (currentHunk.deletions.length > 0 || currentHunk.additions.length > 0) {
        // After context - we can ignore it for matching
      } else {
        currentHunk.beforeContext.push(contextLine)
      }
      continue
    }
    
    // Line to delete (starts with -)
    if (line.startsWith('-') && !line.startsWith('--')) {
      if (!currentHunk) {
        currentHunk = { beforeContext: [], deletions: [], additions: [] }
      }
      currentHunk.deletions.push(line.substring(1))
      continue
    }
    
    // Line to add (starts with +)
    if (line.startsWith('+') && !line.startsWith('++')) {
      if (!currentHunk) {
        currentHunk = { beforeContext: [], deletions: [], additions: [] }
      }
      currentHunk.additions.push(line.substring(1))
      continue
    }
    
    // Empty line or unrecognized - continue
  }
  
  // Save last hunk
  if (currentHunk && hasChanges(currentHunk)) {
    hunks.push(currentHunk)
  }
  
  return hunks
}

/**
 * Checks if a hunk has actual changes
 */
function hasChanges(hunk) {
  return hunk.deletions.length > 0 || hunk.additions.length > 0
}

/**
 * Applies a single hunk to the file lines
 * Simplified matching: try context first, then deletions, then append
 * @param {Array<string>} lines - Current file lines
 * @param {Object} hunk - Hunk object with context and changes
 * @param {string} filePath - File path for file-type-specific handling
 * @returns {Object} - { success, lines, error }
 */
function applyHunk(lines, hunk, filePath = '') {
  const isCSS = filePath.toLowerCase().endsWith('.css')
  let insertIndex = -1
  
  // Strategy 1: If we have before context, try to match it
  if (hunk.beforeContext.length > 0) {
    const contextMatch = isCSS 
      ? findContextMatchCSS(lines, hunk.beforeContext)
      : findContextMatch(lines, hunk.beforeContext)
    if (contextMatch >= 0) {
      insertIndex = contextMatch + hunk.beforeContext.length
    }
  }
  
  // Strategy 2: If context matching failed but we have deletions, try to match deletions
  if (insertIndex < 0 && hunk.deletions.length > 0) {
    const deletionMatch = isCSS
      ? findDeletionMatchCSS(lines, hunk.deletions)
      : findDeletionMatch(lines, hunk.deletions)
    if (deletionMatch >= 0) {
      insertIndex = deletionMatch
    }
  }
  
  // Strategy 3: If we have a marker, try to find it
  if (insertIndex < 0 && hunk.marker) {
    const markerIndex = findMarkerInContent(lines, hunk.marker)
    if (markerIndex >= 0) {
      insertIndex = markerIndex + 1
    }
  }
  
  // Strategy 4: For CSS, try to find a CSS selector or rule nearby
  if (insertIndex < 0 && isCSS && hunk.beforeContext.length > 0) {
    const cssMatch = findCSSRuleMatch(lines, hunk.beforeContext, hunk.additions)
    if (cssMatch >= 0) {
      insertIndex = cssMatch
    }
  }
  
  // Strategy 5: If only additions and no way to locate, append at end
  if (insertIndex < 0 && hunk.additions.length > 0 && hunk.deletions.length === 0) {
    insertIndex = lines.length
  }
  
  if (insertIndex < 0) {
    // For CSS files, be more lenient - append at end if we can't find a match
    if (isCSS && hunk.additions.length > 0 && hunk.deletions.length === 0) {
      // This is an addition-only patch for CSS - append at end
      insertIndex = lines.length
      console.log(`⚠️ [patch-applier] CSS patch: Could not find exact match, appending at end of file`)
    } else {
      // Build a helpful error message
      let contextPreview = 'no context'
      if (hunk.beforeContext.length > 0) {
        contextPreview = hunk.beforeContext.slice(0, 2).map(c => {
          const trimmed = c.trim()
          return trimmed.length > 50 ? trimmed.substring(0, 50) + '...' : trimmed
        }).join(' | ')
      } else if (hunk.deletions.length > 0) {
        contextPreview = hunk.deletions.slice(0, 2).map(d => {
          const trimmed = d.trim()
          return trimmed.length > 50 ? trimmed.substring(0, 50) + '...' : trimmed
        }).join(' | ')
      }
      
      // Show sample of actual file content for debugging
      const fileSample = lines.slice(0, Math.min(5, lines.length))
        .map((l, i) => `${i + 1}: ${l.trim().substring(0, 60)}`)
        .join(' | ')
      
      return { 
        success: false, 
        error: `Could not find match location. Looking for: "${contextPreview}". File has ${lines.length} lines. Sample: ${fileSample}` 
      }
    }
  }
  
  // Apply changes
  const resultLines = applyChangesAt(
    lines,
    insertIndex,
    hunk.deletions.length,
    hunk.additions
  )
  
  return { success: true, lines: resultLines }
}

/**
 * Finds a marker (function/class name) in content
 * @param {Array<string>} lines - File lines
 * @param {string} marker - Marker text to find
 * @returns {number} Line index or -1 if not found
 */
function findMarkerInContent(lines, marker) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(marker)) {
      return i
    }
  }
  return -1
}

/**
 * Finds a context match in CSS files with more flexible matching
 * CSS is whitespace-agnostic, so we normalize properties
 * @param {Array<string>} lines - Original file lines
 * @param {Array<string>} context - Context lines to match
 * @returns {number} Line index of match or -1 if not found
 */
function findContextMatchCSS(lines, context) {
  if (context.length === 0) return -1
  
  // Normalize CSS: remove all whitespace around colons, semicolons, braces
  const normalizeCSS = (line) => {
    return line
      .trim()
      .replace(/\s*:\s*/g, ':')
      .replace(/\s*;\s*/g, ';')
      .replace(/\s*{\s*/g, '{')
      .replace(/\s*}\s*/g, '}')
      .replace(/\s+/g, ' ')
  }
  
  const normalizedContext = context.map(normalizeCSS)
  
  // Try normalized match
  for (let i = 0; i <= lines.length - context.length; i++) {
    let match = true
    for (let j = 0; j < context.length; j++) {
      const lineNormalized = normalizeCSS(lines[i + j])
      const contextNormalized = normalizedContext[j]
      
      // Skip empty lines
      if (lineNormalized === '' && contextNormalized === '') {
        continue
      }
      
      if (lineNormalized !== contextNormalized) {
        match = false
        break
      }
    }
    if (match) {
      return i
    }
  }
  
  // Try property-by-property matching for CSS
  // Extract CSS properties from context and try to find them in the file
  const contextProperties = context
    .map(c => {
      const trimmed = c.trim()
      // Extract property:value pairs
      const propMatch = trimmed.match(/([a-z-]+)\s*:\s*([^;]+)/i)
      return propMatch ? propMatch[1].toLowerCase() : null
    })
    .filter(p => p !== null)
  
  if (contextProperties.length > 0) {
    // Try to find lines containing these properties
    for (let i = 0; i < lines.length; i++) {
      const lineNormalized = normalizeCSS(lines[i])
      for (const prop of contextProperties) {
        if (lineNormalized.includes(`${prop}:`)) {
          // Found a property match, try to match surrounding context
          let contextMatch = true
          for (let j = 0; j < context.length && i + j < lines.length; j++) {
            const ctxNormalized = normalizeCSS(context[j])
            const fileNormalized = normalizeCSS(lines[i + j])
            if (ctxNormalized && fileNormalized && !fileNormalized.includes(ctxNormalized.split(':')[0])) {
              contextMatch = false
              break
            }
          }
          if (contextMatch) {
            return i
          }
        }
      }
    }
  }
  
  return -1
}

/**
 * Finds deletion match in CSS files with flexible formatting
 * @param {Array<string>} lines - Original file lines
 * @param {Array<string>} deletions - Lines to delete
 * @returns {number} Line index where deletions start or -1 if not found
 */
function findDeletionMatchCSS(lines, deletions) {
  if (deletions.length === 0) return -1
  
  // Normalize CSS
  const normalizeCSS = (line) => {
    return line
      .trim()
      .replace(/\s*:\s*/g, ':')
      .replace(/\s*;\s*/g, ';')
      .replace(/\s+/g, ' ')
  }
  
  const normalizedDeletions = deletions.map(normalizeCSS)
  
  // Try normalized match
  for (let i = 0; i <= lines.length - deletions.length; i++) {
    let match = true
    for (let j = 0; j < deletions.length; j++) {
      const lineNormalized = normalizeCSS(lines[i + j])
      const deletionNormalized = normalizedDeletions[j]
      
      if (lineNormalized === '' && deletionNormalized === '') {
        continue
      }
      
      if (lineNormalized !== deletionNormalized) {
        match = false
        break
      }
    }
    if (match) {
      return i
    }
  }
  
  return -1
}

/**
 * Finds a CSS rule match - tries to find where CSS properties should be inserted
 * by looking for CSS selectors or similar properties
 * @param {Array<string>} lines - File lines
 * @param {Array<string>} context - Context lines
 * @param {Array<string>} additions - Lines to add
 * @returns {number} Line index or -1 if not found
 */
function findCSSRuleMatch(lines, context, additions) {
  // Extract CSS selectors from additions (look for lines with { or : that aren't properties)
  const selectors = additions
    .map(a => a.trim())
    .filter(a => a && (a.includes('{') || (a.includes(':') && !a.includes(';'))))
    .map(a => a.split('{')[0].split(':')[0].trim())
    .filter(s => s && !s.startsWith('/*'))
  
  // Try to find these selectors in the file
  for (const selector of selectors) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.includes(selector) && (line.includes('{') || i + 1 < lines.length && lines[i + 1].trim().startsWith('{'))) {
        // Found the selector, find the opening brace
        let braceIndex = i
        if (!line.includes('{')) {
          braceIndex = i + 1
        }
        // Find the closing brace or a good insertion point
        let depth = 0
        for (let j = braceIndex; j < lines.length; j++) {
          const l = lines[j]
          depth += (l.match(/{/g) || []).length
          depth -= (l.match(/}/g) || []).length
          if (depth === 0 && l.trim().startsWith('}')) {
            return j
          }
          if (depth === 1 && j > braceIndex) {
            // Inside the rule, good place to insert
            return j
          }
        }
        return braceIndex + 1
      }
    }
  }
  
  // If we can't find a selector, try to find similar properties
  const contextProps = context
    .map(c => c.trim().match(/([a-z-]+)\s*:/i)?.[1]?.toLowerCase())
    .filter(p => p)
  
  if (contextProps.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toLowerCase()
      for (const prop of contextProps) {
        if (line.includes(`${prop}:`)) {
          // Found a similar property, insert nearby
          return i + 1
        }
      }
    }
  }
  
  return -1
}

/**
 * Finds a context match in the original content
 * Uses flexible matching that handles whitespace differences
 * @param {Array<string>} lines - Original file lines
 * @param {Array<string>} context - Context lines to match
 * @returns {number} Line index of match or -1 if not found
 */
function findContextMatch(lines, context) {
  if (context.length === 0) return -1
  
  // Normalize context lines (trim both ends for flexible matching)
  const normalizedContext = context.map(c => c.trim())
  
  // Strategy 1: Exact match (including whitespace)
  for (let i = 0; i <= lines.length - context.length; i++) {
    let match = true
    for (let j = 0; j < context.length; j++) {
      if (lines[i + j] !== context[j]) {
        match = false
        break
      }
    }
    if (match) {
      return i
    }
  }
  
  // Strategy 2: Match with normalized trailing whitespace
  const contextTrimEnd = context.map(c => c.trimEnd())
  for (let i = 0; i <= lines.length - context.length; i++) {
    let match = true
    for (let j = 0; j < context.length; j++) {
      if (lines[i + j].trimEnd() !== contextTrimEnd[j]) {
        match = false
        break
      }
    }
    if (match) {
      return i
    }
  }
  
  // Strategy 3: Match trimmed content (allows indentation differences)
  // This is the most flexible - ignores leading/trailing whitespace
  for (let i = 0; i <= lines.length - context.length; i++) {
    let match = true
    for (let j = 0; j < context.length; j++) {
      const lineTrimmed = lines[i + j].trim()
      const contextTrimmed = normalizedContext[j]
      
      // Skip empty lines in both
      if (lineTrimmed === '' && contextTrimmed === '') {
        continue
      }
      
      if (lineTrimmed !== contextTrimmed) {
        match = false
        break
      }
    }
    if (match) {
      return i
    }
  }
  
  // Strategy 4: Partial match - if context has only one line, try substring matching
  // This handles cases where the context line might be part of a longer line
  if (context.length === 1 && normalizedContext[0]) {
    const searchText = normalizedContext[0]
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().includes(searchText) || lines[i].includes(searchText)) {
        return i
      }
    }
  }
  
  return -1
}

/**
 * Finds deletion lines in the original content
 * Uses flexible matching that handles whitespace differences
 * @param {Array<string>} lines - Original file lines
 * @param {Array<string>} deletions - Lines to delete
 * @returns {number} Line index where deletions start or -1 if not found
 */
function findDeletionMatch(lines, deletions) {
  if (deletions.length === 0) return -1
  
  // Normalize deletion lines
  const normalizedDeletions = deletions.map(d => d.trim())
  
  // Strategy 1: Exact match
  for (let i = 0; i <= lines.length - deletions.length; i++) {
    let match = true
    for (let j = 0; j < deletions.length; j++) {
      if (lines[i + j] !== deletions[j]) {
        match = false
        break
      }
    }
    if (match) {
      return i
    }
  }
  
  // Strategy 2: Match with normalized trailing whitespace
  const deletionsTrimEnd = deletions.map(d => d.trimEnd())
  for (let i = 0; i <= lines.length - deletions.length; i++) {
    let match = true
    for (let j = 0; j < deletions.length; j++) {
      if (lines[i + j].trimEnd() !== deletionsTrimEnd[j]) {
        match = false
        break
      }
    }
    if (match) {
      return i
    }
  }
  
  // Strategy 3: Match trimmed content (allows indentation differences)
  for (let i = 0; i <= lines.length - deletions.length; i++) {
    let match = true
    for (let j = 0; j < deletions.length; j++) {
      const lineTrimmed = lines[i + j].trim()
      const deletionTrimmed = normalizedDeletions[j]
      
      // Skip empty lines in both
      if (lineTrimmed === '' && deletionTrimmed === '') {
        continue
      }
      
      if (lineTrimmed !== deletionTrimmed) {
        match = false
        break
      }
    }
    if (match) {
      return i
    }
  }
  
  return -1
}

/**
 * Applies deletions and additions at a specific index
 * @param {Array<string>} lines - Current file lines
 * @param {number} index - Index to apply changes
 * @param {number} deleteCount - Number of lines to delete
 * @param {Array<string>} additions - Lines to add
 * @returns {Array<string>} Modified lines
 */
function applyChangesAt(lines, index, deleteCount, additions) {
  const result = [...lines]
  
  // Delete lines
  if (deleteCount > 0 && index < result.length) {
    result.splice(index, deleteCount)
  }
  
  // Add new lines
  if (additions.length > 0) {
    result.splice(index, 0, ...additions)
  }
  
  return result
}
