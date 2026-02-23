import Anthropic from '@anthropic-ai/sdk'

export class AnthropicAdapter {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
  }

  /**
   * Create a response using Anthropic API
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

      // Normalize input to Anthropic messages format
      const messages = this.normalizeInput(input, conversation_history)

      // Build request payload
      const payload = {
        model,
        messages,
        temperature,
        max_tokens: max_output_tokens,
        stream: false
      }

      // Handle response format (Anthropic uses output_config)
      const outputConfig = this.buildOutputConfig(response_format)
      if (outputConfig) {
        payload.output_config = outputConfig
      }

      const response = await this.client.messages.create(payload)

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
    conversation_history = [],
    thinkingConfig = null
  } = {}) {
    try {
      console.log('[anthropic-adapter] streamResponse', {
        model,
        has_conversation_history: conversation_history.length > 0
      })

      // Normalize input to Anthropic messages format
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
      const outputConfig = this.buildOutputConfig(response_format)
      if (outputConfig) {
        payload.output_config = outputConfig
      }

      // Handle thinking config (extended thinking)
      if (thinkingConfig?.includeThoughts) {
        payload.thinking = {
          type: 'enabled',
          budget_tokens: thinkingConfig.thinkingBudget ?? 4096
        }
      }

      const stream = await this.client.messages.create(payload)

      let lastStopReason = null
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta
          if (delta?.type === 'text_delta' && delta.text) {
            yield {
              type: 'content',
              content: delta.text,
              finish_reason: null
            }
          } else if (delta?.type === 'thinking_delta' && delta.thinking) {
            yield {
              type: 'thinking_chunk',
              content: delta.thinking
            }
          }
        } else if (event.type === 'message_delta') {
          lastStopReason = event.delta?.stop_reason ?? lastStopReason
          // Yield token usage if available
          if (event.usage) {
            const usage = {
              prompt_tokens: event.usage.input_tokens ?? 0,
              completion_tokens: event.usage.output_tokens ?? 0,
              total_tokens: (event.usage.input_tokens ?? 0) + (event.usage.output_tokens ?? 0),
              total: (event.usage.input_tokens ?? 0) + (event.usage.output_tokens ?? 0)
            }
            yield { type: 'token_usage', usage }
          }
        } else if (event.type === 'message_stop' && lastStopReason) {
          // Yield final chunk with finish reason
          yield {
            type: 'content',
            content: '',
            finish_reason: lastStopReason
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
    const messages = this.convertConversationHistory(conversation_history)

    if (typeof input === 'string') {
      messages.push({
        role: 'user',
        content: input
      })
    } else if (Array.isArray(input)) {
      // If input is already in message format, convert and add
      messages.push(...this.convertMessageArray(input))
    } else if (typeof input === 'object' && input.text) {
      // Handle input with images (vision request)
      const content = [{ type: 'text', text: input.text }]

      if (input.images && Array.isArray(input.images)) {
        console.log(`[anthropic-adapter] Adding ${input.images.length} images to request`)
        for (const image of input.images) {
          const imageBlock = this.parseImageToAnthropicFormat(image)
          if (imageBlock) {
            content.push(imageBlock)
          } else {
            console.warn('[anthropic-adapter] Invalid image format, expected data URL')
          }
        }
      }

      messages.push({
        role: 'user',
        content
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
   * Convert conversation history to Anthropic format
   * Anthropic requires assistant content to be array of content blocks
   */
  convertConversationHistory(history) {
    return this.convertMessageArray(history)
  }

  /**
   * Convert message array to Anthropic format
   */
  convertMessageArray(messages) {
    return messages.map((msg) => {
      if (msg.role === 'user') {
        return {
          role: 'user',
          content: typeof msg.content === 'string' ? msg.content : this.convertUserContent(msg.content)
        }
      }
      if (msg.role === 'assistant') {
        return {
          role: 'assistant',
          content: Array.isArray(msg.content)
            ? msg.content
            : [{ type: 'text', text: String(msg.content ?? '') }]
        }
      }
      return null
    }).filter(Boolean)
  }

  /**
   * Convert user content (may include OpenAI-style image_url) to Anthropic format
   */
  convertUserContent(content) {
    if (typeof content === 'string') return content
    if (!Array.isArray(content)) return [{ type: 'text', text: String(content) }]

    return content.map((block) => {
      if (block.type === 'text') return block
      if (block.type === 'image_url' && block.image_url?.url) {
        const imageBlock = this.parseImageToAnthropicFormat({ data: block.image_url.url })
        return imageBlock || { type: 'text', text: '' }
      }
      return { type: 'text', text: '' }
    }).filter((b) => b.type === 'text' ? b.text : true)
  }

  /**
   * Parse image data URL to Anthropic base64 format
   * @param {Object} image - { data: 'data:image/jpeg;base64,...' }
   */
  parseImageToAnthropicFormat(image) {
    const dataUrl = image.data || image.url
    if (!dataUrl || typeof dataUrl !== 'string') return null

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null

    const mediaType = match[1]
    const base64Data = match[2]

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(mediaType)) return null

    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Data
      }
    }
  }

  /**
   * Build Anthropic output_config from response_format
   */
  buildOutputConfig(response_format) {
    if (!response_format) return null

    const rfType = response_format?.type || response_format?.format
    if (rfType === 'json_schema' || rfType === 'json' || response_format?.schema) {
      const schema = response_format?.json_schema || response_format?.schema || response_format
      return {
        format: {
          type: 'json_schema',
          schema: typeof schema === 'object' ? schema : {}
        }
      }
    }

    return null
  }

  /**
   * Normalize Anthropic response to expected format
   */
  normalizeResponse(response) {
    const contentBlocks = response.content || []
    const textContent = contentBlocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const usage = response.usage
    const inputTokens = usage?.input_tokens ?? 0
    const outputTokens = usage?.output_tokens ?? 0
    const totalTokens = inputTokens + outputTokens

    return {
      id: response.id,
      output_text: textContent,
      usage: usage ? {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: totalTokens,
        total: totalTokens
      } : null,
      choices: [{ message: { content: textContent } }]
    }
  }

  /**
   * Check if an error is a context limit error
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

    const codeMatches = ['context_length_exceeded', 'max_tokens', 'rate_limit_exceeded'].some((k) => (code || '').includes(k))
    const msgMatches = keywords.some((k) => message.includes(k))

    return Boolean(codeMatches || msgMatches)
  }
}

export default AnthropicAdapter
