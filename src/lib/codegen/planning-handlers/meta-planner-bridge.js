/**
 * Meta Planner Bridge
 * Formats planning output for the Meta Planner and calls it to produce a task graph.
 */

import Anthropic from '@anthropic-ai/sdk'
import { META_PLANNER_PROMPT } from '@/lib/prompts/new-extension/planning/meta-planner.js'
import { extractJsonContent, parseJsonWithRetry } from '@/lib/codegen/output-handlers/json-extractor.js'
import { PLANNING_MODELS } from '@/lib/constants.js'

const META_PLANNER_WEB_SEARCH_TOOL = {
  type: 'web_search_20260209',
  name: 'web_search',
  max_uses: 1
}

function tryParseJsonCandidate(candidate) {
  if (!candidate || typeof candidate !== 'string') return null
  try {
    return JSON.parse(candidate)
  } catch {
    return null
  }
}

function parsePlannerJsonFromText(outputText) {
  const text = typeof outputText === 'string' ? outputText : ''
  const candidates = []

  const fencedJsonMatches = [...text.matchAll(/```json\s*([\s\S]*?)\s*```/gi)].map(m => m[1]?.trim()).filter(Boolean)
  const fencedAnyMatches = [...text.matchAll(/```\s*([\s\S]*?)\s*```/g)].map(m => m[1]?.trim()).filter(Boolean)
  candidates.push(...fencedJsonMatches, ...fencedAnyMatches)

  const extracted = extractJsonContent(text)
  if (extracted) candidates.push(extracted)
  if (text) candidates.push(text)

  // Prefer plain JSON payloads over markdown/codefenced variants.
  const prioritized = [...new Set(candidates)].sort((a, b) => scoreCandidate(b) - scoreCandidate(a))

  console.log('🧪 [meta-planner-bridge] JSON candidate stats:', {
    totalCandidates: prioritized.length,
    fencedJsonMatches: fencedJsonMatches.length,
    fencedAnyMatches: fencedAnyMatches.length,
    hasExtractedJson: Boolean(extracted),
    textLength: text.length,
    taskGraphCandidateCount: prioritized.filter(c => /"task_graph"\s*:/.test(c)).length
  })

  for (let i = 0; i < prioritized.length; i++) {
    const candidate = prioritized[i]
    const parsed = tryParseJsonCandidate(candidate)
    if (parsed && typeof parsed === 'object') {
      console.log('✅ [meta-planner-bridge] Parsed planner JSON candidate:', {
        candidateIndex: i,
        candidateLength: candidate.length,
        containsTaskGraphKey: /"task_graph"\s*:/.test(candidate),
        startsWithFence: candidate.trim().startsWith('```')
      })
      return parsed
    }
  }

  // Recovery path: use tolerant parser only once on the best candidate to avoid noisy logs.
  const fallbackCandidate = prioritized[0] || ''
  const recovered = parseJsonWithRetry(fallbackCandidate)
  if (recovered && typeof recovered === 'object') {
    console.log('✅ [meta-planner-bridge] Parsed planner JSON via recovery on top candidate:', {
      candidateLength: fallbackCandidate.length,
      containsTaskGraphKey: /"task_graph"\s*:/.test(fallbackCandidate)
    })
    return recovered
  }
  return null
}

function scoreCandidate(candidate) {
  const text = typeof candidate === 'string' ? candidate.trim() : ''
  if (!text) return -100
  let score = 0
  if (/"task_graph"\s*:/.test(text)) score += 100
  if (/"summary"\s*:/.test(text)) score += 25
  if (text.startsWith('{')) score += 20
  if (!text.startsWith('```')) score += 15
  score += Math.min(text.length / 2000, 10)
  return score
}

