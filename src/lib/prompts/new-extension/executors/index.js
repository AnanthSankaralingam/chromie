/**
 * Task Executor
 * Generates a single file by building a prompt from the task executor template,
 * injecting the right context sections and frontend module, then calling the LLM.
 */

import { TASK_EXECUTOR_PROMPT } from './task-executor-prompt.js'
import { getFrontendModuleForFile } from './frontend-modules/index.js'
import { llmService } from '@/lib/services/llm-service.js'
import { DEFAULT_MODEL } from '@/lib/constants.js'
import { extractJsonContent, parseJsonWithRetry } from '@/lib/codegen/output-handlers/json-extractor.js'
import { CONSOLE_LOGGING_REQUIREMENTS, ICON_CONFIGURATION, STYLING_REQUIREMENTS, POPUP_STYLING_REQUIREMENTS, CHROME_MESSAGING_API_RULES, NPM_PACKAGE_IMPORT_GUIDANCE } from '../one-shot/shared-content.js'

/**
 * Returns the file type based on extension.
 */
function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  if (ext === 'json') return 'json'
  if (ext === 'js') return 'js'
  if (ext === 'html') return 'html'
  if (ext === 'css') return 'css'
  return ext
}

/**
 * Returns the output format instruction for a given file type.
 */
function getOutputFormat(fileName, fileType) {
  const formatHints = {
    json: `- Return a valid JSON object for ${fileName}`,
    js: '- Return raw JavaScript',
    html: '- Return raw HTML',
    css: '- Return raw CSS',
    md: '- Return raw Markdown'
  }
  const hint = formatHints[fileType] || `- Return raw file content for ${fileName}`
  return `<output_format>
Return ONLY the raw file content. No explanations, no markdown fences, no wrappers.
${hint}
Do NOT wrap output in \`\`\`json or \`\`\` blocks. Return the file content directly.
</output_format>`
}

/**
 * Returns conditional context injections based on file type.
 */
