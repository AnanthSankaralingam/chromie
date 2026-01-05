import { llmService } from '@/lib/services/llm-service.js'
import { USE_CASE_CHROME_APIS_PROMPT, USE_CASES_CHROME_APIS_PREFILL } from '@/lib/prompts/new-extension/planning/use-case.js'
import { EXTERNAL_RESOURCES_PROMPT, EXTERNAL_RESOURCES_PREFILL } from '@/lib/prompts/new-extension/planning/external-resources.js'
import { FRONTEND_SELECTION_PROMPT, FRONTEND_SELECTION_PREFILL } from '@/lib/prompts/new-extension/planning/frontend-selection.js'
import { TEMPLATE_MATCHER_PROMPT } from '@/lib/prompts/new-extension/planning/template-selection.js'
import useCasesData from '@/lib/data/use_cases.json' // ONLY add niche code snippets for the use cases, chrome apis handles all other basic cases.
import templatesData from '@/lib/data/templates/all_templates.json'
import { extractJsonFieldsManually } from '@/lib/utils/planning-helpers.js'
import { searchChromeExtensionAPI } from './chrome-api-docs.js'
import { fetchExternalApiDocs } from './external-api-docs.js'
import { PLANNING_MODELS } from '@/lib/constants.js'
import { isWorkspaceAPI, collectWorkspaceScopes } from '@/lib/utils/google-workspace-scopes.js'

const PLANNING_MODEL = PLANNING_MODELS.DEFAULT
const EXTERNAL_RESOURCES_MODEL = PLANNING_MODELS.EXTERNAL_RESOURCES
const PLANNING_PROVIDER = 'anthropic'

/**
 * Orchestrates the planning phase for Chrome extension generation
 * Uses 4 LLM calls: use-case detection, external resources, frontend selection, and template matching
 *
 * @param {string} featureRequest - User's feature request description
 * @returns {Promise<Object>} Planning results with use case, external resources, frontend type, template match, code snippets, and token usage
 */
