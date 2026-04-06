/**
 * Follow-up Task Executor
 * Generates a V4A patch for a single file using the followup task executor prompt.
 */

import { TASK_EXECUTOR_FOLLOWUP_PROMPT } from './task-executor-prompt.js'
import { llmService } from '@/lib/services/llm-service.js'
import { CODE_PATCH_MODEL, MODEL_SELECTION } from '@/lib/constants.js'
import {
  CONSOLE_LOGGING_REQUIREMENTS,
  ICON_CONFIGURATION,
  CHROME_MESSAGING_API_RULES,
  NPM_PACKAGE_IMPORT_GUIDANCE
} from '@/lib/prompts/new-extension/one-shot/shared-content.js'

/**
 * Returns the file type based on extension.
 */
function getFileType(fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase()
  if (ext === 'json') return 'json'
  if (ext === 'js') return 'js'
  if (ext === 'html') return 'html'
  if (ext === 'css') return 'css'
  return ext
}

function getFollowupModelForFile(fileName, modelOverride, planningDifficulty = 0) {
  if (modelOverride) return modelOverride
  const type = getFileType(fileName)
  if (type === 'css') {
    const cssModel = planningDifficulty >= 0.7
      ? MODEL_SELECTION.FOLLOWUP_PATCH_CSS_COMPLEX
      : MODEL_SELECTION.FOLLOWUP_PATCH_CSS_FAST
    return cssModel || MODEL_SELECTION.CODE_PATCH_FALLBACK
  }
  return CODE_PATCH_MODEL || MODEL_SELECTION.CODE_PATCH_FALLBACK
}

/**
 * Returns conditional context injections based on file type.
 * Pass null for frontendType so popup-specific styles are skipped.
 */
function getFileTypeInjections(fileName, frontendType) {
  const type = getFileType(fileName)
  const isPopup = frontendType === 'popup'
  return {
    ICON_CONFIGURATION: (type === 'json' || type === 'html') ? ICON_CONFIGURATION : '',
    CONSOLE_LOGGING_REQUIREMENTS: type === 'js' ? CONSOLE_LOGGING_REQUIREMENTS : '',
    CHROME_MESSAGING_RULES: type === 'js' ? CHROME_MESSAGING_API_RULES : '',
    NPM_PACKAGE_IMPORT_GUIDANCE: type === 'js' ? NPM_PACKAGE_IMPORT_GUIDANCE : ''
  }
}

/**
 * Summarizes CSS content to just selector names to avoid bloating the context.
 */
function summarizeCssForContext(cssContent) {
  const selectors = []
  const customProps = []

  for (const line of cssContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.endsWith('{') && !trimmed.startsWith('/*')) {
      selectors.push(trimmed.replace(/\s*\{$/, '').trim())
    }
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
 * Builds the <existing_files> context block from task context requirements and workingFiles.
 * Always includes the target file itself.
 */
function buildContextSections(task, workingFiles) {
  const targetFile = task.file_name
  const requestedFiles = task.context_requirements?.existing_files || []

  // Always include the target file; deduplicate
  const filesToInclude = Array.from(new Set([targetFile, ...requestedFiles]))

  const fileEntries = filesToInclude
    .filter(f => workingFiles[f] !== undefined)
    .map(f => {
      const content = workingFiles[f]
      if (f.endsWith('.css')) {
        const summary = summarizeCssForContext(content)
        return `<file path="${f}" summarized="true">\n${summary}\n</file>`
      }
      return `<file path="${f}">\n${content}\n</file>`
    })

  if (fileEntries.length === 0) return ''
  return `<existing_files>\n${fileEntries.join('\n')}\n</existing_files>`
}

/**
 * Executes a single file-patch task using the V4A followup prompt.
 * @param {Object} task - A task from the followup meta planner task_graph
 * @param {Object} executionContext
 * @param {Object} executionContext.followupPlan - The followup meta plan (summary, global_plan, etc.)
 * @param {Object} executionContext.workingFiles - Current file contents (plain object)
 * @param {string|null} executionContext.modelOverride - Optional model override
 * @returns {Promise<{fileName: string, patchOutput: string, tokenUsage: Object}>}
 */
export async function executeFollowupTask(task, executionContext) {
  const { followupPlan, workingFiles, modelOverride, planningDifficulty = 0 } = executionContext

  const summary = followupPlan.summary?.purpose || ''
  const architecture = followupPlan.summary?.approach || ''
  const globalPlan = (followupPlan.global_plan || []).map((s, i) => `${i + 1}. ${s}`).join('\n')

  const contextSections = buildContextSections(task, workingFiles)
  const injections = getFileTypeInjections(task.file_name, null)

  const prompt = TASK_EXECUTOR_FOLLOWUP_PROMPT
    .replace('{{SUMMARY}}', summary)
    .replace('{{ARCHITECTURE}}', architecture)
    .replace('{{GLOBAL_PLAN}}', globalPlan)
    .replace('{{SHARED_CONTRACT}}', '{}')
    .replace('{{FILE_NAME}}', task.file_name)
    .replace('{{TASK_DESCRIPTION}}', task.description || '')
    .replace('{{CONTEXT_SECTIONS}}', contextSections)
    .replace('{{FRONTEND_MODULE}}', '')
    .replace('{{FILE_STRUCTURE}}', '')
    .replace('{{ICON_CONFIGURATION}}', injections.ICON_CONFIGURATION)
    .replace('{{CHROME_MESSAGING_RULES}}', injections.CHROME_MESSAGING_RULES)
    .replace('{{CONSOLE_LOGGING_REQUIREMENTS}}', injections.CONSOLE_LOGGING_REQUIREMENTS)
    .replace('{{NPM_PACKAGE_IMPORT_GUIDANCE}}', injections.NPM_PACKAGE_IMPORT_GUIDANCE)

  const model = getFollowupModelForFile(task.file_name, modelOverride, planningDifficulty)
  const provider = llmService.getProviderFromModel(model)

  console.log(`🔨 [followup-task-executor] Patching ${task.file_name} with ${model}`)
  console.log(`🔨 [followup-task-executor] Raw prompt:\n`, prompt)

  const response = await llmService.createResponse({
    provider,
    model,
    input: prompt,
    temperature: 0.2,
    max_output_tokens: 16000,
    store: false
  })

  const patchOutput = response?.output_text || ''
  const tokenUsage = response?.usage || { input_tokens: 0, output_tokens: 0 }

  console.log(`🔨 [followup-task-executor] Raw response for ${task.file_name}:\n`, patchOutput)

  return { fileName: task.file_name, patchOutput, tokenUsage }
}