function getFileTypeInjections(fileName, frontendType) {
  const type = getFileType(fileName)
  const isPopup = frontendType === 'popup'
  return {
    STYLING_REQUIREMENTS: (type === 'css' || type === 'html') ? STYLING_REQUIREMENTS : '',
    POPUP_STYLING_REQUIREMENTS: (type === 'css' || type === 'html') && isPopup ? POPUP_STYLING_REQUIREMENTS : '',
    ICON_CONFIGURATION: (type === 'json' || type === 'html') ? ICON_CONFIGURATION : '',
    CONSOLE_LOGGING_REQUIREMENTS: type === 'js' ? CONSOLE_LOGGING_REQUIREMENTS : '',
    CHROME_MESSAGING_RULES: type === 'js' ? CHROME_MESSAGING_API_RULES : '',
    NPM_PACKAGE_IMPORT_GUIDANCE: type === 'js' ? NPM_PACKAGE_IMPORT_GUIDANCE : '',
    OUTPUT_FORMAT: getOutputFormat(fileName, type)
  }
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
 * Summarizes CSS content to just selector names to avoid bloating the context.
 * Returns a compact representation listing selectors and custom properties.
 */
function summarizeCssForContext(cssContent) {
  const selectors = []
  const customProps = []

  // Extract selectors (lines that end with '{' and aren't inside a value)
  for (const line of cssContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.endsWith('{') && !trimmed.startsWith('/*')) {
      selectors.push(trimmed.replace(/\s*\{$/, '').trim())
    }
    // Capture CSS custom property declarations
    const propMatch = trimmed.match(/^(--[\w-]+)\s*:/)
    if (propMatch) {
      customProps.push(propMatch[1])
    }
  }

  const parts = []
  if (selectors.length > 0) {
    parts.push(`Selectors:\n${selectors.map(s => `  ${s}`).join('\n')}`)
  }
  if (customProps.length > 0) {
    parts.push(`Custom properties:\n${customProps.map(p => `  ${p}`).join('\n')}`)
  }
  return parts.length > 0 ? parts.join('\n') : '(empty stylesheet)'
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

  if ((ctx.external_apis || ctx.npm_packages) && formattedPlanningOutputs?.EXTERNAL_RESOURCES) {
    parts.push(`<external_resources>\n${formattedPlanningOutputs.EXTERNAL_RESOURCES}\n</external_resources>`)
  }

  if (ctx.scraped_webpage && scrapedWebpageAnalysis && typeof scrapedWebpageAnalysis === 'string' && !scrapedWebpageAnalysis.startsWith('<!--')) {
    parts.push(`<scraped_webpage_data>\n${scrapedWebpageAnalysis}\n</scraped_webpage_data>`)
  }

  if (ctx.workspace_scopes && formattedPlanningOutputs?.WORKSPACE_AUTH) {
    parts.push(`<workspace_authentication>\n${formattedPlanningOutputs.WORKSPACE_AUTH}\n</workspace_authentication>`)
  }

  // Inject existing (completed) files this task depends on.
  // CSS files are summarized to just selectors to avoid bloating the context.
  const depFiles = ctx.existing_files || []
  if (depFiles.length > 0 && completedFiles) {
    const fileEntries = depFiles
      .filter(f => completedFiles.has(f))
      .map(f => {
        const content = completedFiles.get(f)
        if (f.endsWith('.css')) {
          const summary = summarizeCssForContext(content)
          return `<file path="${f}" summarized="true">\n${summary}\n</file>`
        }
        return `<file path="${f}">\n${content}\n</file>`
      })
    if (fileEntries.length > 0) {
      parts.push(`<existing_files>\n${fileEntries.join('\n')}\n</existing_files>`)
    }
  }

  return parts.join('\n\n')
}

const GEMINI_FLASH_MODEL = 'gemini-3-flash-preview'
const FAST_FILE_EXTENSIONS = new Set(['css', 'json'])

/**
 * Picks the model for a given file.
 * CSS and JSON files use Gemini Flash (fast, cheap).
 * All other files use the caller-supplied override or the default Fireworks model.
 */
function getModelForFile(fileName, modelOverride) {
  const ext = (fileName || '').split('.').pop().toLowerCase()
  if (FAST_FILE_EXTENSIONS.has(ext)) return GEMINI_FLASH_MODEL
  return modelOverride || DEFAULT_MODEL
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
    ? '<project_file_structure>\nFiles that will be generated in this extension:\n' +
      metaPlan.task_graph.map(t => `  - ${t.file_name}`).join('\n') +
      '\n\nUse these exact file names when referencing other files (e.g., in manifest.json, import statements, or messaging).\n</project_file_structure>'
    : ''

  // Shared contract to keep cross-file consistency (IDs, messaging, endpoints).
  // Prefer planner-provided contract; otherwise build a small fallback.
  const sharedContractObj = metaPlan.shared_contract || {
    notes: 'Fallback contract (no planner contract provided).',
    ui: { root_element_id: 'app', primary_text_id: 'primaryText' },
    messaging: { uses_runtime_messaging: false, request_type: null },
    external_apis: { uses_external_apis: false, endpoints: [] },
    storage: { namespace: 'none', keys: {} }
  }
  const sharedContract = JSON.stringify(sharedContractObj, null, 2)

  // Build context sections
  const contextSections = buildContextSections(task, executionContext)

  // Inject frontend module only when file name matches that module (e.g. popup.js → popup, content.js → content-injection)
  const frontendModule = getFrontendModuleForFile(task.file_name)

  // Build conditional injections based on file type
  const injections = getFileTypeInjections(task.file_name, frontendType)

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
    .replace('{{FILE_STRUCTURE}}', fileStructure)
    .replace('{{STYLING_REQUIREMENTS}}', injections.STYLING_REQUIREMENTS)
    .replace('{{POPUP_STYLING_REQUIREMENTS}}', injections.POPUP_STYLING_REQUIREMENTS)
    .replace('{{ICON_CONFIGURATION}}', injections.ICON_CONFIGURATION)
    .replace('{{CHROME_MESSAGING_RULES}}', injections.CHROME_MESSAGING_RULES)
    .replace('{{CONSOLE_LOGGING_REQUIREMENTS}}', injections.CONSOLE_LOGGING_REQUIREMENTS)
    .replace('{{NPM_PACKAGE_IMPORT_GUIDANCE}}', injections.NPM_PACKAGE_IMPORT_GUIDANCE)
    .replace('{{OUTPUT_FORMAT}}', injections.OUTPUT_FORMAT)

  const model = getModelForFile(task.file_name, modelOverride)
  const provider = llmService.getProviderFromModel(model)
  const supportsThinking = provider === 'gemini' || provider === 'anthropic'

  console.log(`🔨 [task-executor] Generating ${task.file_name} with ${model}`)
  console.log(`🔨 [task-executor] Raw prompt (after section replacements):\n`, prompt)

  const response = await llmService.createResponse({
    provider,
    model,
    input: prompt,
    temperature: 0.2,
    max_output_tokens: 12000,
    store: false,
    thinkingConfig: supportsThinking ? { includeThoughts: true, thinkingLevel: 'LOW' } : null
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
