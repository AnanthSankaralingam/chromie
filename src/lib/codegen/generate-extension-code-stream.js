/**
 * Chrome Extension Code Generation Stream
 * Handles LLM-based code generation with streaming support
 */

import { llmService } from "@/lib/services/llm-service"
import { selectUnifiedSchema } from "@/lib/response-schemas/unified-schemas"
import { DEFAULT_MODEL } from "@/lib/constants"
import { REQUEST_TYPES } from "@/lib/prompts/request-types"
import { containsPatch } from "@/lib/codegen/patching-handlers/patch-applier"
import { extractJsonContent, parseJsonWithRetry } from "@/lib/codegen/output-handlers/json-extractor"
import { processPatchModeOutput } from "@/lib/codegen/patching-handlers/patch-processor"
import { saveFilesToDatabase, updateProjectMetadata } from "@/lib/codegen/output-handlers/file-saver"

// Gemini Thinking Levels - matching the Gemini API enum values
const ThinkingLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
}

/**
 * Processes response metadata and returns token usage info
 * @param {Object} response - LLM response object
 * @param {number} conversationTokenTotal - Running total of conversation tokens
 * @returns {Object} Object containing tokensUsedThisRequest
 */
function processResponseMetadata(response, conversationTokenTotal = 0) {
  const tokensUsedThisRequest = response?.usage?.total_tokens || response?.usage?.total || 0
  return { tokensUsedThisRequest }
}

/**
 * Stores clean conversation history (assistant explanation only, no code)
 * Note: User message is stored earlier in the stream route with version ID
 * @param {string} sessionId - Session/project identifier
 * @param {string} originalUserRequest - Original natural language request (for logging only)
 * @param {string} explanation - AI explanation text (no code)
 */
async function storeConversationHistory(sessionId, originalUserRequest, explanation) {
  if (!sessionId || !originalUserRequest) {
    console.log('[conversation-history] Skipping storage - missing sessionId or originalUserRequest')
    return
  }

  // Only store assistant message - user message was already stored with version ID in stream route
  await llmService.chatMessages.addMessage(sessionId, { role: 'assistant', content: explanation })
  console.log(`✅ [conversation-history] Stored assistant explanation (${explanation.length} chars)`)
}

/**
 * Yields explanation from implementation result and returns the explanation text
 */
async function* yieldExplanation(implementationResult, context) {
  let explanation = "Implementation complete."
  if (implementationResult?.explanation) {
    console.log(`📝 Extracted explanation from ${context}`)
    explanation = implementationResult.explanation
    yield { type: "explanation", content: explanation }
  } else {
    console.log(`⚠️ No explanation found in ${context}`)
    yield { type: "explanation", content: explanation }
  }
  return explanation
}

/**
 * Determines LLM provider from model name
 */
function getProviderFromModel(model) {
  if (typeof model === 'string') {
    if (model.toLowerCase().includes('gemini')) return 'gemini'
    if (model.toLowerCase().includes('claude')) return 'anthropic'
    if (model.toLowerCase().includes('gpt')) return 'openai'
  }
  return 'gemini'
}

/**
 * Handles patching mode output processing
 */
async function* handlePatchingMode(outputText, existingFilesForPatch, userRequest, provider, model, sessionId, replacements, originalUserRequest = '') {
  console.log('🔧 Processing patch output...')
  
  const patchGen = processPatchModeOutput(outputText, existingFilesForPatch, userRequest, provider, model)
  
  let patchResult
  for await (const event of patchGen) {
    if (event.type === "final_result") {
      // Capture the final result from the special event
      patchResult = event.result
      console.log('🔧 [handlePatchingMode] Captured final result from generator:', patchResult ? 'YES' : 'NO')
    } else if (event.type) {
      // Forward all other typed events to the client
      yield event
    }
  }
  
  if (patchResult?.success) {
    const explanation = patchResult.explanation || "Implementation complete."
    console.log(`✅ [patch-mode] Successfully applied patches, extracted explanation (${explanation.length} chars)`)
    
    // Yield explanation BEFORE other operations so it renders in the UI
    if (patchResult.explanation) {
      yield { type: "explanation", content: patchResult.explanation }
    }
    
    const implementationResult = { ...patchResult.files }
    if (patchResult.explanation) {
      implementationResult.explanation = patchResult.explanation
    }
    
    const { savedFiles } = await saveFilesToDatabase(implementationResult, sessionId, replacements)
    await updateProjectMetadata(sessionId, patchResult.files)
    
    console.log(`✅ [handlePatchingMode] Saved ${savedFiles.length} files to database`)
    yield { type: "files_saved", content: `Saved ${savedFiles.length} files to project` }

    // Store clean conversation history after successful generation
    await storeConversationHistory(sessionId, originalUserRequest, explanation)
    return true
  }
  
  console.log('⚠️ Patch mode failed, output may not contain valid patch')
  yield { type: "phase", phase: "implementing", content: "Patch application had issues" }
  return false
}

