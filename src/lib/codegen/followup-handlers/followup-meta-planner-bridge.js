/**
 * Follow-up Meta Planner Bridge
 * Formats inputs, calls the followup meta planner LLM, and validates output.
 */

import { FOLLOWUP_META_PLANNER_PROMPT } from '@/lib/prompts/followup/planning/meta-planner.js'
import { llmService } from '@/lib/services/llm-service.js'
import { extractJsonContent, parseJsonWithRetry } from '@/lib/codegen/output-handlers/json-extractor.js'
import { PLANNING_MODELS } from '@/lib/constants.js'
import { formatFileSummariesForFollowupPlanner } from '@/lib/codegen/file-analysis/index.js'

/**
 * Calls the Followup Meta Planner to produce a patch task graph from the existing extension state.
 * @param {string} userRequest - The user's follow-up request
 * @param {Object} relevantFiles - Selected existing files (path → content) — used downstream by the executor, not sent to the planner
 * @param {Object} fileAnalysis - Raw result from analyzeExtensionFiles (passed to formatFileSummariesForPlanning)
 * @param {string} planningJustification - Justification from the pre-planning agent
 * @returns {Promise<{followupPlan: Object, tokenUsage: Object}>}
 */
export async function callFollowupMetaPlanner(userRequest, relevantFiles, fileAnalysis, planningJustification) {
  const fileSummaries = formatFileSummariesForFollowupPlanner(fileAnalysis)
  console.log('📊 [followup-meta-planner-bridge] File summaries:\n', fileSummaries)

  const prompt = FOLLOWUP_META_PLANNER_PROMPT
    .replace('{USER_REQUEST}', userRequest || '')
    .replace('{FILE_SUMMARIES}', fileSummaries)
    .replace('{PLANNING_JUSTIFICATION}', planningJustification || '')

  console.log('🧠 [followup-meta-planner-bridge] Raw prompt:\n', prompt)

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
  const followupPlan = parseJsonWithRetry(jsonContent)

  if (!followupPlan) {
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
