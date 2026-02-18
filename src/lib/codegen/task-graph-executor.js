/**
 * Task Graph Executor
 * Executes a DAG of file-generation tasks with validation and repair.
 */

import { executeTask } from '@/lib/prompts/new-extension/executors/index.js'
import { buildRepairPrompt } from '@/lib/prompts/new-extension/executors/repair-executor-prompt.js'
import { normalizeGeneratedFileContent } from '@/lib/codegen/output-handlers/json-extractor.js'
import { validateFiles } from '@/lib/codegen/patching-handlers/eslint-validator.js'
import { saveSingleFileToDatabase, updateProjectMetadata } from '@/lib/codegen/output-handlers/file-saver.js'
import { llmService } from '@/lib/services/llm-service.js'
import { DEFAULT_MODEL } from '@/lib/constants.js'

/**
 * Topologically sorts the task graph by dependencies (DFS).
 * @param {Array} taskGraph - Array of task objects with id and dependencies
 * @returns {Array} Tasks in dependency order
 */
function topologicalSort(taskGraph) {
  const taskMap = new Map(taskGraph.map(t => [t.id, t]))
  const visited = new Set()
  const sorted = []

  function visit(taskId) {
    if (visited.has(taskId)) return
    visited.add(taskId)
    const task = taskMap.get(taskId)
    if (!task) return
    for (const depId of (task.dependencies || [])) {
      visit(depId)
    }
    sorted.push(task)
  }

  for (const task of taskGraph) {
    visit(task.id)
  }

  return sorted
}

/**
 * Strips markdown code fences from LLM output.
 */
function stripMarkdownFences(text) {
  if (!text) return text
  let out = text.trim()
  out = out.replace(/^```(?:json|javascript|js|html|css|markdown|md)?\s*\n?/, '')
  out = out.replace(/\n?```\s*$/, '')
  return out.trim()
}

/**
 * Executes the full task graph: generate files, validate, repair, save.
 * Yields SSE-compatible events throughout.
 *
 * @param {Object} metaPlan - The meta planner output (summary, architecture, task_graph, etc.)
 * @param {Object} executionContext - Shared context
 * @param {Object} executionContext.metaPlan
 * @param {Object} executionContext.formattedPlanningOutputs
 * @param {string|null} executionContext.scrapedWebpageAnalysis
 * @param {string} executionContext.frontendType
 * @param {string} executionContext.featureRequest
 * @param {string|null} executionContext.modelOverride
 * @param {string} executionContext.sessionId
 * @returns {AsyncGenerator}
 */