/**
 * Handles replacement mode (JSON) output processing
 */
async function* handleReplacementMode(outputText, sessionId, replacements, context, originalUserRequest = '') {
  let implementationResult
  let explanation = "Implementation complete."
  try {
    const jsonContent = extractJsonContent(outputText)
    if (jsonContent) {
      implementationResult = parseJsonWithRetry(jsonContent)
      if (!implementationResult) {
        throw new Error("Failed to parse JSON")
      }
      // Yield explanation and capture the text for history storage
      for await (const event of yieldExplanation(implementationResult, context)) {
        yield event
        if (event.type === "explanation") {
          explanation = event.content
        }
      }
    } else {
      // No JSON found - treat entire output as plain text explanation (e.g., answering a question)
      console.log(`📝 No JSON found in ${context}, treating as plain text explanation`)
      explanation = outputText.trim()
      yield { type: "explanation", content: explanation }
    }
  } catch (error) {
    console.error(`❌ Error parsing from ${context}:`, error)
    yield { type: "phase", phase: "planning", content: "Implementation approach completed" }
  }

  if (implementationResult && typeof implementationResult === 'object') {
    const { savedFiles } = await saveFilesToDatabase(implementationResult, sessionId, replacements)
    
    const allFiles = { ...implementationResult }
    delete allFiles.explanation
    
    await updateProjectMetadata(sessionId, allFiles)
    yield { type: "files_saved", content: `Saved ${savedFiles.length} files to project` }

    // Store clean conversation history after successful generation
    await storeConversationHistory(sessionId, originalUserRequest, explanation)
  } else if (explanation && explanation !== "Implementation complete.") {
    // No files generated, but we have an explanation (question-answering case)
    console.log(`💬 No files to save, storing plain text response (${explanation.length} chars)`)
    await storeConversationHistory(sessionId, originalUserRequest, explanation)
  }
}

/**
 * Generates Chrome extension code with streaming support
 * @param {string} codingPrompt - The coding prompt to use
 * @param {Object} replacements - Object containing placeholder replacements
 * @param {string} sessionId - Session/project identifier
 * @param {boolean} skipThinking - Whether to skip the thinking phase
 * @param {Object} options - Additional options
 * @returns {AsyncGenerator} Stream of code generation
 */
