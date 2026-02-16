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
  // Only include APIs with a usable endpoint/url. Do NOT include "(no endpoint)" entries,
  // because they bias the Meta Planner into inventing unnecessary network architecture.
  const allApis = plannerApis.filter(a => Boolean(a?.endpoint || a?.url))
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

  // Normalize brittle plan outputs to prefer simplest viable architecture.
  // This is a safety net in case the Meta Planner still over-architects.
  const normalizedMetaPlan = normalizeMetaPlan(metaPlan, planningSummary)

  // Validate task_graph exists
  if (!normalizedMetaPlan.task_graph || !Array.isArray(normalizedMetaPlan.task_graph) || normalizedMetaPlan.task_graph.length === 0) {
    throw new Error('Meta Planner response missing task_graph array')
  }

  // Validate dependency IDs reference valid tasks
  const taskIds = new Set(normalizedMetaPlan.task_graph.map(t => t.id))
  for (const task of normalizedMetaPlan.task_graph) {
    if (task.dependencies) {
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId)) {
          throw new Error(`Task "${task.id}" references unknown dependency "${depId}"`)
        }
      }
    }
  }

  console.log(`✅ [meta-planner-bridge] Meta Planner produced ${normalizedMetaPlan.task_graph.length} tasks`)
  console.log('🧠 [meta-planner-bridge] Raw meta plan output:\n', JSON.stringify(normalizedMetaPlan, null, 2))
  console.log('🧠 [meta-planner-bridge] tokenUsage:', tokenUsage)

  return { metaPlan: normalizedMetaPlan, tokenUsage }
}

/**
 * Normalizes the meta plan to avoid invented architecture:
 * - Disables external APIs unless the planning summary includes at least one usable endpoint.
 * - Disables background unless there is a clear reason (external APIs, scraped webpage/content scripts, workspace).
 * - Removes background.js task if background is disabled.
 * - Repairs dependencies + context_requirements.existing_files references after removals.
 */
function normalizeMetaPlan(metaPlan, planningSummary) {
  const out = structuredClone(metaPlan)

  const hasExternalApiInSummary = /## External APIs\s*\n[\s\S]*https?:\/\//i.test(planningSummary || '')
  const hasScrapedWebpage = /## Scraped Webpage Data/i.test(planningSummary || '')
  const hasWorkspace = /## Workspace Integration/i.test(planningSummary || '')

  // Parse Chrome APIs line (best-effort) to detect "action-only" cases.
  const chromeApisMatch = (planningSummary || '').match(/## Chrome APIs\s*\nLikely required:\s*([^\n]+)/i)
  const chromeApis = chromeApisMatch
    ? chromeApisMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : []
  const isActionOnly = chromeApis.length === 0 || (chromeApis.length === 1 && chromeApis[0].toLowerCase() === 'action')

  // External APIs: only if we have at least one usable endpoint in the summary.
  if (!hasExternalApiInSummary) {
    if (out.architecture?.external_communication) {
      out.architecture.external_communication.uses_external_apis = false
      out.architecture.external_communication.api_details = out.architecture.external_communication.api_details || ''
    }
    if (out.shared_contract?.external_apis) {
      out.shared_contract.external_apis.uses_external_apis = false
      out.shared_contract.external_apis.endpoints = []
    }
    // Also strip context hints that would encourage network usage.
    if (Array.isArray(out.task_graph)) {
      for (const t of out.task_graph) {
        if (t?.context_requirements) t.context_requirements.external_apis = false
      }
    }
  }

  // Background: disable for simple action-only UI with no external APIs, no scraping, no workspace.
  const shouldUseBackground = Boolean(
    out.architecture?.external_communication?.uses_external_apis ||
    out.architecture?.components?.has_content_script ||
    hasScrapedWebpage ||
    hasWorkspace ||
    !isActionOnly
  )

  if (out.architecture?.components) {
    out.architecture.components.has_background = shouldUseBackground
  }
  if (out.shared_contract?.messaging) {
    out.shared_contract.messaging.uses_runtime_messaging = shouldUseBackground ? out.shared_contract.messaging.uses_runtime_messaging : false
  }

  // If background is disabled, remove background.js tasks and repair graph.
  if (!shouldUseBackground && Array.isArray(out.task_graph)) {
    const removedTaskIds = new Set()
    out.task_graph = out.task_graph.filter(t => {
      const isBackground = (t?.file_name || '').toLowerCase() === 'background.js' || t?.id === 'create_background'
      if (isBackground) removedTaskIds.add(t.id)
      return !isBackground
    })

    // Remove dependencies pointing to removed tasks.
    for (const t of out.task_graph) {
      if (Array.isArray(t.dependencies)) {
        t.dependencies = t.dependencies.filter(dep => !removedTaskIds.has(dep))
      }
      if (t?.context_requirements?.existing_files && Array.isArray(t.context_requirements.existing_files)) {
        t.context_requirements.existing_files = t.context_requirements.existing_files.filter(f => f !== 'background.js')
      }
    }

    // Improve data flow to not assume background messaging.
    if (out.architecture?.data_flow?.length) {
      out.architecture.data_flow = out.architecture.data_flow
        .filter(step => !/background/i.test(step))
    }
  }

  // If shared_contract is missing (older planner), add a minimal one so executor can rely on it.
  if (!out.shared_contract) {
    out.shared_contract = {
      notes: 'Auto-added minimal contract (planner did not provide one).',
      ui: {
        page_file: null,
        root_element_id: 'app',
        primary_text_id: 'primaryText'
      },
      messaging: { uses_runtime_messaging: false, request_type: null },
      external_apis: { uses_external_apis: false, endpoints: [] }
    }
  }

  return out
}
