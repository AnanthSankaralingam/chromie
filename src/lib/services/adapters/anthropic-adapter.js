// anthropic-adapter.js
// Anthropic adapter using OpenAI SDK with Anthropic's API
import OpenAI from 'openai'

export class AnthropicAdapter {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: 'https://api.anthropic.com/v1'
    })
  }

  /**
   * Create a response using Anthropic API via OpenAI SDK
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} Response object
   */
  async createResponse({
    model = 'claude-haiku-4-5-20251001',
    input,
    response_format,
    temperature = 0.2,
    max_output_tokens = 4096,
    conversation_history = [],
    store = true
  } = {}) {
    try {
      console.log('[anthropic-adapter] createResponse', {
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
      console.error('[anthropic-adapter] createResponse error:', error)
      throw error
    }
  }

  /**
   * Stream a response using Anthropic API
   * @param {Object} params - Request parameters
   * @returns {AsyncGenerator<Object>} Streaming response chunks
   */
  async* streamResponse({
    model = 'claude-haiku-4-5-20251001',
    input,
    response_format,
    temperature = 0.2,
    max_output_tokens = 4096,
    conversation_history = []
  } = {}) {
    try {
      console.log('[anthropic-adapter] streamResponse', {
        model,
        has_conversation_history: conversation_history.length > 0
      })

      // Normalize input to messages format
      const messages = this.normalizeInput(input, conversation_history)

      // Build request payload
      const payload = {
        model,
        messages,
        temperature,
        max_tokens: max_output_tokens,
        stream: true
      }

      // Handle response format
      if (response_format) {
        payload.response_format = this.normalizeResponseFormat(response_format)
      }

      const stream = await this.client.chat.completions.create(payload)

      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices.length > 0) {
          const choice = chunk.choices[0]
          if (choice.delta && choice.delta.content) {
            yield {
              type: 'content',
              content: choice.delta.content,
              finish_reason: choice.finish_reason
            }
          }
        }
      }
    } catch (error) {
      console.error('[anthropic-adapter] streamResponse error:', error)
      throw error
    }
  }

  /**
   * Normalize input to Anthropic messages format
   * @param {string|Array|Object} input - Input text, messages, or object with text and images
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
    } else if (typeof input === 'object' && input.text) {
      // Handle input with images (vision request)
      const content = [{ type: 'text', text: input.text }]
      
      // Add images if present
      if (input.images && Array.isArray(input.images)) {
        console.log(`[anthropic-adapter] Adding ${input.images.length} images to request`)
        for (const image of input.images) {
          // Extract base64 data and mime type for Anthropic format
          const base64Match = image.data.match(/^data:([^;]+);base64,(.+)$/)
          if (base64Match) {
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: base64Match[1],
                data: base64Match[2]
              }
            })
          } else {
            console.warn('[anthropic-adapter] Invalid image format, expected base64 data URL')
          }
        }
      }
      
      messages.push({
        role: 'user',
        content: content
      })
    } else {
      messages.push({
        role: 'user',
        content: String(input)
      })
    }

    return messages
  }

  /**
   * Normalize response format for Anthropic API
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
   * Normalize Anthropic response to expected format
   * @param {Object} response - Anthropic API response
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

export default AnthropicAdapter
