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
    return { success: false, errors: ['No valid patch found in LLM response'] }
  }
  
  const patchResult = applyAllPatches(existingFiles, outputText)
  
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
  console.log('🔍 [validation] Validating patched files with ESLint...')
  
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
 * @param {Array} validationErrors - ESLint errors that caused the fallback
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
3. Is syntactically valid JavaScript/JSON

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
        .replace(/^```(?:javascript|json|js)?\s*/i, '')
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
  
  if (!patchResult.success && Object.keys(patchResult.updatedFiles).length === 0) {
    console.log('❌ [patch-mode] Patch application failed completely')
    yield { type: "patch_failed", content: "Patch application failed" }
    return { success: false, files: {}, explanation: patchResult.explanation, errors: patchResult.errors }
  }
  
  yield { type: "phase", phase: "implementing", content: `Applied patches to ${Object.keys(patchResult.updatedFiles).length} files` }
  
  // Step 2: Validate patched files
  const validationResult = validatePatchedFiles(patchResult.updatedFiles)
  
  let finalFiles = { ...validationResult.validFiles }
  
  // Step 3: Handle failed files with per-file fallback
  if (!validationResult.allValid && validationResult.failedFiles.length > 0) {
    console.log(`⚠️ [patch-mode] ${validationResult.failedFiles.length} files need fallback regeneration`)
    yield { type: "phase", phase: "implementing", content: `Fixing ${validationResult.failedFiles.length} files with syntax errors...` }
    
    const fallbackGen = handlePerFileFallback(
      validationResult.failedFiles,
      existingFiles,
      validationResult.validationResults,
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
  
  // Step 4: Handle deleted files
  const deletedFiles = patchResult.deletedFiles || []
  
  return {
    success: true,
    files: finalFiles,
    deletedFiles,
    explanation: patchResult.explanation || extractExplanation(outputText)
  }
}

