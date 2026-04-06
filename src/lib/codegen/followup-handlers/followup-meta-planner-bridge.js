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
  max_uses: 3
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

  for (const candidate of prioritized) {
    const parsed = parseJsonWithRetry(candidate)
    if (parsed && typeof parsed === 'object') return parsed
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
 * Calls the Followup Meta Planner to produce a patch task graph from the existing extension state.
 * @param {string} userRequest - The user's follow-up request
 * @param {Object} relevantFiles - Selected existing files (path → content) — used downstream by the executor, not sent to the planner
 * @param {Object} fileAnalysis - Raw result from analyzeExtensionFiles (passed to formatFileSummariesForPlanning)
 * @param {string} planningJustification - Justification from the pre-planning agent
 * @param {Array<Object>|null} images - Optional image attachments for multimodal planning
 * @param {string|null} sessionId - Session/project identifier for conversation history
 * @returns {Promise<{followupPlan: Object, tokenUsage: Object}>}
 */
export async function callFollowupMetaPlanner(userRequest, relevantFiles, fileAnalysis, planningJustification, images = null, sessionId = null) {
  void sessionId
  const fileSummaries = formatFileSummariesForFollowupPlanner(fileAnalysis)
  console.log('📊 [followup-meta-planner-bridge] File summaries:\n', fileSummaries)

  const prompt = FOLLOWUP_META_PLANNER_PROMPT
    .replace('{USER_REQUEST}', userRequest || '')
    .replace('{FILE_SUMMARIES}', fileSummaries)
    .replace('{PLANNING_JUSTIFICATION}', planningJustification || '')

  console.log('🧠 [followup-meta-planner-bridge] Raw prompt:\n', prompt)

  let content = prompt
  if (images && images.length > 0) {
    const imageBlocks = images
      .map(parseImageToAnthropicFormat)
      .filter(Boolean)
    content = [{ type: 'text', text: prompt }, ...imageBlocks]
    console.log(`📸 [followup-meta-planner-bridge] Passing ${images.length} images to followup meta planner`)
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: PLANNING_MODELS.META_PLANNER,
    messages: [{ role: 'user', content }],
    temperature: 0.2,
    max_tokens: 4096,
    tools: [FOLLOWUP_META_PLANNER_WEB_SEARCH_TOOL]
  })

  const responseBlocks = Array.isArray(response.content) ? response.content : []
  const webSearchToolCalls = responseBlocks.filter(
    (block) => block?.type === 'server_tool_use' && block?.name === 'web_search'
  ).length
  const webSearchToolResults = responseBlocks.filter(
    (block) => block?.type === 'web_search_tool_result'
  ).length
  const webSearchRequests = response.usage?.server_tool_use?.web_search_requests ?? 0
  console.log('🔎 [followup-meta-planner-bridge] web search usage:', {
    webSearchRequests,
    webSearchToolCalls,
    webSearchToolResults
  })

  const outputText = response.content
    ?.filter(block => block.type === 'text')
    .map(block => block.text)
    .join('') || ''
  const tokenUsage = {
    input_tokens: response.usage?.input_tokens ?? 0,
    output_tokens: response.usage?.output_tokens ?? 0
  }

  // Parse JSON from response text blocks (tool use blocks may appear before text).
  const followupPlan = parsePlannerJsonFromText(outputText)

  if (!followupPlan) {
    console.error('❌ [followup-meta-planner-bridge] Could not parse planner JSON. Raw output excerpt:', outputText.slice(0, 800))
    throw new Error('Followup Meta Planner returned invalid JSON')
  }

  // Validate task_graph exists and is non-empty
  if (!followupPlan.task_graph || !Array.isArray(followupPlan.task_graph)) {
    throw new Error('Followup Meta Planner response missing task_graph array')
  }

  // Validate dependency IDs reference valid tasks
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

  return { followupPlan, tokenUsage }
}
