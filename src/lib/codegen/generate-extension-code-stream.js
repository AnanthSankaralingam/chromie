/**
 * Chrome Extension Code Generation Stream
 * Handles LLM-based code generation with streaming support
 */

import { llmService } from "../services/llm-service"
import { selectUnifiedSchema } from "../response-schemas/unified-schemas"
import { DEFAULT_MODEL } from "../constants"
import { containsPatch } from "../utils/patch-applier"
import { extractJsonContent, parseJsonWithRetry } from "./json-extractor"
import { processPatchModeOutput } from "./patch-processor"
import { saveFilesToDatabase, updateProjectMetadata } from "./file-saver"

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
 * Stores clean conversation history (user query + explanation only, no code)
 * @param {string} sessionId - Session/project identifier
 * @param {string} originalUserRequest - Original natural language request
 * @param {string} explanation - AI explanation text (no code)
 */
async function storeConversationHistory(sessionId, originalUserRequest, explanation) {
  if (!sessionId || !originalUserRequest) {
    console.log('[conversation-history] Skipping storage - missing sessionId or originalUserRequest')
    return
  }

  await llmService.chatMessages.addMessage(sessionId, { role: 'user', content: originalUserRequest })
  await llmService.chatMessages.addMessage(sessionId, { role: 'assistant', content: explanation })
  console.log(`✅ [conversation-history] Stored user query and explanation (${explanation.length} chars)`)
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
    if (event?.type) {
      yield event
    } else if (event?.files) {
      patchResult = event
    }
  }
  
  if (patchResult?.success) {
    const explanation = patchResult.explanation || "Implementation complete."
    if (patchResult.explanation) {
      yield { type: "explanation", content: patchResult.explanation }
    }
    
    const implementationResult = { ...patchResult.files }
    if (patchResult.explanation) {
      implementationResult.explanation = patchResult.explanation
    }
    
    const { savedFiles } = await saveFilesToDatabase(implementationResult, sessionId, replacements)
    await updateProjectMetadata(sessionId, patchResult.files)
    
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
    originalUserRequest = '' // Original natural language request for clean history storage
  } = options
  
  console.log("Generating extension code with streaming...", usePatchingMode ? "(patching mode)" : "(replacement mode)")
  
  // Replace placeholders in the coding prompt
  let finalPrompt = codingPrompt
  for (const [placeholder, value] of Object.entries(replacements)) {
    console.log(`Adding ${placeholder} to the prompt`)
    finalPrompt = finalPrompt.replace(new RegExp(`{${placeholder}}`, 'g'), value)
  }

  console.log('🧾 Raw final coding prompt (stream):\n', finalPrompt)

  yield { type: "generating_code", content: "Starting code generation..." }

  const modelUsed = modelOverride || "gemini-2.5-flash"
  const provider = getProviderFromModel(modelUsed)
  
  // Skip schema for patching mode
  const jsonSchema = usePatchingMode 
    ? null 
    : selectUnifiedSchema(provider, frontendType || 'generic', requestType || 'NEW_EXTENSION')
  
  console.log(`Using ${provider} provider ${usePatchingMode ? 'in patching mode (no schema)' : `with schema for frontend type: ${frontendType || 'generic'}`}`)

  try {
    // Handle new request with Gemini streaming
    if (provider === 'gemini') {
      yield* handleGeminiStreamingFlow(provider, modelOverride, finalPrompt, jsonSchema, sessionId, conversationTokenTotal, replacements, usePatchingMode, existingFilesForPatch, userRequest, originalUserRequest)
      return
    }

    // Handle new request with other providers
    yield* handleStandardResponseFlow(provider, modelOverride, finalPrompt, jsonSchema, sessionId, conversationTokenTotal, replacements, usePatchingMode, existingFilesForPatch, userRequest, originalUserRequest)
    
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
async function* handleGeminiStreamingFlow(provider, modelOverride, finalPrompt, jsonSchema, sessionId, conversationTokenTotal, replacements, usePatchingMode, existingFilesForPatch, userRequest, originalUserRequest) {
  console.log("[generateExtensionCodeStream] Using Gemini streaming")
  
  let combinedText = ''
  let exactTokenUsage = null
  
  for await (const s of llmService.streamResponse({
    provider,
    model: modelOverride || DEFAULT_MODEL,
    input: finalPrompt,
    temperature: 0.2,
    max_output_tokens: 32000,
    response_format: jsonSchema,
    session_id: sessionId,
    thinkingConfig: { includeThoughts: true }
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

  if (usePatchingMode && containsPatch(combinedText)) {
    yield* handlePatchingMode(combinedText, existingFilesForPatch, userRequest, provider, modelOverride || DEFAULT_MODEL, sessionId, replacements, originalUserRequest)
  } else {
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
async function* handleStandardResponseFlow(provider, modelOverride, finalPrompt, jsonSchema, sessionId, conversationTokenTotal, replacements, usePatchingMode, existingFilesForPatch, userRequest, originalUserRequest) {
  console.log("[generateExtensionCodeStream] Using Responses API (new)")
  
  const response = await llmService.createResponse({
    provider,
    model: modelOverride || DEFAULT_MODEL,
    input: finalPrompt,
    store: false, // Manual history storage handles clean content
    temperature: 0.2,
    max_output_tokens: 32000,
    response_format: jsonSchema,
    session_id: sessionId,
    thinkingConfig: { includeThoughts: true }
  })
  
  const { tokensUsedThisRequest } = processResponseMetadata(response, conversationTokenTotal)
  console.log("[generateExtensionCodeStream] Responses API tokens", { tokensUsedThisRequest })

  yield { type: "token_usage", total: tokensUsedThisRequest }
  yield { type: "complete", content: response?.output_text || "" }

  const outputText = response?.output_text || ''
  
  if (usePatchingMode && containsPatch(outputText)) {
    yield* handlePatchingMode(outputText, existingFilesForPatch, userRequest, provider, modelOverride || DEFAULT_MODEL, sessionId, replacements, originalUserRequest)
  } else {
    yield* handleReplacementMode(outputText, sessionId, replacements, "Responses API completion (new)", originalUserRequest)
  }
  
  yield { type: "phase", phase: "implementing", content: "Implementation complete: generated extension artifacts and updated the project." }
}