export async function orchestratePlanning(featureRequest) {
  console.log('🎯 [Planning Orchestrator] Starting planning phase...')
  console.log('📝 Feature Request:', featureRequest.substring(0, 150) + '...')

  try {
    // Step 1: Parallel calls to use-case and external-resources prompts
    console.log('🔄 [Planning Orchestrator] Making parallel calls to use-case and external-resources prompts...')

    const [useCaseResponse, externalResourcesResponse] = await Promise.all([
      callUseCasePrompt(featureRequest),
      callExternalResourcesPrompt(featureRequest)
    ])

    console.log('📊 Use Case Result:', JSON.stringify(useCaseResponse.result, null, 2))
    console.log('📊 External Resources Result:', JSON.stringify(externalResourcesResponse.result, null, 2))

    // Step 2: Sequential call to frontend-selection prompt
    console.log('🔄 [Planning Orchestrator] Calling frontend-selection prompt...')

    const frontendSelectionResponse = await callFrontendSelectionPrompt(
      featureRequest,
      useCaseResponse.result
    )

    console.log('📊 Frontend Type:', frontendSelectionResponse.result.frontend_type)

    // Step 3: Sequential call to template-matching prompt (after frontend selection)
    console.log('🔄 [Planning Orchestrator] Calling template-matching prompt...')

    const templateMatchingResponse = await callTemplateMatchingPrompt(
      featureRequest,
      frontendSelectionResponse.result.frontend_type
    )

    console.log('📊 Template Match Result:', JSON.stringify(templateMatchingResponse.result, null, 2))

    // Step 4: Fetch code snippet from use_cases.json
    const codeSnippet = fetchCodeSnippet(useCaseResponse.result.matched_use_case?.name)

    // Step 5: Aggregate token usage
    const totalTokenUsage = {
      prompt_tokens: (useCaseResponse.tokenUsage.prompt_tokens || 0) +
                     (externalResourcesResponse.tokenUsage.prompt_tokens || 0) +
                     (frontendSelectionResponse.tokenUsage.prompt_tokens || 0) +
                     (templateMatchingResponse.tokenUsage.prompt_tokens || 0),
      completion_tokens: (useCaseResponse.tokenUsage.completion_tokens || 0) +
                        (externalResourcesResponse.tokenUsage.completion_tokens || 0) +
                        (frontendSelectionResponse.tokenUsage.completion_tokens || 0) +
                        (templateMatchingResponse.tokenUsage.completion_tokens || 0),
      total_tokens: 0,
      model: PLANNING_MODEL
    }
    totalTokenUsage.total_tokens = totalTokenUsage.prompt_tokens + totalTokenUsage.completion_tokens

    console.log('💰 [Planning Orchestrator] Total token usage:', totalTokenUsage)

    // Step 6: Detect Google Workspace APIs
    const workspaceApis = (externalResourcesResponse.result.external_apis || []).filter(api => 
      isWorkspaceAPI(api.name)
    );
    
    const usesWorkspaceAPIs = workspaceApis.length > 0;
    const workspaceScopes = collectWorkspaceScopes(workspaceApis, featureRequest);
    
    if (usesWorkspaceAPIs) {
      console.log('🔐 [Planning Orchestrator] Google Workspace APIs detected:', workspaceApis.map(a => a.name));
      console.log('🔑 [Planning Orchestrator] Required OAuth scopes:', workspaceScopes);
    }

    // Step 7: Log unified JSON output for readability
    const unifiedOutput = {
      use_case: useCaseResponse.result,
      external_resources: externalResourcesResponse.result,
      frontend_type: frontendSelectionResponse.result.frontend_type,
      template_match: templateMatchingResponse.result,
      workspace_apis: workspaceApis.map(a => a.name),
      workspace_scopes: workspaceScopes,
      code_snippet_preview: codeSnippet ? codeSnippet.substring(0, 200) + '...' : null,
      token_usage: totalTokenUsage
    }

    console.log('📋 [Planning Orchestrator] Unified Planning Output:')
    console.log(JSON.stringify(unifiedOutput, null, 2))

    // Step 8: Return aggregated planning data
    return {
      useCaseResult: useCaseResponse.result,
      externalResourcesResult: externalResourcesResponse.result,
      frontendType: frontendSelectionResponse.result.frontend_type,
      templateMatchResult: templateMatchingResponse.result,
      codeSnippet: codeSnippet,
      tokenUsage: totalTokenUsage,
      workspaceAPIs: workspaceApis,
      usesWorkspaceAPIs: usesWorkspaceAPIs,
      workspaceScopes: workspaceScopes
    }

  } catch (error) {
    console.error('❌ [Planning Orchestrator] Error during planning phase:', error)
    throw error
  }
}

/**
 * Generate available use cases list from use_cases.json
 * @returns {string} Formatted list of use cases with descriptions
 */
function generateAvailableUseCases() {
  return useCasesData.map(useCase => {
    return `${useCase.title}`
  }).join(', ')
}

/**
 * Call the use-case detection prompt
 * @param {string} featureRequest - User's feature request
 * @returns {Promise<Object>} Use case result and token usage
 */
async function callUseCasePrompt(featureRequest) {
  const availableUseCases = generateAvailableUseCases()
  const prompt = USE_CASE_CHROME_APIS_PROMPT
    .replace('{USER_REQUEST}', featureRequest)
    .replace('{AVAILABLE_USE_CASES}', availableUseCases)

  try {
    //TODO add schema validation
    const response = await llmService.createResponse({
      provider: PLANNING_PROVIDER,
      model: PLANNING_MODEL,
      input: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: USE_CASES_CHROME_APIS_PREFILL }
      ],
      temperature: 0.2,
      max_output_tokens: 250
    })

    const result = parseJsonResponse(response.output_text, USE_CASES_CHROME_APIS_PREFILL)

    return {
      result,
      tokenUsage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0
      }
    }
  } catch (error) {
    console.error('❌ [Planning Orchestrator] Error calling use-case prompt:', error)
    // Return fallback result
    return {
      result: {
        matched_use_case: { name: null, category: null },
        required_chrome_apis: []
      },
      tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    }
  }
}

/**
 * Call the external resources detection prompt
 * @param {string} featureRequest - User's feature request
 * @returns {Promise<Object>} External resources result and token usage
 */
