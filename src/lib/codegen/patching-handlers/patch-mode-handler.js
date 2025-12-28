/**
 * Patch Mode Handler
 * Main orchestrator for patch-based code generation flow
 * Coordinates between patch generation, application, validation, and fallback
 */

import { processPatchModeOutput } from "./patch-processor"
import { formatFilesAsXml } from "./requirements-helpers"
import { REQUEST_TYPES } from "@/lib/prompts/request-types"

/**
 * Determines if a request should use patching mode
 * @param {string} requestType - Type of request (NEW_EXTENSION, ADD_TO_EXISTING, etc.)
 * @param {Object} existingFiles - Existing extension files
 * @returns {boolean} - True if patching mode should be used
 */
export function shouldUsePatchingMode(requestType, existingFiles) {
  // Use patching for add-to-existing requests when files exist
  if (requestType === REQUEST_TYPES.ADD_TO_EXISTING && existingFiles && Object.keys(existingFiles).length > 0) {
    console.log(`🔍 [patch-mode-handler] Checking patching mode: requestType="${requestType}", fileCount=${Object.keys(existingFiles).length}`)
    return true
  }
  console.log(`🔍 [patch-mode-handler] Patching mode NOT used: requestType="${requestType}" (expected: "${REQUEST_TYPES.ADD_TO_EXISTING}")`)
  return false
}

/**
 * Prepares files for patching by filtering out non-code files
 * @param {Object} existingFiles - Map of file paths to contents
 * @returns {Object} - Filtered map of patchable files
 */
export function prepareFilesForPatching(existingFiles) {
  if (!existingFiles || typeof existingFiles !== 'object') {
    return {}
  }

  const filteredFiles = {}
  for (const [filename, content] of Object.entries(existingFiles)) {
    // Exclude images and icons from patching context
    if (!filename.match(/\.(png|jpg|jpeg|gif|svg|ico)$/i) && !filename.startsWith("icons/")) {
      filteredFiles[filename] = content
    }
  }
  
  console.log(`📋 [patch-mode-handler] Prepared ${Object.keys(filteredFiles).length} files for patching`)
  return filteredFiles
}

/**
 * Builds replacements object for patch prompt
 * @param {string} userRequest - Original user request
 * @param {Object} existingFiles - Existing extension files
 * @returns {Object} - Replacements for prompt placeholders
 */
export function buildPatchPromptReplacements(userRequest, existingFiles) {
  const patchableFiles = prepareFilesForPatching(existingFiles)
  
  return {
    USER_REQUEST: userRequest,
    EXISTING_FILES: formatFilesAsXml(patchableFiles)
  }
}

/**
 * Main handler for patch mode code generation
 * This is a generator that yields progress events and handles the full patching flow
 * @param {string} outputText - LLM response with patch
 * @param {Object} existingFiles - Original file contents
 * @param {string} userRequest - Original user request
 * @param {string} provider - LLM provider
 * @param {string} model - Model name
 * @returns {AsyncGenerator} - Yields progress events and final result
 */
export async function* handlePatchMode(outputText, existingFiles, userRequest, provider, model) {
  console.log('🔧 [patch-mode-handler] Initiating patch mode processing...')
  
  // Delegate to patch processor which handles:
  // 1. Patch application
  // 2. ESLint validation
  // 3. Per-file fallback for failed validations
  for await (const event of processPatchModeOutput(outputText, existingFiles, userRequest, provider, model)) {
    yield event
  }
}

