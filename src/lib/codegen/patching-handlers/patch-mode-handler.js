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
 * @param {Object} options - Additional options
 * @param {string[]} options.enabledTools - Array of tool names to enable
 * @returns {Object} - Replacements for prompt placeholders
 */
export function buildPatchPromptReplacements(userRequest, existingFiles, options = {}) {
  const { enabledTools = [] } = options
  const patchableFiles = prepareFilesForPatching(existingFiles)

  // Import buildToolDescriptions dynamically to avoid circular deps
  let toolDescriptions = ''
  if (enabledTools.length > 0) {
    // Build tool descriptions inline to avoid import issues
    const toolMap = {
      'chrome_api_search': `<chrome_api_search>
Use this tool to search Chrome extension API documentation when you need to verify API methods, parameters, permissions, or best practices.

To call this tool, output JSON:
{
  "tool": "chrome_api_search",
  "query": "your search query here"
}

Tool results will be provided before you generate patches.
</chrome_api_search>`,
      'web_scraping': `<web_scraping>
Use this tool (sparingly) to scrape and extract content from specific web pages when you need to analyze website structures for DOM manipulation or data extraction features.

To call this tool, output JSON:
{
  "tool": "web_scraping",
  "url": "https://example.com",
  "intent": "what you want to extract or analyze"
}

Tool results will be provided before you generate patches.
</web_scraping>`,
      'delete_file': `<file_deletion>
Use this tool to safely delete obsolete, redundant, or unnecessary files from the project during refactoring or cleanup operations.

To call this tool, output JSON:
{
  "tool": "delete_file",
  "file_path": "path/to/file.js",
  "reason": "Clear explanation of why this file should be deleted"
}

Safety notes:
- Critical files like manifest.json cannot be deleted
- Sensitive files (background.js, content.js, popup.html) will require user confirmation
- You must provide a clear reason for each deletion

Tool results will be provided before you generate patches.
</file_deletion>`
    }

    const sections = enabledTools
      .filter(tool => toolMap[tool])
      .map(tool => toolMap[tool])

    if (sections.length > 0) {
      toolDescriptions = `<available_tools>\n${sections.join('\n')}\n</available_tools>`
    }
  }

  return {
    USER_REQUEST: userRequest,
    EXISTING_FILES: formatFilesAsXml(patchableFiles),
    TOOL_DESCRIPTIONS: toolDescriptions
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

