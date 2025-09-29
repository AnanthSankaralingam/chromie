import { createClient } from "../supabase/server"
import { randomUUID } from "crypto"
import { continueResponse, createResponse } from "../services/google-ai"
import { DEFAULT_MODEL } from "../constants"
import { generateExtensionCodeStream } from "./generate-extension-code-stream"
import { selectResponseSchema as selectOpenAISchema } from "../response-schemas/openai-response-schemas"
import { selectResponseSchema as selectGeminiSchema } from "../response-schemas/gemini-response-schemas"

/**
 * Generates Chrome extension code using the specified coding prompt
 * @param {string} codingPrompt - The coding prompt to use
 * @param {Object} replacements - Object containing placeholder replacements
 * @param {boolean} stream - Whether to stream the response
 * @param {Object} options - Additional options including frontendType and requestType
 * @returns {Promise<Object>} Generated extension code and metadata
 */
export async function generateExtensionCode(codingPrompt, replacements, stream = false, options = {}) {
  const { previousResponseId, conversationTokenTotal = 0, modelOverride, contextWindowMaxTokens, frontendType, requestType } = options
  console.log("Generating extension code using coding prompt...")
  
  // Replace placeholders in the coding prompt
  let finalPrompt = codingPrompt
  
  // Handle webpage_data section conditionally - remove entire section if no data
  if (replacements.scraped_webpage_analysis === '<!-- No specific websites targeted -->' || 
      replacements.scraped_webpage_analysis === '<!-- Website analysis skipped by user -->') {
    // Remove the entire webpage_data section
    finalPrompt = finalPrompt.replace(/<webpage_data>[\s\S]*?<\/webpage_data>/g, '')
    console.log('Removed webpage_data section - no specific websites targeted')
  }
  
  for (const [placeholder, value] of Object.entries(replacements)) {
    if (!placeholder.includes('icon')) {
      console.log(`Replacing ${placeholder} with ${value}`)
    }
    finalPrompt = finalPrompt.replace(new RegExp(`{${placeholder}}`, 'g'), value)
  }

  // console.log('🧾 Final coding prompt (non-stream):\n', finalPrompt)

  const modelUsed = modelOverride || "gemini-2.5-pro"
  
  // Select the appropriate schema based on frontend type and request type
  const isGoogleModel = typeof modelUsed === 'string' && modelUsed.toLowerCase().includes('gemini')
  const jsonSchema = isGoogleModel
    ? selectGeminiSchema(frontendType || 'generic', requestType || 'NEW_EXTENSION')
    : selectOpenAISchema(frontendType || 'generic', requestType || 'NEW_EXTENSION')
  console.log(`Using schema for frontend type: ${frontendType || 'generic'}, request type: ${requestType || 'NEW_EXTENSION'}`)
  

  if (previousResponseId) {
    // Precheck for context window if provided
    if (contextWindowMaxTokens) {
      const estimatedTokensThisRequest = Math.ceil(finalPrompt.length / 4)
      const nextConversationTokenTotal = (conversationTokenTotal || 0) + estimatedTokensThisRequest
      console.log('[generateExtensionCode] context-window precheck', { estimatedTokensThisRequest, nextConversationTokenTotal, contextWindowMaxTokens })
      if (nextConversationTokenTotal > contextWindowMaxTokens) {
        return {
          errorType: 'context_window',
          message: 'Context limit reached. Please start a new conversation.',
          nextConversationTokenTotal
        }
      }
    }
    console.log("[generateExtensionCode] Using Responses API (follow-up)", { modelUsed, hasPrevious: true })
    try {
      const response = await continueResponse({
        model: modelOverride || DEFAULT_MODEL,
        previous_response_id: previousResponseId,
        input: finalPrompt,
        store: true,
        response_format: jsonSchema,
        temperature: 0.2,
        max_output_tokens: 15000
      })
      const tokensUsedThisRequest = response?.usage?.total_tokens || response?.usage?.total || Math.ceil(finalPrompt.length / 4)
      const nextConversationTokenTotal = (conversationTokenTotal || 0) + (tokensUsedThisRequest || 0)
      console.log("[generateExtensionCode] tokens", { tokensUsedThisRequest, nextConversationTokenTotal, nextResponseId: response?.id })
      // Return a shape compatible with existing callers
      return {
        choices: [
          { message: { content: response?.output_text || "" } }
        ],
        usage: {
          total_tokens: tokensUsedThisRequest
        },
        tokenUsage: {
          total_tokens: tokensUsedThisRequest,
          model: modelUsed
        },
        nextResponseId: response?.id,
        tokensUsedThisRequest,
        nextConversationTokenTotal
      }
    } catch (err) {
      console.error("[generateExtensionCode] Responses API error", err?.message || err)
      // Surface context-window error in a normalized shape
      const { isContextLimitError } = await import('../services/google-ai')
      if (isContextLimitError(err)) {
        const estimatedTokensThisRequest = Math.ceil(finalPrompt.length / 4)
        const nextConversationTokenTotal = (conversationTokenTotal || 0) + estimatedTokensThisRequest
        return {
          errorType: 'context_window',
          message: 'Context limit reached. Please start a new conversation.',
          nextConversationTokenTotal
        }
      }
      throw err
    }
  }

  console.log('[generateExtensionCode] Using Responses API (fresh)', { modelUsed })
  try {
    const response = await createResponse({
      model: modelUsed,
      input: finalPrompt,
      store: true,
      response_format: jsonSchema,
      temperature: 0.2,
      max_output_tokens: 15000
    })
    const tokensUsedThisRequest = response?.usage?.total_tokens || response?.usage?.total || Math.ceil(finalPrompt.length / 4)
    const nextResponseId = response?.id || null
    console.log('[generateExtensionCode] responses fresh tokens', { tokensUsedThisRequest, nextResponseId })
    return {
      choices: [
        { message: { content: response?.output_text || '' } }
      ],
      usage: {
        total_tokens: tokensUsedThisRequest
      },
      tokenUsage: {
        total_tokens: tokensUsedThisRequest,
        model: modelUsed
      },
      tokensUsedThisRequest,
      nextResponseId
    }
  } catch (err) {
    console.error('[generateExtensionCode] Responses API fresh error', err?.message || err)
    throw err
  }
}

