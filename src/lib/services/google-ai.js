// google-ai.js
import { GoogleGenAI } from '@google/genai'
import {
  DEFAULT_MODEL,
  RESPONSE_STORE_DEFAULT,
  CONTEXT_WINDOW_MAX_TOKENS_DEFAULT
} from '../constants'

// Stateless wrapper for Google Generative AI
// createResponse and continueResponse both call the Gemini API

function logError(err) {
  // Attempt to normalize Google AI error shape
  const type = err?.type || err?.name || 'Error'
  const code = err?.code || err?.status || err?.statusCode || err?.error?.code
  const message = err?.message || err?.error?.message || String(err)
  console.error('[google-ai] error', { type, code, message })
}

export function isContextLimitError(err) {
  const message = (err?.message || err?.error?.message || '').toLowerCase()
  const code = (err?.code || err?.error?.code || err?.status)?.toString().toLowerCase()
  // Heuristics for token/context limit errors
  const keywords = [
    'context',
    'token',
    'max',
    'length',
    'quota',
    'limit',
    'too many tokens',
    'exceeds',
    'maximum context length',
    'context length exceeded',
    'input too long'
  ]
  const codeMatches = ['context_length_exceeded', 'max_tokens', 'rate_limit_exceeded', 'quota_exceeded'].some(k => (code || '').includes(k))
  const msgMatches = keywords.some(k => message.includes(k))
  return Boolean(codeMatches || msgMatches)
}

function getClient() {
  // Uses GOOGLE_AI_API_KEY from env
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is required')
  }
  return new GoogleGenAI({ apiKey })
}

function normalizeInput(input) {
  // Normalize to string format for Gemini
  if (typeof input === 'string') {
    return input
  }
  
  // If it's an array of messages, extract text content
  if (Array.isArray(input)) {
    return input.map(msg => {
      if (msg.content && Array.isArray(msg.content)) {
        return msg.content.map(c => c.text || c.input_text || '').join('\n')
      }
      return msg.content || msg.text || ''
    }).join('\n\n')
  }

  return String(input)
}

export async function generateContent({ model, input, response_format, temperature, max_output_tokens, conversation_history } = {}) {
  const client = getClient()
  const effectiveModel = model || DEFAULT_MODEL

  try {
    console.log('[google-ai] generateContent', {
      model: effectiveModel,
      has_conversation_history: Boolean(conversation_history),
      has_response_format: Boolean(response_format)
    })
    
    let prompt = normalizeInput(input)
    
    // Add conversation history if provided
    if (conversation_history && conversation_history.length > 0) {
      const historyText = conversation_history.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')
      prompt = `Previous conversation:\n${historyText}\n\nNew request:\n${prompt}`
    }

    const result = await client.models.generateContent({
      model: effectiveModel,
      contents: prompt,
      config: {
        temperature: temperature || 0.2,
        maxOutputTokens: max_output_tokens || 15000,
        ...(response_format ? { responseMimeType: "application/json" } : {}),
        ...(response_format && response_format.schema ? { responseSchema: response_format.schema } : {})
      }
    })
    const response = result
    
    // Extract text properly for usage calculation
    let responseText = ''
    if (typeof response?.text === 'function') {
      responseText = response.text()
    } else if (typeof response?.text === 'string') {
      responseText = response.text
    }
    
    // If a schema was requested, attempt to normalize to valid JSON text
    if (response_format) {
      try {
        // First try a direct parse
        let parsed
        try {
          parsed = JSON.parse(responseText)
        } catch (_) {
          // Try to extract the largest JSON object/array substring
          const firstCurly = responseText.indexOf('{')
          const firstBracket = responseText.indexOf('[')
          const start = (firstCurly === -1) ? firstBracket : (firstBracket === -1 ? firstCurly : Math.min(firstCurly, firstBracket))
          if (start !== -1) {
            let depth = 0
            let end = -1
            const openChar = responseText[start]
            const closeChar = openChar === '{' ? '}' : ']'
            for (let i = start; i < responseText.length; i++) {
              const ch = responseText[i]
              if (ch === openChar) depth++
              if (ch === closeChar) depth--
              if (depth === 0) {
                end = i + 1
                break
              }
            }
            if (end !== -1) {
              const candidate = responseText.slice(start, end)
              parsed = JSON.parse(candidate)
            }
          }
        }
        if (parsed !== undefined) {
          responseText = JSON.stringify(parsed)
        }
      } catch (e) {
        console.warn('[google-ai] schema JSON normalization failed; returning raw text:', e?.message || e)
      }
    }

    // Calculate approximate usage (Gemini doesn't provide exact token counts like OpenAI)
    const inputTokens = Math.ceil(prompt.length / 4)
    const outputTokens = Math.ceil(responseText.length / 4)
    const usage = {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      total: inputTokens + outputTokens
    }

    return {
      id: `gemini-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      output_text: responseText,
      usage: usage,
      // Return in format compatible with existing code
      choices: [{ message: { content: responseText } }]
    }
  } catch (err) {
    logError(err)
    throw err
  }
}

// Backward compatibility functions for existing code
export async function createResponse(params = {}) {
  return await generateContent(params)
}

export async function continueResponse({ model, previous_response_id, input, store, response_format, temperature, max_output_tokens, previous_context } = {}) {
  // For Gemini, we don't have a native "continue" concept like OpenAI Responses API
  // We'll include any available context in the conversation_history
  console.log('[google-ai] continueResponse called, treating as new generateContent with context')
  
  const conversation_history = []
  if (previous_context) {
    conversation_history.push({ role: 'assistant', content: previous_context })
  }
  if (previous_response_id) {
    conversation_history.push({ role: 'system', content: `Previous response ID: ${previous_response_id}` })
  }
  
  return await generateContent({
    model,
    input,
    response_format,
    temperature,
    max_output_tokens,
    conversation_history
  })
}

export default {
  generateContent,
  createResponse,
  continueResponse,
  isContextLimitError,
  CONTEXT_WINDOW_MAX_TOKENS_DEFAULT
}
