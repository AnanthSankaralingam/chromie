/**
 * Task Executor
 * Generates a single file by building a prompt from the task executor template,
 * injecting the right context sections and frontend module, then calling the LLM.
 */

import { TASK_EXECUTOR_PROMPT } from './task-executor-prompt.js'
import { getFrontendModule } from './frontend-modules/index.js'
import { llmService } from '@/lib/services/llm-service.js'
import { DEFAULT_MODEL } from '@/lib/constants.js'
import { extractJsonContent, parseJsonWithRetry } from '@/lib/codegen/output-handlers/json-extractor.js'

/**
 * Files whose tasks should receive the frontend module injection.
 */
const UI_FILE_PATTERNS = [
  'popup', 'sidepanel', 'overlay', 'newtab', 'content', 'styles'
]

function isUiRelatedFile(fileName) {
  const lower = fileName.toLowerCase()
  return UI_FILE_PATTERNS.some(p => lower.includes(p))
}

/**
 * Strips markdown code fences from LLM output.
 */
function stripMarkdownFences(text) {
  if (!text) return text
  let out = text.trim()
  // Remove opening fence (```json, ```javascript, ```html, ```css, ```)
  out = out.replace(/^```(?:json|javascript|js|html|css|markdown|md)?\s*\n?/, '')
  // Remove closing fence
  out = out.replace(/\n?```\s*$/, '')
  return out.trim()
}

/**
 * Builds context sections string from task.context_requirements and execution context.
 */
function buildContextSections(task, executionContext) {
  const { formattedPlanningOutputs, scrapedWebpageAnalysis, completedFiles } = executionContext
  const ctx = task.context_requirements || {}
  const parts = []

  if (ctx.use_case && formattedPlanningOutputs?.USE_CASE_CHROME_APIS) {
    parts.push(`<use_case_and_chrome_apis>\n${formattedPlanningOutputs.USE_CASE_CHROME_APIS}\n</use_case_and_chrome_apis>`)
  }

  if (ctx.external_apis && formattedPlanningOutputs?.EXTERNAL_RESOURCES) {
    parts.push(`<external_resources>\n${formattedPlanningOutputs.EXTERNAL_RESOURCES}\n</external_resources>`)
  }

  if (ctx.scraped_webpage && scrapedWebpageAnalysis && typeof scrapedWebpageAnalysis === 'string' && !scrapedWebpageAnalysis.startsWith('<!--')) {
    parts.push(`<scraped_webpage_data>\n${scrapedWebpageAnalysis}\n</scraped_webpage_data>`)
  }

  if (ctx.workspace_scopes && formattedPlanningOutputs?.WORKSPACE_AUTH) {
    parts.push(`<workspace_authentication>\n${formattedPlanningOutputs.WORKSPACE_AUTH}\n</workspace_authentication>`)
  }

  // Inject existing (completed) files this task depends on
  const depFiles = ctx.existing_files || []
  if (depFiles.length > 0 && completedFiles) {
    const fileEntries = depFiles
      .filter(f => completedFiles.has(f))
      .map(f => `<file path="${f}">\n${completedFiles.get(f)}\n</file>`)
    if (fileEntries.length > 0) {
      parts.push(`<existing_files>\n${fileEntries.join('\n')}\n</existing_files>`)
    }
  }

  return parts.join('\n\n')
}

/**
 * Executes a single file-generation task.
 * @param {Object} task - A task from the meta planner's task_graph
 * @param {Object} executionContext - Shared context for the execution run
 * @param {Object} executionContext.metaPlan - The full meta plan
 * @param {Object} executionContext.formattedPlanningOutputs - Formatted planning strings
 * @param {string|null} executionContext.scrapedWebpageAnalysis - Scraped data
 * @param {string} executionContext.frontendType - e.g. 'popup', 'sidepanel'
 * @param {string} executionContext.featureRequest - Original user request
 * @param {string|null} executionContext.modelOverride - Optional model override
 * @param {Map} executionContext.completedFiles - Map of fileName -> content for completed files
 * @returns {Promise<{fileName: string, content: string, tokenUsage: Object}>}
 */