async function callExternalResourcesPrompt(featureRequest) {
  const prompt = EXTERNAL_RESOURCES_PROMPT.replace('{USER_REQUEST}', featureRequest)

  try {
    const response = await llmService.createResponse({
      provider: PLANNING_PROVIDER,
      model: EXTERNAL_RESOURCES_MODEL,
      input: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: EXTERNAL_RESOURCES_PREFILL }
      ],
      temperature: 0.6,
      max_output_tokens: 256
    })

    const result = parseJsonResponse(response.output_text, EXTERNAL_RESOURCES_PREFILL)

    // Filter out Chrome APIs from external_apis (Chrome APIs are notated as chrome.*)
    if (result.external_apis && Array.isArray(result.external_apis)) {
      const originalCount = result.external_apis.length
      result.external_apis = result.external_apis.filter(api => {
        const isChromeApi = api.name && api.endpoint_url.toLowerCase().startsWith('chrome.')
        if (isChromeApi) {
          console.log(`🔍 [Planning Orchestrator] Filtered out Chrome API from external resources: ${api.name}`)
        }
        return !isChromeApi
      })

      if (originalCount !== result.external_apis.length) {
        console.log(`✅ [Planning Orchestrator] Removed ${originalCount - result.external_apis.length} Chrome API(s) from external resources`)
      }
    }

    return {
      result,
      tokenUsage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0
      }
    }
  } catch (error) {
    console.error('❌ [Planning Orchestrator] Error calling external-resources prompt:', error)
    // Return fallback result
    return {
      result: {
        external_apis: [],
        webpages_to_scrape: [],
        no_external_needed: true
      },
      tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    }
  }
}

/**
 * Call the frontend selection prompt
 * @param {string} featureRequest - User's feature request
 * @param {Object} useCaseResult - Result from use-case prompt
 * @returns {Promise<Object>} Frontend selection result and token usage
 */
async function callFrontendSelectionPrompt(featureRequest, useCaseResult) {
  const matchedUseCase = useCaseResult.matched_use_case?.name || 'None'
  const requiredApis = (useCaseResult.required_chrome_apis || []).join(', ') || 'None'

  const prompt = FRONTEND_SELECTION_PROMPT
    .replace('{USER_REQUEST}', featureRequest)
    .replace('{MATCHED_USE_CASE}', matchedUseCase)
    .replace('{REQUIRED_CHROME_APIS}', requiredApis)

  try {
    const response = await llmService.createResponse({
      provider: PLANNING_PROVIDER,
      model: PLANNING_MODEL,
      input: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: FRONTEND_SELECTION_PREFILL }
      ],
      temperature: 0.2,
      max_output_tokens: 256
    })

    const result = parseJsonResponse(response.output_text, FRONTEND_SELECTION_PREFILL)

    // Validate frontend_type is one of the 5 valid types
    const validTypes = ['popup', 'sidepanel', 'overlay', 'new_tab', 'content_script_ui']
    if (!validTypes.includes(result.frontend_type)) {
      console.warn(`⚠️ [Planning Orchestrator] Invalid frontend_type "${result.frontend_type}", defaulting to "popup"`)
      result.frontend_type = 'popup'
    }

    return {
      result,
      tokenUsage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0
      }
    }
  } catch (error) {
    console.error('❌ [Planning Orchestrator] Error calling frontend-selection prompt:', error)
    // Return fallback result
    return {
      result: { frontend_type: 'popup' },
      tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    }
  }
}

/**
 * Generate available templates list filtered by frontend type
 * @param {string} frontendType - Frontend type to filter by
 * @returns {string} Formatted list of templates with descriptions
 */
function generateAvailableTemplates(frontendType) {
  // Normalize frontend type for matching (templates use "side_panel" but frontend selection uses "sidepanel")
  const normalizedFrontendType = frontendType === 'sidepanel' ? 'side_panel' : frontendType
  
  const filteredTemplates = templatesData.filter(template => {
    const supportedTypes = template.supported_frontend_types || []
    return supportedTypes.includes(normalizedFrontendType)
  })

  if (filteredTemplates.length === 0) {
    return 'No templates available for this frontend type.'
  }

  return filteredTemplates.map(template => {
    return `${template.title}: ${template.description} (Features: ${(template.key_features || []).join(', ')})`
  }).join('\n')
}