export async function* generateExtensionCodeStream(codingPrompt, replacements, sessionId, skipThinking = false, options = {}) {
  const {
    conversationTokenTotal = 0,
    modelOverride,
    frontendType,
    requestType,
    usePatchingMode = false,
    existingFilesForPatch = {},
    userRequest = '',
    originalUserRequest = '', // Original natural language request for clean history storage
    images = null, // Image attachments for vision-enabled requests
    expectedFileCount = 3 // Number of files expected to be generated/modified
  } = options

  console.log("Generating extension code with streaming...", usePatchingMode ? "(patching mode)" : "(replacement mode)")

  // Determine thinking level based on request type and file count
  let thinkingLevel = ThinkingLevel.MEDIUM // Default
  if (requestType === REQUEST_TYPES.ADD_TO_EXISTING) {
    // Follow-ups always use MEDIUM
    thinkingLevel = ThinkingLevel.MEDIUM
    console.log(`💭 [generateExtensionCodeStream] Follow-up request: using MEDIUM thinking level`)
  } else if (requestType === REQUEST_TYPES.NEW_EXTENSION) {
    // New extensions: LOW for 2 or fewer files, MEDIUM for 3+
    thinkingLevel = expectedFileCount <= 2 ? ThinkingLevel.LOW : ThinkingLevel.MEDIUM
    console.log(`💭 [generateExtensionCodeStream] New extension with ${expectedFileCount} files: using ${thinkingLevel} thinking level`)
  }
  
  // Replace placeholders in the coding prompt
  let finalPrompt = codingPrompt
  for (const [placeholder, value] of Object.entries(replacements)) {
    console.log(`Adding ${placeholder} to the prompt`)
    finalPrompt = finalPrompt.replace(new RegExp(`{${placeholder}}`, 'g'), value)
  }

  // Remove empty <workspace_authentication> section when Planning Orchestrator reported no workspace/Google OAuth usage
  const beforeLen = finalPrompt.length
  finalPrompt = finalPrompt.replace(/\s*<workspace_authentication>\s*<\/workspace_authentication>\s*/g, '\n\n')
  if (finalPrompt.length !== beforeLen) {
    console.log('🔐 [generate-extension-code-stream] Removed empty <workspace_authentication> section from coding prompt')
  }

  console.log('🧾 Raw final coding prompt (stream):\n', finalPrompt)

  yield { type: "generating_code", content: "Starting code generation..." }

  const modelUsed = modelOverride || DEFAULT_MODEL
  const provider = getProviderFromModel(modelUsed)
  
  // Skip schema for patching mode
  const jsonSchema = usePatchingMode 
    ? null 
    : selectUnifiedSchema(provider, frontendType || 'generic', requestType || 'NEW_EXTENSION')
  
  console.log(`Using ${provider} provider ${usePatchingMode ? 'in patching mode (no schema)' : `with schema for frontend type: ${frontendType || 'generic'}`}`)

  try {
    // Handle new request with Gemini streaming
    if (provider === 'gemini') {
      yield* handleGeminiStreamingFlow(provider, modelOverride, finalPrompt, jsonSchema, sessionId, conversationTokenTotal, replacements, usePatchingMode, existingFilesForPatch, userRequest, originalUserRequest, images, thinkingLevel)
      return
    }

    // Handle new request with other providers
    yield* handleStandardResponseFlow(provider, modelOverride, finalPrompt, jsonSchema, sessionId, conversationTokenTotal, replacements, usePatchingMode, existingFilesForPatch, userRequest, originalUserRequest, images, thinkingLevel)

  } catch (err) {
    console.error("[generateExtensionCodeStream] LLM Service error", err?.message || err)
    const adapter = llmService.providerRegistry.getAdapter(provider)
    if (adapter?.isContextLimitError?.(err)) {
      // Clear conversation history to resolve context limit
      await llmService.clearConversationHistory(sessionId)
      console.log("[generateExtensionCodeStream] Cleared conversation history due to context limit")
      yield { type: "context_window", content: "Context limit reached. Conversation history has been cleared.", total: conversationTokenTotal }
      return
    }
    throw err
  }
}

/**
 * Handles Gemini streaming flow
 */
