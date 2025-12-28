/**
 * V4A Patch Applier Utility
 * Parses V4A diff format and applies patches to file contents
 * 
 * V4A format structure:
 * *** Begin Patch
 * *** Add File: path/to/file.js
 * +line1
 * +line2
 * *** Update File: path/to/existing.js
 *  context line (space prefix)
 * -removed line
 * +added line
 *  context line
 * *** Delete File: path/to/old.js
 * *** End Patch
 */

/**
 * Extracts the patch content between Begin Patch and End Patch markers
 * @param {string} text - Full LLM response text
 * @returns {string|null} - Patch content or null if not found
 */
export function extractPatchBlock(text) {
    if (!text || typeof text !== 'string') return null
    
    const beginMarker = '*** Begin Patch'
    const endMarker = '*** End Patch'
    
    const beginIndex = text.indexOf(beginMarker)
    if (beginIndex === -1) return null
    
    const endIndex = text.indexOf(endMarker, beginIndex)
    if (endIndex === -1) return null
    
    // Extract content between markers (excluding the markers themselves)
    return text.substring(beginIndex + beginMarker.length, endIndex).trim()
  }
  
  /**
   * Checks if a response contains a V4A patch
   * @param {string} text - LLM response text
   * @returns {boolean} - True if the response contains a patch
   */
  export function containsPatch(text) {
    if (!text || typeof text !== 'string') return false
    return text.includes('*** Begin Patch') && text.includes('*** End Patch')
  }
  
  /**
   * Parses a V4A patch into structured file operations
   * @param {string} patchText - The patch content (between Begin/End markers)
   * @returns {Array<Object>} - Array of file operations with action, path, and content/hunks
   */
  export function parsePatch(patchText) {
    if (!patchText) return []
    
    const operations = []
    const lines = patchText.split('\n')
    
    let currentOperation = null
    let currentLines = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check for file operation markers
      const addMatch = line.match(/^\*\*\*\s*Add\s+File:\s*(.+)$/i)
      const updateMatch = line.match(/^\*\*\*\s*Update\s+File:\s*(.+)$/i)
      const deleteMatch = line.match(/^\*\*\*\s*Delete\s+File:\s*(.+)$/i)
      
      if (addMatch || updateMatch || deleteMatch) {
        // Save previous operation if exists
        if (currentOperation) {
          currentOperation.lines = currentLines
          operations.push(currentOperation)
        }
        
        // Start new operation
        if (addMatch) {
          currentOperation = { action: 'add', path: addMatch[1].trim(), lines: [] }
        } else if (updateMatch) {
          currentOperation = { action: 'update', path: updateMatch[1].trim(), lines: [] }
        } else if (deleteMatch) {
          currentOperation = { action: 'delete', path: deleteMatch[1].trim(), lines: [] }
        }
        currentLines = []
      } else if (currentOperation) {
        // Collect lines for current operation
        currentLines.push(line)
      }
    }
    
    // Don't forget the last operation
    if (currentOperation) {
      currentOperation.lines = currentLines
      operations.push(currentOperation)
    }
    
    return operations
  }
  
  /**
   * Parses update hunks from operation lines
   * Handles context lines (space prefix), additions (+), and removals (-)
   * @param {Array<string>} lines - Lines from the update operation
   * @returns {Array<Object>} - Array of hunks with context, removals, and additions
   */
  export function parseUpdateHunks(lines) {
    const hunks = []
    let currentHunk = { contextBefore: [], removals: [], additions: [], contextAfter: [], functionMarker: null }
    let phase = 'context_before' // context_before -> changes -> context_after
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check for @@ function/class markers
      if (line.startsWith('@@')) {
        // Save current hunk if it has content
        if (currentHunk.removals.length > 0 || currentHunk.additions.length > 0) {
          hunks.push(currentHunk)
        }
        currentHunk = { contextBefore: [], removals: [], additions: [], contextAfter: [], functionMarker: line.substring(2).trim() }
        phase = 'context_before'
        continue
      }
      
      // Determine line type based on first character
      const firstChar = line[0]
      const content = line.substring(1) // Remove the prefix character
      
      if (firstChar === '-') {
        // This is a removal - we're now in changes phase
        if (phase === 'context_after') {
          // Start a new hunk
          hunks.push(currentHunk)
          currentHunk = { contextBefore: [], removals: [], additions: [], contextAfter: [], functionMarker: null }
        }
        phase = 'changes'
        currentHunk.removals.push(content)
      } else if (firstChar === '+') {
        // This is an addition - we're now in changes phase
        if (phase === 'context_after') {
          // Start a new hunk
          hunks.push(currentHunk)
          currentHunk = { contextBefore: [], removals: [], additions: [], contextAfter: [], functionMarker: null }
        }
        phase = 'changes'
        currentHunk.additions.push(content)
      } else if (firstChar === ' ' || (firstChar !== '-' && firstChar !== '+' && line.trim() !== '')) {
        // Context line (space prefix) or unmarked line
        const contextContent = firstChar === ' ' ? content : line
        
        if (phase === 'context_before') {
          currentHunk.contextBefore.push(contextContent)
        } else if (phase === 'changes') {
          // We've moved to context_after
          phase = 'context_after'
          currentHunk.contextAfter.push(contextContent)
        } else if (phase === 'context_after') {
          currentHunk.contextAfter.push(contextContent)
        }
      }
      // Skip empty lines that aren't part of the diff
    }
    
    // Add the last hunk if it has content
    if (currentHunk.removals.length > 0 || currentHunk.additions.length > 0 || currentHunk.contextBefore.length > 0) {
      hunks.push(currentHunk)
    }
    
    return hunks
  }
  
  /**
   * Finds the position in the original content where a hunk should be applied
   * Uses context lines to locate the exact position
   * @param {Array<string>} originalLines - Original file lines
   * @param {Object} hunk - The hunk to locate
   * @returns {number} - Line index where the hunk starts, or -1 if not found
   */
  function findHunkPosition(originalLines, hunk) {
    const searchLines = [...hunk.contextBefore, ...hunk.removals]
    
    if (searchLines.length === 0) {
      // No context or removals - can't locate precisely
      // Try to find based on function marker if present
      if (hunk.functionMarker) {
        for (let i = 0; i < originalLines.length; i++) {
          if (originalLines[i].includes(hunk.functionMarker)) {
            return i
          }
        }
      }
      return -1
    }
    
    // Search for the context pattern in the original file
    for (let i = 0; i <= originalLines.length - searchLines.length; i++) {
      let match = true
      for (let j = 0; j < searchLines.length; j++) {
        // Normalize whitespace for comparison
        const originalTrimmed = originalLines[i + j].trim()
        const searchTrimmed = searchLines[j].trim()
        
        if (originalTrimmed !== searchTrimmed) {
          match = false
          break
        }
      }
      if (match) {
        return i
      }
    }
    
    // Try fuzzy matching if exact match fails - look for removals only
    if (hunk.removals.length > 0) {
      for (let i = 0; i <= originalLines.length - hunk.removals.length; i++) {
        let match = true
        for (let j = 0; j < hunk.removals.length; j++) {
          const originalTrimmed = originalLines[i + j].trim()
          const removalTrimmed = hunk.removals[j].trim()
          
          if (originalTrimmed !== removalTrimmed) {
            match = false
            break
          }
        }
        if (match) {
          // Account for context lines before
          return Math.max(0, i - hunk.contextBefore.length)
        }
      }
    }
    
    return -1
  }
  
  /**
   * Applies hunks to file content
   * @param {string} originalContent - Original file content
   * @param {Array<Object>} hunks - Parsed hunks to apply
   * @returns {Object} - { success: boolean, content: string, skippedHunks: number, failedHunks: Array, error?: string }
   */
  export function applyHunks(originalContent, hunks) {
    if (!hunks || hunks.length === 0) {
      return { success: true, content: originalContent, skippedHunks: 0, failedHunks: [] }
    }
    
    let lines = originalContent.split('\n')
    
    // Apply hunks in reverse order to preserve line numbers
    const hunksWithPositions = [...hunks].map((hunk, index) => {
      const position = findHunkPosition(lines, hunk)
      return { ...hunk, position, originalIndex: index }
    })
    
    const sortedHunks = hunksWithPositions
      .filter(h => h.position !== -1)
      .sort((a, b) => b.position - a.position)
    
    const failedHunks = hunksWithPositions.filter(h => h.position === -1)
    const skippedHunks = failedHunks.length
    
    for (const hunk of sortedHunks) {
      const startPos = hunk.position + hunk.contextBefore.length
      const removeCount = hunk.removals.length
      
      // Remove the old lines and insert new ones
      lines.splice(startPos, removeCount, ...hunk.additions)
    }
    
    return { 
      success: true, 
      content: lines.join('\n'), 
      skippedHunks,
      failedHunks: failedHunks.map(h => ({
        contextBefore: h.contextBefore,
        removals: h.removals,
        additions: h.additions,
        contextAfter: h.contextAfter,
        functionMarker: h.functionMarker
      }))
    }
  }
  
  /**
   * Applies a single file operation
   * @param {Object} operation - The file operation
   * @param {Object} existingFiles - Map of existing file paths to contents
   * @returns {Object} - { path, content, action, success, error? }
   */
  export function applyFileOperation(operation, existingFiles) {
    const { action, path, lines } = operation
    
    switch (action) {
      case 'add': {
        // New file - extract content from + prefixed lines
        const content = lines
          .filter(line => line.startsWith('+'))
          .map(line => line.substring(1))
          .join('\n')
        
        return { path, content, action: 'add', success: true }
      }
      
      case 'update': {
        const originalContent = existingFiles[path]
        if (originalContent === undefined) {
          return { path, content: null, action: 'update', success: false, error: `File not found: ${path}` }
        }
        
        const hunks = parseUpdateHunks(lines)
        const result = applyHunks(originalContent, hunks)
        
        // Log warning if some hunks were skipped
        if (result.skippedHunks > 0) {
          console.warn(`⚠️ [patch-applier] ${path}: Could not locate ${result.skippedHunks} hunk(s) - context lines didn't match. Applied ${hunks.length - result.skippedHunks}/${hunks.length} hunks.`)
          
          // Log details of each failed hunk
          result.failedHunks.forEach((hunk, index) => {
            console.warn(`   Failed hunk ${index + 1}:`)
            if (hunk.functionMarker) {
              console.warn(`     @@ ${hunk.functionMarker}`)
            }
            if (hunk.contextBefore.length > 0) {
              console.warn(`     Context before (${hunk.contextBefore.length} lines):`)
              hunk.contextBefore.forEach(line => console.warn(`       ${line}`))
            }
            if (hunk.removals.length > 0) {
              console.warn(`     Trying to remove (${hunk.removals.length} lines):`)
              hunk.removals.forEach(line => console.warn(`      -${line}`))
            }
            if (hunk.additions.length > 0) {
              console.warn(`     Trying to add (${hunk.additions.length} lines):`)
              hunk.additions.forEach(line => console.warn(`      +${line}`))
            }
            if (hunk.contextAfter.length > 0) {
              console.warn(`     Context after (${hunk.contextAfter.length} lines):`)
              hunk.contextAfter.forEach(line => console.warn(`       ${line}`))
            }
          })
        }
        
        return { path, content: result.content, action: 'update', success: result.success, error: result.error }
      }
      
      case 'delete': {
        return { path, content: null, action: 'delete', success: true }
      }
      
      default:
        return { path, content: null, action, success: false, error: `Unknown action: ${action}` }
    }
  }
  
  /**
   * Applies all patches from V4A diff text to existing files
   * @param {Object} existingFiles - Map of file paths to contents
   * @param {string} patchText - Full LLM response containing the patch
   * @returns {Object} - { success, updatedFiles, deletedFiles, errors, explanation }
   */
  export function applyAllPatches(existingFiles, patchText) {
    const result = {
      success: true,
      updatedFiles: {},
      deletedFiles: [],
      errors: [],
      explanation: ''
    }
    
    // Extract explanation (text before *** Begin Patch)
    const beginMarker = '*** Begin Patch'
    const beginIndex = patchText.indexOf(beginMarker)
    if (beginIndex > 0) {
      result.explanation = patchText.substring(0, beginIndex).trim()
    }
    
    // Extract and parse the patch block
    const patchBlock = extractPatchBlock(patchText)
    if (!patchBlock) {
      result.success = false
      result.errors.push('No valid patch block found in response')
      return result
    }
    
    const operations = parsePatch(patchBlock)
    console.log(`📝 [patch-applier] Parsed ${operations.length} file operations`)
    
    for (const operation of operations) {
      const opResult = applyFileOperation(operation, existingFiles)
      
      if (opResult.success) {
        if (opResult.action === 'delete') {
          result.deletedFiles.push(opResult.path)
          console.log(`🗑️ [patch-applier] Marked for deletion: ${opResult.path}`)
        } else {
          result.updatedFiles[opResult.path] = opResult.content
          console.log(`✅ [patch-applier] Applied ${opResult.action} to: ${opResult.path}`)
        }
      } else {
        result.success = false
        result.errors.push(`${opResult.path}: ${opResult.error}`)
        console.error(`❌ [patch-applier] Failed to apply ${opResult.action} to ${opResult.path}: ${opResult.error}`)
      }
    }
    
    return result
  }
  
  /**
   * Extracts the explanation text from a patch response
   * @param {string} patchText - Full LLM response
   * @returns {string} - Explanation text before the patch block
   */
  export function extractExplanation(patchText) {
    if (!patchText) return ''
    
    const beginMarker = '*** Begin Patch'
    const beginIndex = patchText.indexOf(beginMarker)
    
    if (beginIndex > 0) {
      return patchText.substring(0, beginIndex).trim()
    }
    
    return ''
  }