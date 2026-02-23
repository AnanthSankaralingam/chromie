/**
 * Follow-up Task Graph Executor
 * Executes agent operations then patches files sequentially with per-file repair on failure.
 */

import { executeFollowupTask } from '@/lib/prompts/followup/executors/index.js'
import { buildRepairFollowupPrompt } from '@/lib/prompts/followup/executors/repair-executor-prompt.js'
import { buildRepairPrompt } from '@/lib/prompts/new-extension/executors/repair-executor-prompt.js'
import { applyAllPatches, containsPatch } from '@/lib/codegen/patching-handlers/patch-applier.js'
import { validateFiles } from '@/lib/codegen/patching-handlers/eslint-validator.js'
import { saveSingleFileToDatabase, updateProjectMetadata } from '@/lib/codegen/output-handlers/file-saver.js'
import { executeToolCall } from '@/lib/codegen/followup-handlers/tool-executor.js'
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
 * Executes the followup task graph: runs agent operations, then patches files one-by-one.
 * Yields SSE-compatible events throughout.
 *
 * @param {Object} followupPlan - Output from the followup meta planner
 * @param {Object} executionContext
 * @param {string} executionContext.userRequest - Original user request
 * @param {Object} executionContext.existingFiles - All existing files (path → content)
 * @param {string} executionContext.sessionId - Project/session ID
 * @param {string|null} executionContext.modelOverride - Optional model override
 * @param {Object} executionContext.supabase - Supabase client
 * @returns {AsyncGenerator}
 */
