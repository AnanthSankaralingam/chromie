/**
 * Patch Processing Utilities
 * Handles V4A patch application, validation, and fallback logic
 */

import { llmService } from "../services/llm-service"
import { containsPatch, applyAllPatches, extractExplanation } from "../utils/patch-applier"
import { validateFiles } from "../utils/eslint-validator"

/**
 * Processes patch output and applies patches to existing files
 * @param {string} outputText - LLM response text containing patch
 * @param {Object} existingFiles - Map of existing file paths to contents
 * @returns {Object} - { success, updatedFiles, deletedFiles, explanation, errors }
 */
export function processPatchOutput(outputText, existingFiles) {
  console.log('🔧 [patch-processing] Processing patch output...')
  
  if (!containsPatch(outputText)) {
    console.log('⚠️ [patch-processing] No patch detected in output')
    return { 
      success: false, 
      updatedFiles: {},
      failedFiles: [],
      deletedFiles: [],
      errors: ['No valid patch found in LLM response'] 
    }
  }
  
  // Log the patch content for debugging
  const beginMatch = outputText.match(/^\*\*\*\s+Begin\s+Patch\s*$/m)
  const endMatch = outputText.match(/^\*\*\*\s+End\s+Patch\s*$/m)
  if (beginMatch && endMatch) {
    const patchContent = outputText.substring(beginMatch.index, endMatch.index + endMatch[0].length)
    console.log('📋 [patch-processing] Patch content:', patchContent.substring(0, 500) + (patchContent.length > 500 ? '...' : ''))
  }
  
  const patchResult = applyAllPatches(existingFiles, outputText)
  
  // Ensure all required fields exist
  if (!patchResult.updatedFiles) patchResult.updatedFiles = {}
  if (!patchResult.failedFiles) patchResult.failedFiles = []
  if (!patchResult.deletedFiles) patchResult.deletedFiles = []
  if (!patchResult.errors) patchResult.errors = []
  
  if (patchResult.success) {
    console.log(`✅ [patch-processing] Successfully applied patches to ${Object.keys(patchResult.updatedFiles).length} files`)
    if (patchResult.deletedFiles.length > 0) {
      console.log(`🗑️ [patch-processing] Marked ${patchResult.deletedFiles.length} files for deletion`)
    }
  } else {
    console.log(`❌ [patch-processing] Patch application had errors:`, patchResult.errors)
  }
  
  return patchResult
}

/**
 * Validates patched files and identifies failures
 * @param {Object} patchedFiles - Map of file paths to patched contents
 * @returns {Object} - { allValid, validFiles, failedFiles, validationResults }
 */
export function validatePatchedFiles(patchedFiles) {
  console.log('🔍 [validation] Validating patched files (JavaScript with ESLint, JSON with parser)...')
  
  const validationResult = validateFiles(patchedFiles)
  
  const validFiles = {}
  for (const [filePath, content] of Object.entries(patchedFiles)) {
    const result = validationResult.results[filePath]
    if (result?.valid || result?.skipped) {
      validFiles[filePath] = content
    }
  }
  
  if (validationResult.allValid) {
    console.log('✅ [validation] All patched files passed validation')
  } else {
    console.log(`⚠️ [validation] ${validationResult.failedFiles.length} files failed validation:`, validationResult.failedFiles)
  }
  
  return {
    allValid: validationResult.allValid,
    validFiles,
    failedFiles: validationResult.failedFiles,
    validationResults: validationResult.results
  }
}

/**
 * Creates a single-file replacement prompt for fallback
 * @param {string} filePath - Path of the file to regenerate
 * @param {string} originalContent - Original file content
 * @param {string} userRequest - Original user request
 * @param {Object} allExistingFiles - All existing files for context
 * @param {Array} validationErrors - Validation errors (ESLint for JS, JSON parse for JSON) that caused the fallback
 * @returns {string} - Prompt for regenerating the single file
 */
