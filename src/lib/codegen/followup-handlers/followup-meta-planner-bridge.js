/**
 * Follow-up Meta Planner Bridge
 * Formats inputs, calls the followup meta planner LLM, and validates output.
 */

import { FOLLOWUP_META_PLANNER_PROMPT } from '@/lib/prompts/followup/planning/meta-planner.js'
import Anthropic from '@anthropic-ai/sdk'
import { extractJsonContent, parseJsonWithRetry } from '@/lib/codegen/output-handlers/json-extractor.js'
import { PLANNING_MODELS } from '@/lib/constants.js'
import { formatFileSummariesForFollowupPlanner } from '@/lib/codegen/file-analysis/index.js'

const FOLLOWUP_META_PLANNER_WEB_SEARCH_TOOL = {
  type: 'web_search_20260209',
  name: 'web_search',
  max_uses: 2
}

function tryParseJsonCandidate(candidate) {
  if (!candidate || typeof candidate !== 'string') return null
  try {
    return JSON.parse(candidate)
  } catch {
    return parseJsonWithRetry(candidate)
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

  const prioritized = [...new Set(candidates)].sort((a, b) => {
    const aHasTaskGraph = /"task_graph"\s*:/.test(a)
    const bHasTaskGraph = /"task_graph"\s*:/.test(b)
    if (aHasTaskGraph !== bHasTaskGraph) return aHasTaskGraph ? -1 : 1
    return b.length - a.length
  })

  console.log('🧪 [followup-meta-planner-bridge] JSON candidate stats:', {
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
      console.log('✅ [followup-meta-planner-bridge] Parsed planner JSON candidate:', {
        candidateIndex: i,
        candidateLength: candidate.length,
        containsTaskGraphKey: /"task_graph"\s*:/.test(candidate),
        startsWithFence: candidate.trim().startsWith('```')
      })
      return parsed
    }
  }
  return null
}

function tryExtractQueryFromPartialToolInput(accumulated) {
  if (!accumulated || typeof accumulated !== 'string') return null
  try {
    const o = JSON.parse(accumulated)
    if (o && typeof o.query === 'string' && o.query.trim()) return o.query.trim()
  } catch {
    /* partial */
  }
  const m = accumulated.match(/"query"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (m) {
    return m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim() || null
  }
  return null
}

function parseImageToAnthropicFormat(image) {
  const dataUrl = image?.data || image?.url
  if (!dataUrl || typeof dataUrl !== 'string') return null

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null

  const mediaType = match[1]
  const base64Data = match[2]
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(mediaType)) return null

  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: mediaType,
      data: base64Data
    }
  }
}

/**
 * Streams follow-up Meta Planner progress for SSE (live web search lines).
 * Yields `planning_progress` chunks, then `{ type: 'followup_meta_planner_result', followupPlan, tokenUsage }`.
 */