export async function* executeTaskGraph(metaPlan, executionContext) {
  const { sessionId, modelOverride, featureRequest } = executionContext
  const sortedTasks = topologicalSort(metaPlan.task_graph)
  const completedFiles = new Map()
  const totalTasks = sortedTasks.length
  let totalTokenUsage = { input_tokens: 0, output_tokens: 0 }
  const savePromises = []

  // Attach completedFiles to context so executeTask can access them
  const ctx = { ...executionContext, completedFiles }
  const taskIdToFileName = new Map(sortedTasks.map(t => [t.id, t.file_name]))
  const fileNameSet = new Set(sortedTasks.map(t => t.file_name))

  function unionExistingFiles(existingFiles, additionalFiles) {
    const set = new Set([...(existingFiles || []), ...(additionalFiles || [])].filter(Boolean))
    return Array.from(set)
  }

  function inferSiblingContextFiles(fileName) {
    const lower = (fileName || '').toLowerCase()
    const siblings = []
    // If generating UI JS, include its corresponding HTML when present.
    if (lower.endsWith('.js')) {
      const base = lower.replace(/\.js$/, '')
      const html = `${base}.html`
      if (fileNameSet.has(html)) siblings.push(html)
    }
    // If generating styles, include the UI HTML if present.
    if (lower.endsWith('styles.css') || lower.endsWith('.css')) {
      const candidates = ['popup.html', 'sidepanel.html', 'overlay.html', 'newtab.html']
      for (const c of candidates) {
        if (fileNameSet.has(c)) siblings.push(c)
      }
    }
    return siblings
  }

  // Emit the full task list so the frontend can render a checklist
  yield {
    type: 'task_list',
    tasks: sortedTasks.map(t => ({ id: t.id, fileName: t.file_name, description: t.description }))
  }

  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i]
    const progress = Math.round(((i + 1) / totalTasks) * 100)

    yield {
      type: 'task_progress',
      taskId: task.id,
      fileName: task.file_name,
      taskIndex: i,
      totalTasks,
      progress
    }

    // Enrich context_requirements.existing_files to ensure cross-file coherence.
    // This is a safety net: even if the planner forgets to request existing_files,
    // we inject dependency artifacts (and key siblings like popup.html for popup.js).
    const dependencyFiles = (task.dependencies || []).map(depId => taskIdToFileName.get(depId)).filter(Boolean)
    const siblingFiles = inferSiblingContextFiles(task.file_name)
    const manifestFile = task.file_name !== 'manifest.json' && fileNameSet.has('manifest.json') ? ['manifest.json'] : []
    const currentExistingFiles = task.context_requirements?.existing_files || []
    const enrichedExistingFiles = unionExistingFiles(currentExistingFiles, [...manifestFile, ...dependencyFiles, ...siblingFiles])

    const effectiveTask = {
      ...task,
      context_requirements: {
        ...(task.context_requirements || {}),
        existing_files: enrichedExistingFiles
      }
    }

    // Generate the file
    const result = await executeTask(effectiveTask, ctx)
    let content = normalizeGeneratedFileContent(result.content)

    // Track tokens (handle both Gemini and Anthropic field names)
    if (result.tokenUsage) {
      totalTokenUsage.input_tokens += result.tokenUsage.prompt_tokens || result.tokenUsage.input_tokens || 0
      totalTokenUsage.output_tokens += result.tokenUsage.completion_tokens || result.tokenUsage.output_tokens || 0
    }

    // Validate the generated file
    const validationResult = validateFiles({ [task.file_name]: content })

    if (!validationResult.allValid) {
      const errors = validationResult.results[task.file_name]?.errors || []
      console.log(`⚠️ [task-graph-executor] Validation failed for ${task.file_name}, attempting repair...`)

      yield {
        type: 'task_repair',
        fileName: task.file_name
      }

      // One repair attempt
      const repairPrompt = buildRepairPrompt(
        task.file_name,
        content,
        errors,
        completedFiles.get('manifest.json') || null
      )

      console.log(`🔧 [task-graph-executor] Repair executor raw prompt (after section replacements):\n`, repairPrompt)

      const model = modelOverride || DEFAULT_MODEL
      const provider = llmService.getProviderFromModel(model)
      const supportsThinking = provider === 'gemini' || provider === 'anthropic'
      const repairResponse = await llmService.createResponse({
        provider,
        model,
        input: repairPrompt,
        temperature: 0.1,
        max_output_tokens: 16000,
        store: false,
        thinkingConfig: supportsThinking ? { includeThoughts: true, thinkingLevel: 'LOW' } : null
      })

      const repairRawOutput = repairResponse?.output_text || ''
      console.log(`🔧 [task-graph-executor] Repair executor raw response for ${task.file_name}:\n`, repairRawOutput)

      const repairedContent = stripMarkdownFences(repairRawOutput)

      if (repairResponse?.usage) {
        totalTokenUsage.input_tokens += repairResponse.usage.prompt_tokens || repairResponse.usage.input_tokens || 0
        totalTokenUsage.output_tokens += repairResponse.usage.completion_tokens || repairResponse.usage.output_tokens || 0
      }

      // Re-validate
      const repairValidation = validateFiles({ [task.file_name]: repairedContent })
      if (repairValidation.allValid) {
        console.log(`✅ [task-graph-executor] Repair succeeded for ${task.file_name}`)
        content = normalizeGeneratedFileContent(repairedContent)
      } else {
        console.warn(`⚠️ [task-graph-executor] Repair did not fully fix ${task.file_name}, using repaired version anyway`)
        content = normalizeGeneratedFileContent(repairedContent)
      }
    }

    completedFiles.set(task.file_name, content)

    // Fire off DB save without awaiting — overlaps with next LLM call
    savePromises.push(saveSingleFileToDatabase(task.file_name, content, sessionId))

    yield {
      type: 'task_complete',
      content: `Completed ${task.file_name}`,
      taskId: task.id,
      fileName: task.file_name,
      taskIndex: i,
      totalTasks,
      progress,
      fileContent: content
    }
  }

  // Build the implementation result object for metadata
  const implementationResult = {}
  for (const [fileName, content] of completedFiles) {
    implementationResult[fileName] = content
  }

  // Build explanation from meta plan
  const explanationParts = []
  if (metaPlan.summary?.purpose) {
    explanationParts.push(`## Overview\n${metaPlan.summary.purpose}`)
  }
  if (metaPlan.architecture?.data_flow?.length > 0) {
    const steps = metaPlan.architecture.data_flow.map((step, i) => {
      const label = step.replace(/^Step \d+:\s*/i, '').trim()
      return `${i + 1}. ${label}`
    })
    explanationParts.push(`## How It Works\n${steps.join('\n')}`)
  }
  if (metaPlan.summary?.core_capabilities?.length > 0) {
    explanationParts.push(`## Features\n${metaPlan.summary.core_capabilities.map(c => `- ${c}`).join('\n')}`)
  }
  const explanation = explanationParts.join('\n\n')

  // Wait for all in-flight file saves to settle
  const saveResults = await Promise.allSettled(savePromises)
  const savedFiles = []
  const errors = []
  for (const result of saveResults) {
    if (result.status === 'fulfilled' && result.value.success) {
      savedFiles.push(result.value.filePath)
    } else if (result.status === 'fulfilled' && !result.value.success) {
      errors.push({ filePath: result.value.filePath, error: result.value.error })
    } else {
      errors.push({ filePath: 'unknown', error: result.reason })
    }
  }

  if (errors.length > 0) {
    console.error(`❌ [task-graph-executor] ${errors.length} files had save errors`)
  }

  // Update project metadata from manifest
  await updateProjectMetadata(sessionId, implementationResult)

  // Store assistant message in conversation history
  await llmService.chatMessages.addMessage(sessionId, {
    role: 'assistant',
    content: explanation
  })

  // Yield final events
  yield {
    type: 'files_saved',
    content: savedFiles.join(', '),
    files: savedFiles
  }

  yield {
    type: 'explanation',
    content: explanation
  }

  yield {
    type: 'token_usage',
    content: JSON.stringify(totalTokenUsage),
    usage: totalTokenUsage
  }

  yield {
    type: 'phase',
    phase: 'complete',
    content: `Generated ${savedFiles.length} files via task graph.`
  }
}