export async function* executeFollowupTaskGraph(followupPlan, executionContext) {
  const { userRequest, existingFiles, sessionId, modelOverride, supabase } = executionContext
  const deletedFiles = new Set()
  const savePromises = []

  // ── Step 1: Agent operations ───────────────────────────────────────────────
  const agentOps = followupPlan.agent_operations || []
  for (const op of agentOps) {
    if (op.type === 'delete_file') {
      try {
        await executeToolCall(
          { name: 'delete_file', params: { file_path: op.file_path, reason: op.reason || 'Removed by meta planner' } },
          { projectId: sessionId, supabase, onConfirmationRequired: async () => true }
        )
        deletedFiles.add(op.file_path)
        yield { type: 'file_deleted', filePath: op.file_path }
      } catch (err) {
        console.warn(`⚠️ [followup-task-graph-executor] Failed to delete ${op.file_path}:`, err?.message)
      }
    }
  }

  // ── Step 2: Working file set ───────────────────────────────────────────────
  const workingFiles = { ...existingFiles }
  for (const path of deletedFiles) {
    delete workingFiles[path]
  }

  // ── Step 3: Topological sort ───────────────────────────────────────────────
  const taskGraph = followupPlan.task_graph || []
  const sortedTasks = topologicalSort(taskGraph)
  const totalTasks = sortedTasks.length

  let totalTokenUsage = { input_tokens: 0, output_tokens: 0 }
  const savedFiles = []

  // ── Step 4: Emit task list ─────────────────────────────────────────────────
  yield {
    type: 'task_list',
    tasks: sortedTasks.map(t => ({ id: t.id, fileName: t.file_name, description: t.description }))
  }

  // ── Step 5: Per-task execution loop ───────────────────────────────────────
  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i]

    yield {
      type: 'task_progress',
      taskId: task.id,
      fileName: task.file_name,
      taskIndex: i,
      totalTasks
    }

    // Generate V4A patch for this file
    const result = await executeFollowupTask(task, {
      followupPlan,
      userRequest,
      workingFiles,
      modelOverride
    })

    // Accumulate token usage
    if (result.tokenUsage) {
      totalTokenUsage.input_tokens += result.tokenUsage.input_tokens || 0
      totalTokenUsage.output_tokens += result.tokenUsage.output_tokens || 0
    }

    const { patchOutput } = result

    if (!containsPatch(patchOutput)) {
      console.log(`⚠️ [followup-task-graph-executor] No patch detected for ${task.file_name}, skipping`)
      continue
    }

    // Apply the patch
    let patchResult = applyAllPatches(workingFiles, patchOutput)

    // Patch context mismatch repair
    if (patchResult.errors && patchResult.errors.length > 0) {
      console.log(`⚠️ [followup-task-graph-executor] Patch context mismatch for ${task.file_name}, attempting repair...`)
      console.log(`⚠️ [followup-task-graph-executor] Patch errors:`, JSON.stringify(patchResult.errors, null, 2))
      yield { type: 'task_repair', fileName: task.file_name }

      const repairPrompt = buildRepairFollowupPrompt(
        task.file_name,
        patchOutput,
        patchResult.errors,
        workingFiles[task.file_name] || '',
        workingFiles['manifest.json'] || null
      )

      const repairModel = modelOverride || DEFAULT_MODEL
      const repairProvider = llmService.getProviderFromModel(repairModel)
      const repairResponse = await llmService.createResponse({
        provider: repairProvider,
        model: repairModel,
        input: repairPrompt,
        temperature: 0.1,
        max_output_tokens: 16000,
        store: false
      })

      if (repairResponse?.usage) {
        totalTokenUsage.input_tokens += repairResponse.usage.input_tokens || 0
        totalTokenUsage.output_tokens += repairResponse.usage.output_tokens || 0
      }

      // Re-apply corrected patch
      console.log(`🔧 [followup-task-graph-executor] Repair response for ${task.file_name}:\n`, repairResponse?.output_text || '(empty)')
      patchResult = applyAllPatches(workingFiles, repairResponse?.output_text || '')
      if (patchResult.errors?.length > 0) {
        console.log(`❌ [followup-task-graph-executor] Repair also failed for ${task.file_name}:`, JSON.stringify(patchResult.errors, null, 2))
      } else {
        console.log(`✅ [followup-task-graph-executor] Repair succeeded for ${task.file_name}`)
      }
    }

    let finalContent = patchResult.updatedFiles?.[task.file_name]

    if (!finalContent) {
      console.log(`⚠️ [followup-task-graph-executor] Patch produced no content for ${task.file_name}, skipping`)
      continue
    }

    // ESLint validation + repair
    const validationResult = validateFiles({ [task.file_name]: finalContent })
    if (!validationResult.allValid) {
      const errors = validationResult.results[task.file_name]?.errors || []
      console.log(`⚠️ [followup-task-graph-executor] ESLint failed for ${task.file_name}, attempting repair...`)
      console.log(`⚠️ [followup-task-graph-executor] ESLint errors:`, JSON.stringify(errors, null, 2))
      yield { type: 'task_repair', fileName: task.file_name }

      const eslintRepairPrompt = buildRepairPrompt(
        task.file_name,
        finalContent,
        errors,
        workingFiles['manifest.json'] || null
      )

      const eslintRepairModel = modelOverride || DEFAULT_MODEL
      const eslintRepairProvider = llmService.getProviderFromModel(eslintRepairModel)
      const eslintRepairResponse = await llmService.createResponse({
        provider: eslintRepairProvider,
        model: eslintRepairModel,
        input: eslintRepairPrompt,
        temperature: 0.1,
        max_output_tokens: 16000,
        store: false
      })

      if (eslintRepairResponse?.usage) {
        totalTokenUsage.input_tokens += eslintRepairResponse.usage.input_tokens || 0
        totalTokenUsage.output_tokens += eslintRepairResponse.usage.output_tokens || 0
      }

      finalContent = stripMarkdownFences(eslintRepairResponse?.output_text || finalContent)
    }

    // Update working files for downstream tasks
    workingFiles[task.file_name] = finalContent

    // Non-blocking save
    savePromises.push(
      saveSingleFileToDatabase(task.file_name, finalContent, sessionId).then(res => {
        if (res.success) savedFiles.push(res.filePath)
        return res
      })
    )

    yield {
      type: 'task_complete',
      taskId: task.id,
      fileName: task.file_name,
      fileContent: finalContent,
      taskIndex: i,
      totalTasks
    }
  }

  // ── Step 6: Finalize ───────────────────────────────────────────────────────
  await Promise.allSettled(savePromises)

  const explanation = [
    followupPlan.summary?.purpose,
    followupPlan.summary?.approach
  ].filter(Boolean).join('\n\n')

  await updateProjectMetadata(sessionId, workingFiles)
  await llmService.chatMessages.addMessage(sessionId, { role: 'assistant', content: explanation })

  yield { type: 'files_saved', files: savedFiles }
  yield { type: 'explanation', content: explanation }
  yield { type: 'token_usage', usage: totalTokenUsage }
  yield { type: 'phase', phase: 'complete', content: `Patched ${savedFiles.length} file(s) via task graph.` }
}