/**
 * Call the template matching prompt
 * @param {string} featureRequest - User's feature request
 * @param {string} frontendType - Frontend type from frontend selection
 * @returns {Promise<Object>} Template matching result and token usage
 */
async function callTemplateMatchingPrompt(featureRequest, frontendType) {
  const availableTemplates = generateAvailableTemplates(frontendType)
  
  // If no templates available for this frontend type, return null match
  if (availableTemplates === 'No templates available for this frontend type.') {
    console.log('ℹ️ [Planning Orchestrator] No templates available for frontend type:', frontendType)
    return {
      result: {
        matched_template: {
          name: null,
          confidence: 0
        }
      },
      tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    }
  }

  const prompt = TEMPLATE_MATCHER_PROMPT
    .replace('{USER_REQUEST}', featureRequest)
    .replace('{FRONTEND_TYPE}', frontendType)
    .replace('{AVAILABLE_TEMPLATES}', availableTemplates)

  // Create a prefill for JSON response (similar to other prompts)
  const TEMPLATE_MATCHER_PREFILL = '{\n  "matched_template": {\n    "name": '

  try {
    const response = await llmService.createResponse({
      provider: PLANNING_PROVIDER,
      model: PLANNING_MODEL,
      input: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: TEMPLATE_MATCHER_PREFILL }
      ],
      temperature: 0.2,
      max_output_tokens: 128
    })

    const result = parseJsonResponse(response.output_text, TEMPLATE_MATCHER_PREFILL)

    // Validate confidence threshold (0.7 as specified in prompt)
    if (result.matched_template && result.matched_template.confidence < 0.7) {
      console.log(`ℹ️ [Planning Orchestrator] Template match confidence ${result.matched_template.confidence} below threshold 0.7, treating as no match`)
      result.matched_template = { name: null, confidence: 0 }
    }

    return {
      result,
      tokenUsage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0
      }
    }
  } catch (error) {
    console.error('❌ [Planning Orchestrator] Error calling template-matching prompt:', error)
    // Return fallback result (no match)
    return {
      result: {
        matched_template: {
          name: null,
          confidence: 0
        }
      },
      tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    }
  }
}

/**
 * Fetch code snippet from use_cases.json based on matched use case name
 * @param {string|null} useCaseName - Matched use case name
 * @returns {string|null} Code snippet or null if not found
 */
function fetchCodeSnippet(useCaseName) {
  if (!useCaseName) {
    console.log('ℹ️ [Planning Orchestrator] No use case matched, skipping code snippet fetch')
    return null
  }

  const useCase = useCasesData.find(uc => uc.title === useCaseName)

  if (useCase && useCase.code_snippet) {
    console.log(`✅ [Planning Orchestrator] Found code snippet for "${useCaseName}"`)
    return useCase.code_snippet
  }

  console.warn(`⚠️ [Planning Orchestrator] No code snippet found for use case "${useCaseName}"`)
  return null
}

/**
 * Parse JSON response from LLM, handling prefills and markdown code blocks
 * @param {string} outputText - LLM response text
 * @param {string} prefill - Prefill text used in the prompt
 * @returns {Object} Parsed JSON object
 */
function parseJsonResponse(outputText, prefill) {
  try {
    // Combine prefill with output
    let fullJson = prefill + outputText

    // Remove markdown code blocks if present
    if (fullJson.includes('```json')) {
      const jsonMatch = fullJson.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        fullJson = jsonMatch[1].trim()
      }
    } else if (fullJson.includes('```')) {
      const codeMatch = fullJson.match(/```\s*([\s\S]*?)\s*```/)
      if (codeMatch) {
        fullJson = codeMatch[1].trim()
      }
    }

    // Parse JSON
    return JSON.parse(fullJson)
  } catch (error) {
    console.error('❌ [Planning Orchestrator] JSON parsing failed:', error.message)
    console.error('Raw output:', outputText)

    // Attempt manual extraction as fallback
    try {
      return extractJsonFieldsManually(prefill + outputText)
    } catch (fallbackError) {
      console.error('❌ [Planning Orchestrator] Fallback extraction failed:', fallbackError)
      throw error
    }
  }
}