function createSingleFileReplacementPrompt(filePath, originalContent, userRequest, allExistingFiles, validationErrors) {
  const errorContext = validationErrors
    .map(err => `Line ${err.line}, Col ${err.column}: ${err.message}`)
    .join('\n')
  
  const contextFiles = Object.entries(allExistingFiles)
    .filter(([path]) => path !== filePath)
    .slice(0, 3)
    .map(([path, content]) => `<file path="${path}">\n${content}\n</file>`)
    .join('\n\n')
  
  const isJSON = filePath.toLowerCase().endsWith('.json')
  const fileType = isJSON ? 'JSON' : 'JavaScript'
  
  return `You are a Chrome extension developer. A patch was applied to the following file but resulted in syntax errors.

<original_request>
${userRequest}
</original_request>

<target_file path="${filePath}">
${originalContent}
</target_file>

<syntax_errors>
${errorContext}
</syntax_errors>

${contextFiles ? `<context_files>\n${contextFiles}\n</context_files>` : ''}

Please provide the COMPLETE corrected content for ${filePath} that:
1. Implements the original request
2. Fixes all syntax errors
3. Is syntactically valid ${fileType}

Return ONLY the file content, no explanations or markdown code blocks.`
}

/**
 * Creates a single-file replacement prompt for application failures
 * @param {string} filePath - Path of the file that failed to apply
 * @param {string} originalContent - Original file content
 * @param {string} userRequest - Original user request
 * @param {Object} allExistingFiles - All existing files for context
 * @param {string} applicationError - Error message from patch application
 * @param {string} action - The action that was attempted (Add, Update, Delete)
 * @returns {string} - Prompt for regenerating the single file
 */
function createApplicationFailurePrompt(filePath, originalContent, userRequest, allExistingFiles, applicationError, action) {
  const contextFiles = Object.entries(allExistingFiles)
    .filter(([path]) => path !== filePath)
    .slice(0, 3)
    .map(([path, content]) => `<file path="${path}">\n${content}\n</file>`)
    .join('\n\n')
  
  const fileExt = filePath.split('.').pop()?.toLowerCase() || ''
  const isJSON = fileExt === 'json'
  const isHTML = fileExt === 'html' || fileExt === 'htm'
  const isCSS = fileExt === 'css'
  const fileType = isJSON ? 'JSON' : isHTML ? 'HTML' : isCSS ? 'CSS' : 'JavaScript'
  
  const actionDescription = action === 'Add' ? 'create' : action === 'Update' ? 'update' : 'delete'
  
  return `You are a Chrome extension developer. A patch was attempted to ${actionDescription} the following file but failed to apply.

<original_request>
${userRequest}
</original_request>

<target_file path="${filePath}">
${originalContent}
</target_file>

<application_error>
${applicationError}
</application_error>

${contextFiles ? `<context_files>\n${contextFiles}\n</context_files>` : ''}

Please provide the COMPLETE corrected content for ${filePath} that:
1. Implements the original request: ${userRequest}
2. ${action === 'Add' ? 'Creates a new file with' : action === 'Update' ? 'Updates the file with' : 'This should not happen for Delete actions'}
3. Is syntactically valid ${fileType}

Return ONLY the file content, no explanations or markdown code blocks.`
}

/**
 * Handles per-file fallback for files that failed ESLint validation
 * @param {Array} failedFiles - List of file paths that failed validation
 * @param {Object} existingFiles - Original file contents
 * @param {Object} validationResults - Validation results with error details
 * @param {string} userRequest - Original user request
 * @param {string} provider - LLM provider
 * @param {string} model - Model to use
 * @returns {AsyncGenerator} Yields progress and returns regenerated files
 */
