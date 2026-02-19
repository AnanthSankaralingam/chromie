// fireworks-adapter.js
// Fireworks AI adapter using OpenAI-compatible SDK for Kimi K2.5 and other Fireworks models
import OpenAI from 'openai'

export class FireworksAdapter {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.FIREWORKS_API_KEY,
      baseURL: 'https://api.fireworks.ai/inference/v1'
    })

    this.max_output_tokens = 32768
  }

  /**
   * Create a response using Fireworks API (OpenAI-compatible)
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} Response object
   */
  async createResponse({
    model = 'accounts/fireworks/models/kimi-k2p5',
    input,
    response_format,
    temperature = 0.6,
    max_output_tokens = this.max_output_tokens,
    conversation_history = [],
    store = true,
    thinkingConfig = null
  } = {}) {
    try {
      console.log('[fireworks-adapter] createResponse', {
        model,
        has_conversation_history: conversation_history.length > 0,
        has_response_format: Boolean(response_format)
      })

      const messages = this.normalizeInput(input, conversation_history)

      const payload = {
        model,
        messages,
        temperature,
        max_tokens: max_output_tokens,
        stream: false
      }

      if (response_format) {
        const normalized = this.normalizeResponseFormat(response_format)
        if (normalized) payload.response_format = normalized
      }

      const response = await this.client.chat.completions.create(payload)
      const normalized = this.normalizeResponse(response)
      if (normalized.usage) {
        console.log('[fireworks-adapter] createResponse token usage:', normalized.usage)
      }
      return normalized
    } catch (error) {
      console.error('[fireworks-adapter] createResponse error:', error)
      throw error
    }
  }

  /**
   * Stream a response using Fireworks API (OpenAI-compatible)
   * @param {Object} params - Request parameters
   * @returns {AsyncGenerator<Object>} Streaming response chunks
   */
  async* streamResponse({
    model = 'accounts/fireworks/models/kimi-k2p5',
    input,
    response_format,
    temperature = 0.4,
    max_output_tokens = this.max_output_tokens,
    conversation_history = [],
    thinkingConfig = null
  } = {}) {
    try {
      console.log('[fireworks-adapter] streamResponse', {
        model,
        has_conversation_history: conversation_history.length > 0
      })

      const messages = this.normalizeInput(input, conversation_history)

      const payload = {
        model,
        messages,
        temperature,
        max_tokens: max_output_tokens,
        stream: true
      }

      if (response_format) {
        const normalized = this.normalizeResponseFormat(response_format)
        if (normalized) payload.response_format = normalized
      }

      const stream = await this.client.chat.completions.create(payload)

      let promptTokens = 0
      let completionTokens = 0

      for await (const chunk of stream) {
        // Capture usage if provided in the final chunk
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens ?? chunk.usage.input_tokens ?? 0
          completionTokens = chunk.usage.completion_tokens ?? chunk.usage.output_tokens ?? 0
        }

        if (chunk.choices && chunk.choices.length > 0) {
          const choice = chunk.choices[0]
          if (choice.delta && choice.delta.content) {
            yield { type: 'answer_chunk', content: choice.delta.content }
          }
        }
      }

      // Yield token usage summary and log when stream completes
      const usage = {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        total: promptTokens + completionTokens
      }
      if (usage.total_tokens > 0) {
        console.log('[fireworks-adapter] streamResponse token usage:', usage)
        yield {
          type: 'token_usage',
          usage
        }
      }
    } catch (error) {
      console.error('[fireworks-adapter] streamResponse error:', error)
      throw error
    }
  }

  /**
   * Normalize input to OpenAI messages format
   * @param {string|Array|Object} input - Input text, messages, or object with text and images
   * @param {Array} conversation_history - Previous conversation history
   * @returns {Array} Normalized messages
   */
  normalizeInput(input, conversation_history = []) {
    const messages = [...conversation_history]

    if (typeof input === 'string') {
      messages.push({ role: 'user', content: input })
    } else if (Array.isArray(input)) {
      messages.push(...input)
    } else if (typeof input === 'object' && input.text) {
      // Handle input with images (vision request) — Kimi K2.5 supports image_url
      const content = [{ type: 'text', text: input.text }]

      if (input.images && Array.isArray(input.images)) {
        console.log(`[fireworks-adapter] Adding ${input.images.length} images to request`)
        for (const image of input.images) {
          if (image.data) {
            content.push({
              type: 'image_url',
              image_url: { url: image.data }
            })
          } else {
            console.warn('[fireworks-adapter] Invalid image format, expected data URL')
          }
        }
      }

      messages.push({ role: 'user', content })
    } else {
      messages.push({ role: 'user', content: String(input) })
    }

    return messages
  }

  /**
   * Normalize response format for Fireworks API
   * @param {Object} response_format - Response format configuration
   * @returns {Object|null} Normalized response format
   */
  normalizeResponseFormat(response_format) {
    if (!response_format) return null

    const rfType = response_format?.type || response_format?.format
    if (rfType === 'json_schema' || rfType === 'json' || response_format?.schema) {
      return {
        type: 'json_object'
      }
    }

    if (rfType === 'text') {
      return { type: 'text' }
    }

    return null
  }

  /**
   * Normalize Fireworks response to expected format
   * @param {Object} response - API response
   * @returns {Object} Normalized response
   */
  normalizeResponse(response) {
    const choice = response.choices?.[0]
    const content = choice?.message?.content || ''
    const rawUsage = response.usage

    const usage = rawUsage ? {
      prompt_tokens: rawUsage.prompt_tokens ?? rawUsage.input_tokens ?? 0,
      completion_tokens: rawUsage.completion_tokens ?? rawUsage.output_tokens ?? 0,
      total_tokens: rawUsage.total_tokens ?? 0,
      total: rawUsage.total_tokens ?? 0
    } : null

    // Ensure total_tokens is computed if missing
    if (usage && usage.total_tokens === 0 && (usage.prompt_tokens > 0 || usage.completion_tokens > 0)) {
      usage.total_tokens = usage.prompt_tokens + usage.completion_tokens
      usage.total = usage.total_tokens
    }

    return {
      id: response.id,
      output_text: content,
      usage,
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

export default FireworksAdapter
