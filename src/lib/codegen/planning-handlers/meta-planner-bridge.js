/**
 * Meta Planner Bridge
 * Formats planning output for the Meta Planner and calls it to produce a task graph.
 */

import { META_PLANNER_PROMPT } from '@/lib/prompts/new-extension/planning/meta-planner.js'
import { llmService } from '@/lib/services/llm-service.js'
import { extractJsonContent, parseJsonWithRetry } from '@/lib/codegen/output-handlers/json-extractor.js'
import { PLANNING_MODELS } from '@/lib/constants.js'

/**
 * Formats the planning result into a readable text summary for the Meta Planner.
 * Only includes sections where data actually exists.
 * @param {Object} planningResult - Result from orchestratePlanning
 * @param {string|null} scrapedWebpageAnalysis - Scraped webpage data (or comment placeholder)
 * @param {Array|null} userProvidedApis - User-provided API configurations
 * @param {string} featureRequest - The user's feature request
 * @param {string|null} userProvidedUrl - User-provided URL that was scraped (when scraping was performed)
 * @returns {string} Readable planning summary
 */
export function formatPlanningSummaryForMetaPlanner(planningResult, scrapedWebpageAnalysis, userProvidedApis, featureRequest, userProvidedUrl = null) {
  const { useCaseResult, externalResourcesResult, frontendType, usesWorkspaceAPIs, workspaceScopes, codeSnippet } = planningResult
  const sections = []

  // Frontend Type
  sections.push(`## Frontend Type\n${frontendType}`)

  // Chrome APIs
  const chromeApis = useCaseResult.required_chrome_apis || []
  if (chromeApis.length > 0) {
    sections.push(`## Likely needed Chrome APIs\n${chromeApis.join(', ')}`)
  }

  // Matched use case
  if (useCaseResult.matched_use_case?.name) {
    sections.push(`## Matched Use Case\n${useCaseResult.matched_use_case.name}`)
  }

  // External APIs (merge planner-detected with user-provided)
  const plannerApis = externalResourcesResult.external_apis || []
  const allApis = [...plannerApis]
  if (userProvidedApis && Array.isArray(userProvidedApis)) {
    for (const api of userProvidedApis) {
      if (api.endpoint) {
        allApis.push({ name: api.name || 'User API', endpoint: api.endpoint })
      }
    }
  }
  if (allApis.length > 0) {
    const apiLines = allApis.map(a => `- ${a.name || 'API'}: ${a.endpoint || a.url || '(no endpoint)'}`)
    sections.push(`## External APIs\n${apiLines.join('\n')}`)
  }

  // Scraped webpage data availability
  const hasRealScrapedData = scrapedWebpageAnalysis && typeof scrapedWebpageAnalysis === 'string' && !scrapedWebpageAnalysis.startsWith('<!--')
  if (hasRealScrapedData) {
    const targetDomains = externalResourcesResult.webpages_to_scrape || []
    const urlInfo = userProvidedUrl
      ? `Website URL: ${userProvidedUrl}`
      : targetDomains.length > 0
        ? `Target domains: ${targetDomains.join(', ')}`
        : ''
    const scrapedSection = urlInfo
      ? `## Scraped Webpage Data\nAvailable: yes (target website structure has been analyzed)\n${urlInfo}`
      : `## Scraped Webpage Data\nAvailable: yes (target website structure has been analyzed)`
    sections.push(scrapedSection)
  }

  // Workspace integration
  if (usesWorkspaceAPIs && workspaceScopes && workspaceScopes.length > 0) {
    sections.push(`## Workspace Integration\nScopes: ${workspaceScopes.join(', ')}`)
  }

  // Code snippet reference
  if (codeSnippet) {
    sections.push(`## Code Snippet\nA reference code snippet is available for this use case.`)
  }

  return sections.join('\n\n')
}

/**
 * Calls the Meta Planner to produce a task graph from the planning summary.
 * @param {string} featureRequest - The user's feature request
 * @param {string} planningSummary - Readable planning summary from formatPlanningSummaryForMetaPlanner
 * @returns {Promise<{metaPlan: Object, tokenUsage: Object}>}
 */
export async function callMetaPlanner(featureRequest, planningSummary) {
  // Build prompt from template
  const prompt = META_PLANNER_PROMPT
    .replace('{USER_REQUEST}', featureRequest)
    .replace('{PLANNING_SUMMARY}', planningSummary)

  console.log('🧠 [meta-planner-bridge] Meta Planner raw prompt :\n', prompt)

  const response = await llmService.createResponse({
    provider: 'anthropic',
    model: PLANNING_MODELS.META_PLANNER,
    input: prompt,
    temperature: 0.2,
    max_output_tokens: 4096,
    store: false
  })

  const outputText = response?.output_text || ''
  const tokenUsage = response?.usage || { input_tokens: 0, output_tokens: 0 }

  // Parse JSON from response
  const jsonContent = extractJsonContent(outputText)
  const metaPlan = parseJsonWithRetry(jsonContent)

  if (!metaPlan) {
    throw new Error('Meta Planner returned invalid JSON')
  }

  // Validate task_graph exists
  if (!metaPlan.task_graph || !Array.isArray(metaPlan.task_graph) || metaPlan.task_graph.length === 0) {
    throw new Error('Meta Planner response missing task_graph array')
  }

  // Validate dependency IDs reference valid tasks
  const taskIds = new Set(metaPlan.task_graph.map(t => t.id))
  for (const task of metaPlan.task_graph) {
    if (task.dependencies) {
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId)) {
          throw new Error(`Task "${task.id}" references unknown dependency "${depId}"`)
        }
      }
    }
  }

  console.log(`✅ [meta-planner-bridge] Meta Planner produced ${metaPlan.task_graph.length} tasks`)
  console.log('🧠 [meta-planner-bridge] Raw meta plan output:\n', JSON.stringify(metaPlan, null, 2))
  console.log('🧠 [meta-planner-bridge] tokenUsage:', tokenUsage)

  return { metaPlan, tokenUsage }
}
