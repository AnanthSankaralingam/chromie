// google-ai.js
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  DEFAULT_MODEL,
  RESPONSE_STORE_DEFAULT,
  CONTEXT_WINDOW_MAX_TOKENS_DEFAULT
} from '../constants'

// Stateless wrapper for Google Generative AI
// createResponse and continueResponse both call the Gemini API

function logCreate({ model, has_previous_context, store }) {
  console.log('[google-ai] create', {
    model,
    has_previous_context: Boolean(has_previous_context),
    store
  })
}

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
  return new GoogleGenerativeAI(apiKey)
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

// Removed unused helper functions since we're handling response formatting directly in generateContent

export async function generateContent({ model, input, response_format, temperature, max_output_tokens, conversation_history } = {}) {
  const client = getClient()
  const effectiveModel = model || DEFAULT_MODEL

  try {
    console.log('[google-ai] generateContent', {
      model: effectiveModel,
      has_conversation_history: Boolean(conversation_history),
      has_response_format: Boolean(response_format)
    })
    
    const genModel = client.getGenerativeModel({ 
      model: effectiveModel,
      generationConfig: {
        temperature: temperature || 0.2,
        maxOutputTokens: max_output_tokens || 15000,
        ...(response_format ? { responseMimeType: "application/json" } : {})
      }
    })

    let prompt = normalizeInput(input)
    
    // Add JSON schema instruction if provided
    if (response_format) {
      const schemaInstruction = `\n\nPlease respond with valid JSON that matches this schema: ${JSON.stringify(response_format.schema || response_format)}`
      prompt += schemaInstruction
    }
    
    // Add conversation history if provided
    if (conversation_history && conversation_history.length > 0) {
      const historyText = conversation_history.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')
      prompt = `Previous conversation:\n${historyText}\n\nNew request:\n${prompt}`
    }

    const result = await genModel.generateContent(prompt)
    const response = await result.response
    
    // Extract text properly for usage calculation
    let responseText = ''
    if (typeof response?.text === 'function') {
      responseText = response.text()
    } else if (typeof response?.text === 'string') {
      responseText = response.text
    } else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      responseText = response.candidates[0].content.parts[0].text
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