/** Best-effort query string from streaming tool input JSON (may be partial). */
function tryExtractQueryFromPartialToolInput(accumulated) {
  if (!accumulated || typeof accumulated !== 'string') return null
  try {
    const o = JSON.parse(accumulated)
    if (o && typeof o.query === 'string' && o.query.trim()) return o.query.trim()
  } catch {
    /* partial JSON */
  }
  const m = accumulated.match(/"query"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (m) {
    return m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim() || null
  }
  return null
}

function buildDynamicSection(featureRequest, planningSummary) {
  return `## Input\n\n<user_request>\n${featureRequest}\n</user_request>\n\n<planning_summary>\n${planningSummary}\n</planning_summary>`
}

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

  // External APIs: prefer user-validated APIs when provided; otherwise use planner-detected
  const plannerApis = externalResourcesResult.external_apis || []
  let allApis = []
  if (userProvidedApis && Array.isArray(userProvidedApis) && userProvidedApis.length > 0) {
    // User validated/customized — use as sole source (avoids duplicating planner + user)
    allApis = userProvidedApis
      .filter(a => a?.endpoint)
      .map(a => ({ name: a.name || 'User API', endpoint: a.endpoint }))
  } else if (Array.isArray(userProvidedApis) && userProvidedApis.length === 0) {
    // User explicitly declined all APIs — include nothing
    allApis = []
  } else {
    // No user input yet (null/undefined) — use planner-detected APIs with usable endpoints
    allApis = plannerApis.filter(a => Boolean(a?.endpoint || a?.endpoint_url || a?.url))
  }
  if (allApis.length > 0) {
    const apiLines = allApis.map(a => `- ${a.name || 'API'}: ${a.endpoint || a.endpoint_url || a.url || '(no endpoint)'}`)
    sections.push(`## External APIs\n${apiLines.join('\n')}`)
  }

  // NPM packages (whitelisted, for bundling)
  const npmPackages = externalResourcesResult.npm_packages || []
  if (npmPackages.length > 0) {
    const pkgLines = npmPackages.map(p => `- ${p.name}: ${p.purpose || 'Use as needed with '}`)
    sections.push(`## Available NPM Packages\n${pkgLines.join('\n')}`)
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
 * Streams Meta Planner progress (including live web search steps) for SSE clients.
 * Yields `{ type: 'planning_progress', ... }` chunks, then a final `{ type: 'meta_planner_result', metaPlan, tokenUsage }`.
 */
export async function* streamMetaPlanner(featureRequest, planningSummary) {
  console.log('🧠 [meta-planner-bridge] Calling Meta Planner (streaming)')

  yield {
    type: 'planning_progress',
    phase: 'meta_planner',
    content: 'Running meta planner…',
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = await client.messages.create({
    model: PLANNING_MODELS.META_PLANNER,
    max_tokens: 4096,
    temperature: 0.2,
    system: `${META_PLANNER_PROMPT}\n\n${buildDynamicSection(featureRequest, planningSummary)}`,
    tools: [META_PLANNER_WEB_SEARCH_TOOL],
    stream: true,
    messages: [
      { role: 'user', content: 'Generate the task graph.' }
    ]
  })

  const textByIndex = new Map()
  const toolUseByIndex = new Map()
  const responseBlocks = []
  let usageInputTokens = 0
  let usageOutputTokens = 0

  let webSearchRound = 0
  let lastQueryEmitAt = 0
  let lastEmittedQuery = ''
  /** After tool results, the model may take several seconds to stream JSON — signal first text output so the UI does not look stuck. */
  let yieldedSynthesisLine = false

  for await (const event of stream) {
    if (event.type === 'content_block_start') {
      const block = event.content_block
      if (!block) continue

      if (block.type === 'text') {
        textByIndex.set(event.index, block.text || '')
      }

      if (block.type === 'server_tool_use' && block.name === 'web_search') {
        webSearchRound += 1
        const query = block.input?.query || null
        console.log('🔎 [meta-planner-bridge] web search started', {
          toolUseId: block.id || null,
          query
        })
        toolUseByIndex.set(event.index, {
          id: block.id || null,
          name: block.name,
          inputJson: ''
        })
        responseBlocks.push({
          type: 'server_tool_use',
          name: block.name,
          input: block.input || {}
        })
        const line = query
          ? `Search ${webSearchRound}: ${query}`
          : `Web search ${webSearchRound}…`
        lastEmittedQuery = query || ''
        yield {
          type: 'planning_progress',
          phase: 'web_search',
          content: line,
          webSearchQuery: query || undefined,
          webSearchRound,
          webSearchStep: 'started',
        }
        lastQueryEmitAt = Date.now()
      }

      if (block.type === 'web_search_tool_result') {
        const content = Array.isArray(block.content) ? block.content : []
        const resultCount = content.filter(item => item?.type === 'web_search_result').length
        const errorEntry = content.find(item => item?.type === 'web_search_tool_result_error')
        const errorCode = errorEntry?.error_code || null
        console.log('🔎 [meta-planner-bridge] web search result received', {
          toolUseId: block.tool_use_id || null,
          resultCount,
          errorCode
        })
        responseBlocks.push({
          type: 'web_search_tool_result',
          content
        })
        const summary = errorCode
          ? `Search ${webSearchRound}: issue (${errorCode})`
          : `Search ${webSearchRound}: ${resultCount} result(s) — reading…`
        yield {
          type: 'planning_progress',
          phase: 'web_search',
          content: summary,
          webSearchQuery: lastEmittedQuery || undefined,
          webSearchRound,
          webSearchStep: 'results',
          webSearchResultCount: resultCount,
          webSearchError: errorCode || undefined,
        }
      }
    }

    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      const deltaText = event.delta.text || ''
      if (!yieldedSynthesisLine && deltaText.length > 0) {
        yieldedSynthesisLine = true
        yield {
          type: 'planning_progress',
          phase: 'planning',
          content:
            webSearchRound > 0
              ? 'Composing build plan from search results…'
              : 'Writing task graph…',
        }
      }
      const prev = textByIndex.get(event.index) || ''
      textByIndex.set(event.index, prev + deltaText)
    }

    if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
      const toolUse = toolUseByIndex.get(event.index)
      if (toolUse && typeof event.delta.partial_json === 'string') {
        toolUse.inputJson += event.delta.partial_json
        const q = tryExtractQueryFromPartialToolInput(toolUse.inputJson)
        if (q && q !== lastEmittedQuery && (Date.now() - lastQueryEmitAt > 120 || q.length > lastEmittedQuery.length + 8)) {
          lastEmittedQuery = q
          lastQueryEmitAt = Date.now()
          yield {
            type: 'planning_progress',
            phase: 'web_search',
            content: `Search ${webSearchRound}: ${q}`,
            webSearchQuery: q,
            webSearchRound,
            webSearchStep: 'query_stream',
          }
        }
      }
    }

    if (event.type === 'message_delta' && event.usage) {
      usageInputTokens = event.usage.input_tokens ?? usageInputTokens
      usageOutputTokens = event.usage.output_tokens ?? usageOutputTokens
    }
  }

  for (const [index, text] of textByIndex.entries()) {
    responseBlocks.push({ type: 'text', index, text })
  }
  responseBlocks.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))

  const webSearchToolCalls = responseBlocks.filter(
    (block) => block?.type === 'server_tool_use' && block?.name === 'web_search'
  ).length
  const webSearchToolResults = responseBlocks.filter(
    (block) => block?.type === 'web_search_tool_result'
  ).length
  const webSearchRequests = webSearchToolCalls
  const webSearchQueries = responseBlocks
    .filter((block) => block?.type === 'server_tool_use' && block?.name === 'web_search')
    .map((block) => block?.input?.query)
    .filter(Boolean)
  const webSearchErrors = responseBlocks
    .filter((block) => block?.type === 'web_search_tool_result')
    .map((block) => {
      const content = block?.content
      if (!content) return null
      const payload = Array.isArray(content) ? content[0] : content
      return payload?.type === 'web_search_tool_result_error' ? payload.error_code : null
    })
    .filter(Boolean)
  const webSearchResultCounts = responseBlocks
    .filter((block) => block?.type === 'web_search_tool_result')
    .map((block) => (Array.isArray(block?.content) ? block.content.filter(item => item?.type === 'web_search_result').length : 0))
  console.log('🔎 [meta-planner-bridge] web search usage:', {
    webSearchRequests,
    webSearchToolCalls,
    webSearchToolResults,
    webSearchQueries,
    webSearchResultCounts,
    webSearchErrors
  })

  const outputText = responseBlocks
    .filter((block) => block?.type === 'text')
    .map((block) => block.text)
    .join('\n')
  const tokenUsage = {
    input_tokens: usageInputTokens,
    output_tokens: usageOutputTokens
  }

  yield {
    type: 'planning_progress',
    phase: 'planning',
    content: 'Validating and normalizing plan…',
  }

  // Parse JSON from response text blocks (tool use blocks may appear before text).
  const metaPlan = parsePlannerJsonFromText(outputText)

  if (!metaPlan) {
    console.error('❌ [meta-planner-bridge] Could not parse planner JSON. Raw output excerpt:', outputText.slice(0, 800))
    throw new Error('Meta Planner returned invalid JSON')
  }

  // Normalize brittle plan outputs to prefer simplest viable architecture.
  // This is a safety net in case the Meta Planner still over-architects.
  const normalizedMetaPlan = normalizeMetaPlan(metaPlan, planningSummary, featureRequest)

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

  yield { type: 'meta_planner_result', metaPlan: normalizedMetaPlan, tokenUsage }
}

