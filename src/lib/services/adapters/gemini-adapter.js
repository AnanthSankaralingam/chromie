// gemini-adapter.js
// Gemini adapter using native Google GenAI SDK for proper streaming support
import { GoogleGenAI } from "@google/genai"
import OpenAI from 'openai'

export class GeminiAdapter {
  constructor() {
    // Use native Google GenAI SDK for streaming with thoughts
    this.genai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_AI_API_KEY
    })
    
    // Keep OpenAI client for non-streaming requests
    this.client = new OpenAI({
      apiKey: process.env.GOOGLE_AI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
    })
  }

  /**
   * Create a response using Gemini API via OpenAI SDK
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} Response object
   */
  async createResponse({
    model = 'gemini-1.5-pro',
    input,
    response_format,
    temperature = 0.2,
    max_output_tokens = 4096,
    conversation_history = [],
    store = true
  } = {}) {
    try {
      console.log('[gemini-adapter] createResponse', {
        model,
        has_conversation_history: conversation_history.length > 0,
        has_response_format: Boolean(response_format)
      })

      // Normalize input to messages format
      const messages = this.normalizeInput(input, conversation_history)

      // Build request payload
      const payload = {
        model,
        messages,
        temperature,
        max_tokens: max_output_tokens,
        stream: false
      }

      // Handle response format
      if (response_format) {
        payload.response_format = this.normalizeResponseFormat(response_format)
      }

      const response = await this.client.chat.completions.create(payload)

      // Normalize response to match expected format
      return this.normalizeResponse(response)
    } catch (error) {
      console.error('[gemini-adapter] createResponse error:', error)
      throw error
    }
  }

  /**
   * Continue a response using Gemini API
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} Response object
   */
  async continueResponse({
    model = 'gemini-1.5-pro',
    previous_response_id,
    input,
    response_format,
    temperature = 0.2,
    max_output_tokens = 4096,
    conversation_history = [],
    store = true
  } = {}) {
    try {
      console.log('[gemini-adapter] continueResponse', {
        model,
        has_previous_response_id: Boolean(previous_response_id),
        has_conversation_history: conversation_history.length > 0
      })

      // For Gemini, continueResponse works the same as createResponse
      // since we maintain conversation history in the messages
      return await this.createResponse({
        model,
        input,
        response_format,
        temperature,
        max_output_tokens,
        conversation_history,
        store
      })
    } catch (error) {
      console.error('[gemini-adapter] continueResponse error:', error)
      throw error
    }
  }

  /**
   * Stream a response using Gemini API with native SDK for thoughts support
   * @param {Object} params - Request parameters
   * @returns {AsyncGenerator<Object>} Streaming response chunks
   */
  async* streamResponse({
    model = 'gemini-2.5-flash',
    input,
    response_format,
    temperature = 0.2,
    max_output_tokens = 4096,
    conversation_history = []
  } = {}) {
    try {
      // Convert conversation history to Gemini format
      const contents = this.convertToGeminiFormat(input, conversation_history)

      // Build generation config
      const generationConfig = {
        temperature,
        maxOutputTokens: max_output_tokens
      }

      // Only add thinking config for models that support it
      if (model.includes('gemini-2.5') || model.includes('gemini-2.0')) {
        generationConfig.thinkingConfig = {
          includeThoughts: true
        }
        console.log('[gemini-adapter] Added thinkingConfig for model:', model)
      } else {
        console.log('[gemini-adapter] No thinkingConfig for model:', model)
      }

      console.log('[gemini-adapter] streamResponse', {
        model,
        has_conversation_history: conversation_history.length > 0,
        thinkingConfig: generationConfig.thinkingConfig
      })

      // Generate content stream directly
      console.log('[gemini-adapter] calling generateContentStream with config:', JSON.stringify(generationConfig, null, 2))
      
      // Use the correct API structure based on working version
      const response = await this.genai.models.generateContentStream({
        model: model,
        contents: contents,
        config: generationConfig
      })
      console.log('[gemini-adapter] generateContentStream response received')

      // Process streaming response - simplified based on working version
      for await (const chunk of response) {
        try {
          const parts = chunk?.candidates?.[0]?.content?.parts || []
          for (const part of parts) {
            const text = part?.text
            if (!text) continue
            
            if (part?.thought) {
              console.log('[gemini-adapter] yielding thinking chunk:', text.substring(0, 100) + '...')
              yield { type: 'thinking_chunk', content: text }
            } else {
              yield { type: 'answer_chunk', content: text }
            }
          }
        } catch (inner) {
          // Non-fatal: skip malformed chunk
          console.warn('[gemini-adapter] skipping malformed chunk:', inner.message)
        }
      }
    } catch (error) {
      console.error('[gemini-adapter] streamResponse error:', error)
      throw error
    }
  }

  /**
   * Convert input and conversation history to Gemini format
   * @param {string|Array} input - Input text or messages
   * @param {Array} conversation_history - Previous conversation history
   * @returns {Array} Gemini contents format
   */
  convertToGeminiFormat(input, conversation_history = []) {
    const contents = []

    // Add conversation history
    for (const message of conversation_history) {
      if (message.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: message.content }]
        })
      } else if (message.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: message.content }]
        })
      }
    }

    // Add current input
    if (typeof input === 'string') {
      contents.push({
        role: 'user',
        parts: [{ text: input }]
      })
    } else if (Array.isArray(input)) {
      // If input is already in message format, convert it
      for (const message of input) {
        if (message.role === 'user') {
          contents.push({
            role: 'user',
            parts: [{ text: message.content }]
          })
        } else if (message.role === 'assistant') {
          contents.push({
            role: 'model',
            parts: [{ text: message.content }]
          })
        }
      }
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: String(input) }]
      })
    }

    return contents
  }

  /**
   * Normalize input to Gemini messages format
   * @param {string|Array} input - Input text or messages
   * @param {Array} conversation_history - Previous conversation history
   * @returns {Array} Normalized messages
   */
  normalizeInput(input, conversation_history = []) {
    const messages = [...conversation_history]

    if (typeof input === 'string') {
      messages.push({
        role: 'user',
        content: input
      })
    } else if (Array.isArray(input)) {
      // If input is already in message format, add it
      messages.push(...input)
    } else {
      messages.push({
        role: 'user',
        content: String(input)
      })
    }

    return messages
  }

  /**
   * Normalize response format for Gemini API
   * @param {Object} response_format - Response format configuration
   * @returns {Object} Normalized response format
   */
  normalizeResponseFormat(response_format) {
    if (!response_format) return null

    const rfType = response_format?.type || response_format?.format
    if (rfType === 'json_schema' || rfType === 'json' || response_format?.schema) {
      return {
        type: 'json_schema',
        json_schema: {
          name: response_format?.name || 'response_schema',
          schema: response_format?.json_schema || response_format?.schema || response_format
        }
      }
    }

    if (rfType === 'text') {
      return { type: 'text' }
    }

    return null
  }

  /**
   * Normalize Gemini response to expected format
   * @param {Object} response - Gemini API response
   * @returns {Object} Normalized response
   */
  normalizeResponse(response) {
    const choice = response.choices?.[0]
    const content = choice?.message?.content || ''

    return {
      id: response.id,
      output_text: content,
      usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
        total: response.usage.total_tokens
      } : null,
      choices: response.choices
    }
  }

  /**
   * Check if an error is a context limit error
   * @param {Error} error - Error object
   * @returns {boolean} Whether it's a context limit error
   */
  isContextLimitError(error) {
    const message = (error?.message || '').toLowerCase()
    const code = (error?.code || error?.status)?.toString().toLowerCase()
    
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
      'context length exceeded'
    ]
    
    const codeMatches = ['context_length_exceeded', 'max_tokens', 'rate_limit_exceeded'].some(k => (code || '').includes(k))
    const msgMatches = keywords.some(k => message.includes(k))
    
    return Boolean(codeMatches || msgMatches)
  }
}

export default GeminiAdapter