async function* handleGeminiStreamingFlow(provider, modelOverride, finalPrompt, jsonSchema, sessionId, conversationTokenTotal, replacements, usePatchingMode, existingFilesForPatch, userRequest, originalUserRequest, images = null, thinkingLevel = ThinkingLevel.MEDIUM) {
  console.log("[generateExtensionCodeStream] Using Gemini streaming", images ? `with ${images.length} images` : '')
  
  let combinedText = ''
  let exactTokenUsage = null
  
  // Prepare input with images if provided
  let input = finalPrompt
  if (images && images.length > 0) {
    input = {
      text: finalPrompt,
      images: images
    }
  }
  
  for await (const s of llmService.streamResponse({
    provider,
    model: modelOverride || DEFAULT_MODEL,
    input: input,
    temperature: 0.2,
    max_output_tokens: 32000,
    response_format: jsonSchema,
    session_id: sessionId,
    thinkingConfig: {
      includeThoughts: true,
      thinkingLevel: thinkingLevel
    }
  })) {
    if (s?.type === 'thinking_chunk') {
      yield { type: 'thinking_chunk', content: s.content }
    } else if (s?.type === 'answer_chunk' || s?.type === 'content') {
      combinedText += s.content
    } else if (s?.type === 'token_usage') {
      exactTokenUsage = s.usage
      console.log('[generateExtensionCodeStream] Captured exact token usage:', exactTokenUsage)
    }
  }
  
  const response = { output_text: combinedText, usage: exactTokenUsage || { total_tokens: 0 } }
  const { tokensUsedThisRequest } = processResponseMetadata(response, conversationTokenTotal)
  
  console.log("[generateExtensionCodeStream] Gemini streaming tokens", { tokensUsedThisRequest })

  yield { type: "token_usage", total: tokensUsedThisRequest }
  yield { type: "complete", content: combinedText }

  // Log raw output when patching mode is active
  if (usePatchingMode) {
    console.log('🔧 [Gemini Patch Mode] Raw LLM output:')
    console.log('─'.repeat(80))
    console.log(combinedText)
    console.log('─'.repeat(80))
  }

  if (usePatchingMode && containsPatch(combinedText)) {
    yield* handlePatchingMode(combinedText, existingFilesForPatch, userRequest, provider, modelOverride || DEFAULT_MODEL, sessionId, replacements, originalUserRequest)
  } else {
    if (usePatchingMode) {
      console.log('⚠️ [Gemini] Patching mode was active but no patch detected in output')
    }
    yield* handleReplacementMode(combinedText, sessionId, replacements, "Gemini stream", originalUserRequest)
  }
  
  // Emit usage summary if available
  if (exactTokenUsage && (typeof exactTokenUsage.thoughts_tokens === 'number' || typeof exactTokenUsage.completion_tokens === 'number')) {
    yield {
      type: "usage_summary",
      thinking_tokens: exactTokenUsage.thoughts_tokens || 0,
      completion_tokens: exactTokenUsage.completion_tokens || 0,
      token_limit: 32000
    }
  }
  
  yield { type: "phase", phase: "implementing", content: "Implementation complete: generated extension artifacts and updated the project." }
}

/**
 * Handles standard (non-streaming) response flow
 */
async function* handleStandardResponseFlow(provider, modelOverride, finalPrompt, jsonSchema, sessionId, conversationTokenTotal, replacements, usePatchingMode, existingFilesForPatch, userRequest, originalUserRequest, images = null, thinkingLevel = ThinkingLevel.MEDIUM) {
  console.log("[generateExtensionCodeStream] Using Responses API (new)", images ? `with ${images.length} images` : '')
  
  // Prepare input with images if provided
  let input = finalPrompt
  if (images && images.length > 0) {
    input = {
      text: finalPrompt,
      images: images
    }
  }
  
  const response = await llmService.createResponse({
    provider,
    model: modelOverride || DEFAULT_MODEL,
    input: input,
    store: false, // Manual history storage handles clean content
    temperature: 0.2,
    max_output_tokens: 40000,
    response_format: jsonSchema,
    session_id: sessionId,
    thinkingConfig: {
      includeThoughts: true,
      thinkingLevel: thinkingLevel
    }
  })
  
  const { tokensUsedThisRequest } = processResponseMetadata(response, conversationTokenTotal)
  console.log("[generateExtensionCodeStream] Responses API tokens", { tokensUsedThisRequest })

  yield { type: "token_usage", total: tokensUsedThisRequest }
  yield { type: "complete", content: response?.output_text || "" }

  const outputText = response?.output_text || ''
  
  // Log raw output when patching mode is active
  if (usePatchingMode) {
    console.log('🔧 [Responses API Patch Mode] Raw LLM output:')
    console.log('─'.repeat(80))
    console.log(outputText)
    console.log('─'.repeat(80))
  }
  
  if (usePatchingMode && containsPatch(outputText)) {
    yield* handlePatchingMode(outputText, existingFilesForPatch, userRequest, provider, modelOverride || DEFAULT_MODEL, sessionId, replacements, originalUserRequest)
  } else {
    if (usePatchingMode) {
      console.log('⚠️ [Responses API] Patching mode was active but no patch detected in output')
    }
    yield* handleReplacementMode(outputText, sessionId, replacements, "Responses API completion (new)", originalUserRequest)
  }
  
  yield { type: "phase", phase: "implementing", content: "Implementation complete: generated extension artifacts and updated the project." }
}