export async function* streamFollowupMetaPlanner(userRequest, relevantFiles, fileAnalysis, planningJustification, images = null, sessionId = null, conversationHistory = []) {
  void sessionId
  const fileSummaries = formatFileSummariesForFollowupPlanner(fileAnalysis)
  console.log('📊 [followup-meta-planner-bridge] File summaries:\n', fileSummaries)

  // E1: Format conversation history
  let historyContext = '';
  if (conversationHistory && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-6);
    historyContext = recent
      .map(msg => `[${msg.role}]: ${(msg.content || '').substring(0, 300)}`)
      .join('\n');
  }

  const prompt = FOLLOWUP_META_PLANNER_PROMPT
    .replace('{USER_REQUEST}', userRequest || '')
    .replace('{FILE_SUMMARIES}', fileSummaries)
    .replace('{PLANNING_JUSTIFICATION}', planningJustification || '')
    .replace('{CONVERSATION_HISTORY}', historyContext)

  console.log('🧠 [followup-meta-planner-bridge] Raw prompt:\n', prompt)

  let content = prompt
  if (images && images.length > 0) {
    const imageBlocks = images
      .map(parseImageToAnthropicFormat)
      .filter(Boolean)
    content = [{ type: 'text', text: prompt }, ...imageBlocks]
    console.log(`📸 [followup-meta-planner-bridge] Passing ${images.length} images to followup meta planner`)
  }

  yield {
    type: 'planning_progress',
    phase: 'meta_planner',
    content: 'Running follow-up planner…',
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = await client.messages.create({
    model: PLANNING_MODELS.META_PLANNER,
    messages: [{ role: 'user', content }],
    temperature: 0.2,
    max_tokens: 4096,
    tools: [FOLLOWUP_META_PLANNER_WEB_SEARCH_TOOL],
    stream: true
  })

  const textByIndex = new Map()
  const toolUseByIndex = new Map()
  const responseBlocks = []
  let usageInputTokens = 0
  let usageOutputTokens = 0

  let webSearchRound = 0
  let lastQueryEmitAt = 0
  let lastEmittedQuery = ''
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
        console.log('🔎 [followup-meta-planner-bridge] web search started', {
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
          index: event.index,
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
        const contentItems = Array.isArray(block.content) ? block.content : []
        const resultCount = contentItems.filter(item => item?.type === 'web_search_result').length
        const errorEntry = contentItems.find(item => item?.type === 'web_search_tool_result_error')
        const errorCode = errorEntry?.error_code || null
        console.log('🔎 [followup-meta-planner-bridge] web search result received', {
          toolUseId: block.tool_use_id || null,
          resultCount,
          errorCode
        })
        responseBlocks.push({
          type: 'web_search_tool_result',
          index: event.index,
          content: contentItems
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
              ? 'Composing patch plan from search results…'
              : 'Writing patch plan…',
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
      const contentValue = block?.content
      if (!contentValue) return null
      const payload = Array.isArray(contentValue) ? contentValue[0] : contentValue
      return payload?.type === 'web_search_tool_result_error' ? payload.error_code : null
    })
    .filter(Boolean)
  const webSearchResultCounts = responseBlocks
    .filter((block) => block?.type === 'web_search_tool_result')
    .map((block) => (Array.isArray(block?.content) ? block.content.filter(item => item?.type === 'web_search_result').length : 0))
  console.log('🔎 [followup-meta-planner-bridge] web search usage:', {
    webSearchRequests,
    webSearchToolCalls,
    webSearchToolResults,
    webSearchQueries,
    webSearchResultCounts,
    webSearchErrors
  })

  const outputText = responseBlocks
    ?.filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n') || ''
  const tokenUsage = {
    input_tokens: usageInputTokens,
    output_tokens: usageOutputTokens
  }

  yield {
    type: 'planning_progress',
    phase: 'planning',
    content: 'Validating patch plan…',
  }

  const followupPlan = parsePlannerJsonFromText(outputText)

  if (!followupPlan) {
    console.error('❌ [followup-meta-planner-bridge] Could not parse planner JSON. Raw output excerpt:', outputText.slice(0, 800))
    throw new Error('Followup Meta Planner returned invalid JSON')
  }

  if (!followupPlan.task_graph || !Array.isArray(followupPlan.task_graph)) {
    throw new Error('Followup Meta Planner response missing task_graph array')
  }

  const taskIds = new Set(followupPlan.task_graph.map(t => t.id))
  for (const task of followupPlan.task_graph) {
    if (task.dependencies) {
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId)) {
          throw new Error(`Task "${task.id}" references unknown dependency "${depId}"`)
        }
      }
    }
  }

  console.log(`✅ [followup-meta-planner-bridge] Produced ${followupPlan.task_graph.length} tasks`)
  console.log('🧠 [followup-meta-planner-bridge] Plan:\n', JSON.stringify(followupPlan, null, 2))
  console.log('🧠 [followup-meta-planner-bridge] tokenUsage:', tokenUsage)

  yield { type: 'followup_meta_planner_result', followupPlan, tokenUsage }
}

/**
 * Calls the Followup Meta Planner to produce a patch task graph from the existing extension state.
 * @param {string} userRequest - The user's follow-up request
 * @param {Object} relevantFiles - Selected existing files (path → content) — used downstream by the executor, not sent to the planner
 * @param {Object} fileAnalysis - Raw result from analyzeExtensionFiles (passed to formatFileSummariesForPlanning)
 * @param {string} planningJustification - Justification from the pre-planning agent
 * @param {Array<Object>|null} images - Optional image attachments for multimodal planning
 * @param {string|null} sessionId - Session/project identifier for conversation history
 * @returns {Promise<{followupPlan: Object, tokenUsage: Object}>}
 */
export async function callFollowupMetaPlanner(userRequest, relevantFiles, fileAnalysis, planningJustification, images = null, sessionId = null, conversationHistory = []) {
  for await (const chunk of streamFollowupMetaPlanner(userRequest, relevantFiles, fileAnalysis, planningJustification, images, sessionId, conversationHistory)) {
    if (chunk.type === 'followup_meta_planner_result') {
      return { followupPlan: chunk.followupPlan, tokenUsage: chunk.tokenUsage }
    }
  }
  throw new Error('Follow-up meta planner stream ended without result')
}