/**
 * Format planning outputs for coding prompt placeholders
 * @param {Object} planningResult - Result from orchestratePlanning
 * @param {string|null} scrapedWebpageAnalysis - Optional scraped webpage analysis data
 * @param {number|null} scrapeStatusCode - Optional status code from scraping (200 = success, 404 = no data, 500 = error)
 * @param {Array|null} userProvidedApis - Optional user-provided API configurations with name and endpoint
 * @returns {Promise<Object>} Formatted strings for prompt replacement
 */
export async function formatPlanningOutputs(planningResult, scrapedWebpageAnalysis = null, scrapeStatusCode = null, userProvidedApis = null, featureRequest = '') {
  const { useCaseResult, externalResourcesResult, codeSnippet } = planningResult

  // Format use case and Chrome APIs
  const useCaseFormatted = formatUseCaseOutput(useCaseResult, featureRequest)

  // Format external resources (with webpage data if available and successful, and user-provided APIs)
  const externalResourcesFormatted = await formatExternalResourcesOutput(
    externalResourcesResult,
    scrapedWebpageAnalysis,
    scrapeStatusCode,
    userProvidedApis
  )

  // Format code snippet
  const codeSnippetFormatted = formatCodeSnippet(codeSnippet, useCaseResult.matched_use_case?.name)

  return {
    USE_CASE_CHROME_APIS: useCaseFormatted,
    EXTERNAL_RESOURCES: externalResourcesFormatted,
    CODE_SNIPPETS: codeSnippetFormatted
  }
}

/**
 * Format use case output for prompt
 * @param {Object} useCaseResult - Use case detection result
 * @param {string} featureRequest - User's feature request for keyword detection
 * @returns {string} Formatted markdown
 */