async function* handlePerFileFallback(failedFiles, existingFiles, validationResults, userRequest, provider, model) {
  const regeneratedFiles = {}
  
  for (const filePath of failedFiles) {
    console.log(`🔄 [fallback] Regenerating ${filePath} due to validation failure...`)
    yield { type: "phase", phase: "implementing", content: `Fixing syntax errors in ${filePath}...` }
    
    const originalContent = existingFiles[filePath] || ''
    const errors = validationResults[filePath]?.errors || []
    
    const fallbackPrompt = createSingleFileReplacementPrompt(
      filePath,
      originalContent,
      userRequest,
      existingFiles,
      errors
    )
    
    try {
      const response = await llmService.createResponse({
        provider,
        model,
        input: fallbackPrompt,
        temperature: 0.2,
        max_output_tokens: 16000
      })
      
      let regeneratedContent = response?.output_text || ''
      
      // Clean up the response
      regeneratedContent = regeneratedContent
        .replace(/^```(?:javascript|json|js|html|css)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      
      regeneratedFiles[filePath] = regeneratedContent
      console.log(`✅ [fallback] Successfully regenerated ${filePath}`)
    } catch (error) {
      console.error(`❌ [fallback] Failed to regenerate ${filePath}:`, error.message)
      regeneratedFiles[filePath] = originalContent
    }
  }
  
  return regeneratedFiles
}

/**
 * Handles per-file fallback for files that failed to apply patches
 * @param {Array} failedFiles - List of file failure objects with { filePath, action, error }
 * @param {Object} existingFiles - Original file contents
 * @param {string} userRequest - Original user request
 * @param {string} provider - LLM provider
 * @param {string} model - Model to use
 * @returns {AsyncGenerator} Yields progress and returns regenerated files
 */
async function* handleApplicationFailureFallback(failedFiles, existingFiles, userRequest, provider, model) {
  const regeneratedFiles = {}
  
  for (const failure of failedFiles) {
    const { filePath, action, error } = failure
    
    // Skip Delete actions - we can't regenerate a file that should be deleted
    if (action === 'Delete') {
      console.log(`⚠️ [fallback] Skipping ${filePath} - Delete action cannot be regenerated`)
      continue
    }
    
    console.log(`🔄 [fallback] Regenerating ${filePath} due to patch application failure...`)
    yield { type: "phase", phase: "implementing", content: `Regenerating ${filePath} (patch failed to apply)...` }
    
    const originalContent = existingFiles[filePath] || ''
    
    const fallbackPrompt = createApplicationFailurePrompt(
      filePath,
      originalContent,
      userRequest,
      existingFiles,
      error,
      action
    )
    
    try {
      const response = await llmService.createResponse({
        provider,
        model,
        input: fallbackPrompt,
        temperature: 0.2,
        max_output_tokens: 16000
      })
      
      let regeneratedContent = response?.output_text || ''
      
      // Clean up the response - handle various file types
      const fileExt = filePath.split('.').pop()?.toLowerCase() || ''
      const codeBlockPattern = fileExt === 'json' ? 'json' : 
                               fileExt === 'html' || fileExt === 'htm' ? 'html' :
                               fileExt === 'css' ? 'css' : 'javascript'
      
      regeneratedContent = regeneratedContent
        .replace(new RegExp(`^\\\`\\\`\\\`(?:${codeBlockPattern}|${fileExt})?\\s*`, 'i'), '')
        .replace(/\s*```$/i, '')
        .trim()
      
      regeneratedFiles[filePath] = regeneratedContent
      console.log(`✅ [fallback] Successfully regenerated ${filePath}`)
    } catch (error) {
      console.error(`❌ [fallback] Failed to regenerate ${filePath}:`, error.message)
      // Keep original content if regeneration fails
      regeneratedFiles[filePath] = originalContent
    }
  }
  
  return regeneratedFiles
}

/**
 * Processes patch mode output: applies patches, validates, handles fallback
 * @param {string} outputText - LLM response text containing patch
 * @param {Object} existingFiles - Original file contents
 * @param {string} userRequest - Original user request
 * @param {string} provider - LLM provider
 * @param {string} model - Model to use
 * @returns {AsyncGenerator} Yields progress events and final result
 */
export async function* processPatchModeOutput(outputText, existingFiles, userRequest, provider, model) {
  console.log('🔧 [patch-mode] Processing patch output...')
  
  // Step 1: Apply patches
  const patchResult = processPatchOutput(outputText, existingFiles)
  
  // Ensure updatedFiles exists
  const updatedFiles = patchResult.updatedFiles || {}
  const failedFiles = patchResult.failedFiles || []
  const deletedFiles = patchResult.deletedFiles || []
  const errors = patchResult.errors || []
  
  if (!patchResult.success && Object.keys(updatedFiles).length === 0) {
    console.log('❌ [patch-mode] Patch application failed completely')
    yield { type: "patch_failed", content: "Patch application failed" }
    yield { 
      success: false, 
      files: {}, 
      deletedFiles: deletedFiles,
      explanation: patchResult.explanation || extractExplanation(outputText), 
      errors: errors 
    }
    return
  }
  
  yield { type: "phase", phase: "implementing", content: `Applied patches to ${Object.keys(updatedFiles).length} files` }
  
  // Step 1.5: Handle files that failed to apply patches
  let finalFiles = { ...updatedFiles }
  
  if (failedFiles.length > 0) {
    console.log(`⚠️ [patch-mode] ${failedFiles.length} files failed to apply patches, attempting fallback regeneration`)
    yield { type: "phase", phase: "implementing", content: `Regenerating ${failedFiles.length} files that failed to apply...` }
    
    const applicationFallbackGen = handleApplicationFailureFallback(
      failedFiles,
      existingFiles,
      userRequest,
      provider,
      model
    )
    
    let applicationFallbackResult
    for await (const event of applicationFallbackGen) {
      if (event.type) {
        yield event
      } else {
        applicationFallbackResult = event
      }
    }
    
    if (applicationFallbackResult) {
      // Validate the regenerated files before adding them
      const regeneratedValidation = validatePatchedFiles(applicationFallbackResult)
      console.log(`📦 [patch-mode] Regenerated files validation - validFiles:`, Object.keys(regeneratedValidation.validFiles))
      finalFiles = { ...finalFiles, ...regeneratedValidation.validFiles }
      console.log(`📦 [patch-mode] finalFiles after merging regenerated:`, Object.keys(finalFiles))
      
      // If regenerated files still have validation errors, log them but include them anyway
      if (!regeneratedValidation.allValid) {
        console.log(`⚠️ [patch-mode] Some regenerated files still have validation errors:`, regeneratedValidation.failedFiles)
      }
    }
  }
  
  // Step 2: Validate patched files
  const filesBeforeValidation = { ...finalFiles }
  const validationResult = validatePatchedFiles(finalFiles)
  
  // Ensure validationResult has the expected structure
  if (!validationResult || typeof validationResult !== 'object') {
    console.error('❌ [patch-mode] Invalid validation result:', validationResult)
    yield { type: "patch_failed", content: "Validation failed with invalid result" }
    yield { 
      success: false, 
      files: finalFiles, 
      deletedFiles: deletedFiles,
      explanation: patchResult.explanation || extractExplanation(outputText), 
      errors: [...errors, 'Validation returned invalid result'] 
    }
    return
  }
  
  // Ensure all required fields exist
  const validFiles = validationResult.validFiles || {}
  const validationResults = validationResult.validationResults || validationResult.results || {}
  const validationFailedFiles = validationResult.failedFiles || []
  
  console.log(`📦 [patch-mode] Final validation - validFiles:`, Object.keys(validFiles))
  
  // validationResult.validFiles should include all files that are valid OR skipped (like CSS, HTML)
  finalFiles = { ...validFiles }
  
  // Safety check: ensure all files that were in finalFiles before validation are included if they were skipped
  // This handles edge cases where skipped files might not be properly included
  if (validationResults && typeof validationResults === 'object') {
    for (const [filePath, content] of Object.entries(filesBeforeValidation)) {
      const result = validationResults[filePath]
      // If file was skipped but somehow not in validFiles, add it
      if (result?.skipped && !finalFiles[filePath]) {
        finalFiles[filePath] = content
        console.log(`⚠️ [patch-mode] Adding skipped file ${filePath} that was missing from validFiles`)
      }
    }
  }
  
  console.log(`📦 [patch-mode] Final files to save:`, Object.keys(finalFiles))
  
  // Step 3: Handle failed files with per-file fallback (for validation errors)
  const allValid = validationResult.allValid !== false // Default to true if undefined
  if (!allValid && validationFailedFiles.length > 0) {
    console.log(`⚠️ [patch-mode] ${validationFailedFiles.length} files need fallback regeneration due to validation errors`)
    yield { type: "phase", phase: "implementing", content: `Fixing ${validationFailedFiles.length} files with syntax errors...` }
    
    const fallbackGen = handlePerFileFallback(
      validationFailedFiles,
      existingFiles,
      validationResults,
      userRequest,
      provider,
      model
    )
    
    let fallbackResult
    for await (const event of fallbackGen) {
      if (event.type) {
        yield event
      } else {
        fallbackResult = event
      }
    }
    
    if (fallbackResult) {
      finalFiles = { ...finalFiles, ...fallbackResult }
    }
  }
  
  // Step 4: Handle deleted files (already extracted above)
  
  // Yield the final result as an event so it can be captured
  yield {
    success: true,
    files: finalFiles,
    deletedFiles: deletedFiles,
    explanation: patchResult.explanation || extractExplanation(outputText)
  }
}