export async function executeTask(task, executionContext) {
  const { metaPlan, frontendType, modelOverride } = executionContext

  // Build summary, architecture, and global plan from metaPlan
  const summary = metaPlan.summary
    ? `${metaPlan.summary.purpose}\nPrimary action: ${metaPlan.summary.primary_user_action}\nCapabilities: ${(metaPlan.summary.core_capabilities || []).join(', ')}`
    : ''

  // Build comprehensive architecture summary including components and file structure
  const architecture = metaPlan.architecture
    ? `Frontend: ${metaPlan.architecture.frontend_type}
Components:
${metaPlan.architecture.components ? Object.entries(metaPlan.architecture.components).map(([k, v]) => `  - ${k}: ${v}`).join('\n') : '  (none specified)'}
Data flow:
${(metaPlan.architecture.data_flow || []).join('\n')}`
    : ''

  const globalPlan = (metaPlan.global_plan || []).map((s, i) => `${i + 1}. ${s}`).join('\n')

  // Build file structure list from task graph for all file generations
  const fileStructure = metaPlan.task_graph
    ? '\n\n<project_file_structure>\nFiles that will be generated in this extension:\n' +
      metaPlan.task_graph.map(t => `  - ${t.file_name}`).join('\n') +
      '\n\nUse these exact file names when referencing other files (e.g., in manifest.json, import statements, or messaging).\n</project_file_structure>'
    : ''

  // Shared contract to keep cross-file consistency (IDs, messaging, endpoints).
  // Prefer planner-provided contract; otherwise build a small fallback.
  const sharedContractObj = metaPlan.shared_contract || {
    notes: 'Fallback contract (no planner contract provided).',
    ui: { root_element_id: 'app', primary_text_id: 'primaryText' },
    messaging: { uses_runtime_messaging: false, request_type: null },
    external_apis: { uses_external_apis: false, endpoints: [] }
  }
  const sharedContract = JSON.stringify(sharedContractObj, null, 2)

  // Build context sections
  const contextSections = buildContextSections(task, executionContext)

  // Inject frontend module for UI-related files
  const frontendModule = isUiRelatedFile(task.file_name) ? getFrontendModule(frontendType) : ''

  // Assemble final prompt
  const prompt = TASK_EXECUTOR_PROMPT
    .replace('{{SUMMARY}}', summary)
    .replace('{{ARCHITECTURE}}', architecture)
    .replace('{{GLOBAL_PLAN}}', globalPlan)
    .replace('{{SHARED_CONTRACT}}', sharedContract)
    .replace('{{FILE_NAME}}', task.file_name)
    .replace('{{TASK_DESCRIPTION}}', task.description || '')
    .replace('{{CONTEXT_SECTIONS}}', contextSections)
    .replace('{{FRONTEND_MODULE}}', frontendModule)
    + fileStructure  // Append file structure for manifest.json

  const model = modelOverride || DEFAULT_MODEL

  console.log(`🔨 [task-executor] Generating ${task.file_name} with ${model}`)
  console.log(`🔨 [task-executor] Raw prompt (after section replacements):\n`, prompt)

  const isGemini = !model.startsWith('claude')
  const response = await llmService.createResponse({
    provider: isGemini ? 'gemini' : 'anthropic',
    model,
    input: prompt,
    temperature: 0.2,
    max_output_tokens: 16000,
    store: false,
    thinkingConfig: isGemini ? { includeThoughts: true, thinkingLevel: 'LOW' } : null
  })

  let content = response?.output_text || ''
  const tokenUsage = response?.usage || { input_tokens: 0, output_tokens: 0 }

  console.log(`🔨 [task-executor] Raw response for ${task.file_name}:\n`, content)

  // Strip markdown fences
  content = stripMarkdownFences(content)

  // For manifest.json, parse and re-stringify to ensure valid JSON
  if (task.file_name === 'manifest.json') {
    const jsonStr = extractJsonContent(content)
    const parsed = parseJsonWithRetry(jsonStr || content)
    if (parsed) {
      content = JSON.stringify(parsed, null, 2)
    }
  }

  return { fileName: task.file_name, content, tokenUsage }
}