function formatUseCaseOutput(useCaseResult, featureRequest = '') {
  const { matched_use_case, required_chrome_apis } = useCaseResult

  let output = ''

  // Add use case information if matched
  if (matched_use_case && matched_use_case.name) {
    output += `Similar Use Case\n`
    output += `**Name**: ${matched_use_case.name}\n\n`

    // Fetch code snippet from useCasesData
    const useCase = useCasesData.find(uc => uc.title === matched_use_case.name)
    if (useCase && useCase.code_snippet) {
      output += `**Sample Code Snippet**:\n\`\`\`javascript\n${useCase.code_snippet}\n\`\`\`\n\n`
    }
  }

  // Ensure offscreen API is included if tabCapture is present (required for MV3 recording)
  const apiList = [...(required_chrome_apis || [])];
  
  // Robust detection for audio/video recording keywords
  const recordingKeywords = [
    'record', 
    'capture audio', 
    'capture video', 
    'monitor meeting', 
    'meeting audio', 
    'tab audio', 
    'stream audio',
    'transcribe',
    'listening',
    'hear',
    'audio stream',
    'screen recording',
    'system audio',
    'record meeting',
    'capture meeting'
  ];
  const isRecordingRequest = recordingKeywords.some(keyword => featureRequest.toLowerCase().includes(keyword));
  
  if (isRecordingRequest && !apiList.includes('tabCapture')) {
    apiList.push('tabCapture');
  }

  if (apiList.includes('tabCapture') && !apiList.includes('offscreen')) {
    apiList.push('offscreen');
  }

  // Fetch and format Chrome API documentation
  if (apiList.length > 0) {
    output += `Recommended Chrome APIs\n\n`

    for (const apiName of apiList) {
      const apiResult = searchChromeExtensionAPI(apiName)

      if (!apiResult.error) {
        output += `### chrome.${apiResult.name}\n`
        output += `**Description**: ${apiResult.description || 'No description provided'}\n`
        output += `**Permissions**: ${
          Array.isArray(apiResult.permissions)
            ? apiResult.permissions.join(', ')
            : apiResult.permissions || 'None required'
        }\n\n`

        if (apiResult.code_example) {
          output += `**Example Usage**:\n\`\`\`javascript\n${apiResult.code_example}\n\`\`\`\n\n`
        }
      } else {
        output += `### chrome.${apiName}\n`
        output += `*API documentation not found*\n\n`
      }
    }

    //TODO move this to the docs itself, don't edit context in this file.
    // CRITICAL: Enforce Offscreen Pattern for Audio/Video Recording
    if (apiList.includes('tabCapture') || apiList.includes('offscreen')) {
      output += `\n### ⚠️ CRITICAL IMPLEMENTATION RULE: Audio/Video Recording\n`
      output += `**Manifest V3 Restriction**: Service workers (background.js) CANNOT access \`navigator.mediaDevices.getUserMedia\`. You will get "Cannot read properties of undefined (reading 'getUserMedia')" error.\n\n`
      output += `**MANDATORY ARCHITECTURE**:\n`
      output += `1. **manifest.json**: Must include \`"permissions": ["offscreen", "tabCapture", "tabs"]\`.\n`
      output += `   - The "tabs" permission is required to check tab URLs before capture.\n`
      output += `2. **offscreen.html**: Create a minimal HTML file to host the recording script.\n`
      output += `3. **offscreen.js**: Handle \`navigator.mediaDevices.getUserMedia\` and \`MediaRecorder\` here. \n`
      output += `   - Convert recorded Blobs to **Base64 strings** (reader.readAsDataURL).\n`
      output += `   - Send Base64 data via \`chrome.runtime.sendMessage\`.\n`
      output += `4. **background.js**: \n`
      output += `   - **CRITICAL**: Before calling \`chrome.tabCapture.getMediaStreamId\`, ALWAYS check the tab URL:\n`
      output += `     - Get tab info: \`const tab = await chrome.tabs.get(tabId)\`\n`
      output += `     - Check if URL starts with \`chrome://\`, \`chrome-extension://\`, or \`edge://\` - these CANNOT be captured\n`
      output += `     - Check if URL is \`about:blank\` or empty - extension may not have been invoked\n`
      output += `     - Only proceed with capture if URL is a valid web page (http:// or https://)\n`
      output += `   - Get \`streamId\` using \`chrome.tabCapture.getMediaStreamId({ targetTabId: tabId })\`.\n`
      output += `   - Create offscreen document: \`await chrome.offscreen.createDocument({ url: 'offscreen.html', ... })\`.\n`
      output += `   - Send \`streamId\` to offscreen document via \`chrome.runtime.sendMessage\`.\n`
      output += `   - Proxy recording messages between offscreen and UI (sidepanel/popup).\n`
      output += `   - Handle errors gracefully and notify UI if capture fails.\n`
      output += `5. **UI (sidepanel.js/popup.js)**: \n`
      output += `   - Receive Base64 string.\n`
      output += `   - Convert back to Blob/Source for playback/download if needed.\n`
      output += `   - Display user-friendly error messages if capture fails (e.g., "Cannot capture Chrome internal pages").\n`
      output += `\n**ERROR HANDLING**:\n`
      output += `- Always wrap \`chrome.tabCapture.getMediaStreamId\` in try-catch blocks.\n`
      output += `- If error message contains "Extension has not been invoked" or "Chrome pages cannot be captured", show a user-friendly message.\n`
      output += `- Common error: "Extension has not been invoked for the current page (see activeTab permission). Chrome pages cannot be captured."\n`
      output += `  - This means the tab is a chrome:// page OR the extension hasn't been clicked/interacted with on that page.\n`
      output += `  - Solution: Check tab URL first, and ensure user clicks extension icon/button before starting capture.\n`
      output += `\nFAILURE TO FOLLOW THIS PATTERN WILL CAUSE THE EXTENSION TO FAIL.\n\n`
    }

  } else {
    output += `## Chrome APIs\nNo specific Chrome APIs required for this extension.\n\n`
  }

  return output.trim()
}

/**
 * Format external resources output for prompt
 * @param {Object} externalResourcesResult - External resources detection result
 * @param {string|null} scrapedWebpageAnalysis - Optional scraped webpage analysis data
 * @param {number|null} scrapeStatusCode - Optional status code from scraping (200 = success, 404 = no data, 500 = error)
 * @param {Array|null} userProvidedApis - Optional user-provided API configurations with name and endpoint
 * @returns {Promise<string>} Formatted markdown
 */