/**
 * Calls the Meta Planner to produce a task graph from the planning summary.
 * @param {string} featureRequest - The user's feature request
 * @param {string} planningSummary - Readable planning summary from formatPlanningSummaryForMetaPlanner
 * @returns {Promise<{metaPlan: Object, tokenUsage: Object}>}
 */
export async function callMetaPlanner(featureRequest, planningSummary) {
  for await (const chunk of streamMetaPlanner(featureRequest, planningSummary)) {
    if (chunk.type === 'meta_planner_result') {
      return { metaPlan: chunk.metaPlan, tokenUsage: chunk.tokenUsage }
    }
  }
  throw new Error('Meta Planner stream ended without result')
}

/**
 * Normalizes the meta plan to avoid invented architecture:
 * - Disables external APIs unless the planning summary includes at least one usable endpoint.
 * - Disables background unless there is a clear reason (external APIs, scraped webpage/content scripts, workspace).
 * - Removes background.js task if background is disabled.
 * - Repairs dependencies + context_requirements.existing_files references after removals.
 */
function normalizeMetaPlan(metaPlan, planningSummary, featureRequest = '') {
  const out = structuredClone(metaPlan)

  const hasExternalApiInSummary = /## External APIs\s*\n[\s\S]*https?:\/\//i.test(planningSummary || '')
  const hasNpmPackagesInSummary = /## (?:Available )?NPM Packages\s*\n/i.test(planningSummary || '')
  const hasScrapedWebpage = /## Scraped Webpage Data/i.test(planningSummary || '')
  const hasWorkspace = /## Workspace Integration/i.test(planningSummary || '')

  // Parse Chrome APIs line - matches format from formatPlanningSummaryForMetaPlanner: "## Likely needed Chrome APIs\n..."
  const chromeApisMatch = (planningSummary || '').match(/## (?:Likely needed )?Chrome APIs\s*\n([^\n]+)/i)
  const chromeApis = chromeApisMatch
    ? chromeApisMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : []
  const chromeApisLower = chromeApis.map(a => a.toLowerCase())
  const hasCommandsApi = chromeApisLower.includes('commands')
  const hasKeyboardShortcutInRequest = /keyboard\s+shortcut|keyboard shortcut|shortcut\s+to\s+(close|open|trigger)/i.test(featureRequest || '')
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

  // NPM packages: when planning detected whitelisted packages, ensure JS tasks get external_resources context
  if (hasNpmPackagesInSummary && Array.isArray(out.task_graph)) {
    const jsExtensions = ['.js', '.mjs']
    for (const t of out.task_graph) {
      const fileName = t?.file_name || ''
      const isJsFile = jsExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
      if (isJsFile && t?.context_requirements) {
        t.context_requirements.npm_packages = true
      }
    }
  }

  // Background: disable for simple action-only UI with no external APIs, no scraping, no workspace.
  // chrome.commands (keyboard shortcuts) REQUIRES a background script to handle onCommand events.
  const shouldUseBackground = Boolean(
    out.architecture?.external_communication?.uses_external_apis ||
    out.architecture?.components?.has_content_script ||
    hasScrapedWebpage ||
    hasWorkspace ||
    hasCommandsApi ||
    hasKeyboardShortcutInRequest ||
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
      external_apis: { uses_external_apis: false, endpoints: [] },
      storage: { namespace: 'none', keys: {} }
    }
  }

  // Backfill storage section if planner produced a contract without it (older plan).
  if (!out.shared_contract.storage) {
    const stateNamespace = out.architecture?.state_management || 'none'
    out.shared_contract.storage = {
      namespace: stateNamespace,
      keys: {}
    }
  }

  return out
}
