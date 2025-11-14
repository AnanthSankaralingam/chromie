import { llmService } from '../services/llm-service.js'
import { USE_CASE_CHROME_APIS_PROMPT, USE_CASES_CHROME_APIS_PREFILL } from '../prompts/new-extension/planning/use-case.js'
import { EXTERNAL_RESOURCES_PROMPT, EXTERNAL_RESOURCES_PREFILL } from '../prompts/new-extension/planning/external-resources.js'
import { FRONTEND_SELECTION_PROMPT, FRONTEND_SELECTION_PREFILL } from '../prompts/new-extension/planning/frontend-selection.js'
import useCasesData from '../data/use_cases.json'
import { extractJsonFieldsManually } from '../utils/planning-helpers.js'

const PLANNING_MODEL = 'claude-haiku-4-5-20251001'
const PLANNING_PROVIDER = 'anthropic'

/**
 * Orchestrates the planning phase for Chrome extension generation
 * Uses 3 LLM calls: use-case detection, external resources, and frontend selection
 *
 * @param {string} featureRequest - User's feature request description
 * @returns {Promise<Object>} Planning results with use case, external resources, frontend type, code snippets, and token usage
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

    console.log('✅ [Planning Orchestrator] Parallel calls completed')
    console.log('📊 Use Case Result:', JSON.stringify(useCaseResponse.result, null, 2))
    console.log('📊 External Resources Result:', JSON.stringify(externalResourcesResponse.result, null, 2))

    // Step 2: Sequential call to frontend-selection prompt
    console.log('🔄 [Planning Orchestrator] Calling frontend-selection prompt...')

    const frontendSelectionResponse = await callFrontendSelectionPrompt(
      featureRequest,
      useCaseResponse.result
    )

    console.log('✅ [Planning Orchestrator] Frontend selection completed')
    console.log('📊 Frontend Type:', frontendSelectionResponse.result.frontend_type)

    // Step 3: Fetch code snippet from use_cases.json
    const codeSnippet = fetchCodeSnippet(useCaseResponse.result.matched_use_case?.name)

    // Step 4: Aggregate token usage
    const totalTokenUsage = {
      prompt_tokens: (useCaseResponse.tokenUsage.prompt_tokens || 0) +
                     (externalResourcesResponse.tokenUsage.prompt_tokens || 0) +
                     (frontendSelectionResponse.tokenUsage.prompt_tokens || 0),
      completion_tokens: (useCaseResponse.tokenUsage.completion_tokens || 0) +
                        (externalResourcesResponse.tokenUsage.completion_tokens || 0) +
                        (frontendSelectionResponse.tokenUsage.completion_tokens || 0),
      total_tokens: 0,
      model: PLANNING_MODEL
    }
    totalTokenUsage.total_tokens = totalTokenUsage.prompt_tokens + totalTokenUsage.completion_tokens

    console.log('💰 [Planning Orchestrator] Total token usage:', totalTokenUsage)

    // Step 5: Log unified JSON output for readability
    const unifiedOutput = {
      use_case: useCaseResponse.result,
      external_resources: externalResourcesResponse.result,
      frontend_type: frontendSelectionResponse.result.frontend_type,
      code_snippet_preview: codeSnippet ? codeSnippet.substring(0, 200) + '...' : null,
      token_usage: totalTokenUsage
    }

    console.log('📋 [Planning Orchestrator] Unified Planning Output:')
    console.log(JSON.stringify(unifiedOutput, null, 2))

    // Step 6: Return aggregated planning data
    return {
      useCaseResult: useCaseResponse.result,
      externalResourcesResult: externalResourcesResponse.result,
      frontendType: frontendSelectionResponse.result.frontend_type,
      codeSnippet: codeSnippet,
      tokenUsage: totalTokenUsage
    }

  } catch (error) {
    console.error('❌ [Planning Orchestrator] Error during planning phase:', error)
    throw error
  }
}

/**
 * Call the use-case detection prompt
 * @param {string} featureRequest - User's feature request
 * @returns {Promise<Object>} Use case result and token usage
 */
async function callUseCasePrompt(featureRequest) {
  const prompt = USE_CASE_CHROME_APIS_PROMPT.replace('{USER_REQUEST}', featureRequest)

  try {
    const response = await llmService.createResponse({
      provider: PLANNING_PROVIDER,
      model: PLANNING_MODEL,
      input: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: USE_CASES_CHROME_APIS_PREFILL }
      ],
      temperature: 0.2,
      max_output_tokens: 1000
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
      model: PLANNING_MODEL,
      input: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: EXTERNAL_RESOURCES_PREFILL }
      ],
      temperature: 0.2,
      max_output_tokens: 1000
    })

    const result = parseJsonResponse(response.output_text, EXTERNAL_RESOURCES_PREFILL)

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
      max_output_tokens: 500
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
 * @returns {Object} Formatted strings for prompt replacement
 */
export function formatPlanningOutputs(planningResult) {
  const { useCaseResult, externalResourcesResult, codeSnippet } = planningResult

  // Format use case and Chrome APIs
  const useCaseFormatted = formatUseCaseOutput(useCaseResult)

  // Format external resources
  const externalResourcesFormatted = formatExternalResourcesOutput(externalResourcesResult)

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
 * @returns {string} Formatted markdown
 */
function formatUseCaseOutput(useCaseResult) {
  const { matched_use_case, required_chrome_apis } = useCaseResult

  if (!matched_use_case || !matched_use_case.name) {
    return 'No specific use case matched. Implement based on user requirements.'
  }

  const apis = required_chrome_apis && required_chrome_apis.length > 0
    ? required_chrome_apis.map(api => `- chrome.${api}`).join('\n')
    : 'No specific Chrome APIs identified'

  return `## Matched Use Case
**Name**: ${matched_use_case.name}
**Category**: ${matched_use_case.category || 'General'}

## Required Chrome APIs
${apis}
`
}

/**
 * Format external resources output for prompt
 * @param {Object} externalResourcesResult - External resources detection result
 * @returns {string} Formatted markdown
 */
function formatExternalResourcesOutput(externalResourcesResult) {
  const { external_apis, webpages_to_scrape, no_external_needed } = externalResourcesResult

  if (no_external_needed) {
    return 'No external resources needed for this extension.'
  }

  let output = ''

  if (external_apis && external_apis.length > 0) {
    output += '## External APIs\n'
    external_apis.forEach(api => {
      output += `- **${api.name}**: ${api.purpose}\n`
      output += `  Endpoint: ${api.endpoint_url}\n`
    })
    output += '\n'
  }

  if (webpages_to_scrape && webpages_to_scrape.length > 0) {
    output += '## Target Websites\n'
    output += webpages_to_scrape.map(domain => `- ${domain}`).join('\n')
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

  return `## Reference Code Snippet (${useCaseName || 'Use Case'})

The following code demonstrates common patterns for this type of extension:

\`\`\`javascript
${codeSnippet}
\`\`\`

Use this as a reference for implementing similar functionality, but adapt it to the specific user requirements.
`
}