async function formatExternalResourcesOutput(externalResourcesResult, scrapedWebpageAnalysis = null, scrapeStatusCode = null, userProvidedApis = null) {
  const { external_apis, webpages_to_scrape, no_external_needed } = externalResourcesResult

  // Check if we have scraped webpage data to include (only if status code is 200)
  const hasScrapedData = scrapeStatusCode === 200 &&
    scrapedWebpageAnalysis && 
    typeof scrapedWebpageAnalysis === 'string' &&
    scrapedWebpageAnalysis.trim().length > 0 &&
    !scrapedWebpageAnalysis.startsWith('<!--');

  // Determine which APIs to include
  // If userProvidedApis is an empty array, user explicitly skipped all APIs - don't include planning result APIs
  // If userProvidedApis is null/undefined, we're in initial planning - include planning result APIs
  // If userProvidedApis has items, merge with planning result APIs
  let allApis = []
  if (userProvidedApis === null || userProvidedApis === undefined) {
    // Initial planning phase - use planning result APIs
    allApis = [...(external_apis || [])]
  } else if (Array.isArray(userProvidedApis)) {
    if (userProvidedApis.length === 0) {
      // User explicitly skipped all APIs - don't include planning result APIs
      allApis = []
    } else {
      // User provided some APIs - start with planning result APIs and merge user-provided ones
      allApis = [...(external_apis || [])]
      // Convert user-provided APIs to the same format as planning result APIs
      userProvidedApis.forEach(userApi => {
        // Check if this API already exists in planning result (by name)
        const existingIndex = allApis.findIndex(api => api.name === userApi.name)
        if (existingIndex >= 0) {
          // Update existing API with user-provided endpoint
          allApis[existingIndex] = {
            ...allApis[existingIndex],
            endpoint_url: userApi.endpoint,
            // Keep purpose from planning if available, otherwise use name
            purpose: allApis[existingIndex].purpose || `User-provided ${userApi.name} API`,
            // Preserve optional documentation metadata
            doc_link: userApi.doc_link || allApis[existingIndex].doc_link || null,
            doc_description: userApi.doc_description || allApis[existingIndex].doc_description || null,
          }
        } else {
          // Add new user-provided API
          allApis.push({
            name: userApi.name,
            endpoint_url: userApi.endpoint,
            purpose: `User-provided ${userApi.name} API`,
            doc_link: userApi.doc_link || null,
            doc_description: userApi.doc_description || null,
          })
        }
      })
    }
  } else {
    // Fallback: if userProvidedApis is not null/undefined/array, use planning result APIs
    allApis = [...(external_apis || [])]
  }

  const hasApis = allApis.length > 0
  const hasWebpages = webpages_to_scrape && webpages_to_scrape.length > 0

  if (no_external_needed && !hasScrapedData && !hasApis && !hasWebpages) {
    return 'No external resources needed for this extension.'
  }

  let output = ''

  if (hasApis) {
    output += 'External APIs\n'
    allApis.forEach(api => {
      output += `- **${api.name}**: ${api.purpose}\n`
      output += `  Endpoint: ${api.endpoint_url}\n`
    })
    output += '\n'
    
    // Include detailed API documentation
    const apiDocumentation = await fetchExternalApiDocs(allApis)
    if (apiDocumentation) {
      output += '## External API Documentation\n\n'
      output += apiDocumentation
      output += '\n\n'
    }
  }

  if (hasWebpages) {
    output += 'Target Websites\n'
    output += webpages_to_scrape.map(domain => `- ${domain}`).join('\n')
    output += '\n'
  }

  // Include scraped webpage analysis if available (even if webpages_to_scrape is empty)
  if (hasScrapedData) {
    output += '## Website Structure Analysis\n'
    output += scrapedWebpageAnalysis
    output += '\n'
  }

  return output || 'No external resources identified.'
}

/**
 * Format code snippet for prompt
 * @param {string|null} codeSnippet - Code snippet from use_cases.json
 * @param {string|null} useCaseName - Use case name
 * @returns {string} Formatted code snippet
 */
function formatCodeSnippet(codeSnippet, useCaseName) {
  if (!codeSnippet) {
    return 'No reference code snippet available for this use case.'
  }

  return `Reference Code Snippet (${useCaseName || 'Use Case'})

The following code demonstrates common patterns for this type of extension:

\`\`\`javascript
${codeSnippet}
\`\`\`

Use this as a reference for implementing similar functionality, but adapt it to the specific user requirements.
`
}
