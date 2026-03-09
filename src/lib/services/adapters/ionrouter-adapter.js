// ionrouter-adapter.js
// Ionrouter Kimi adapter using OpenAI-compatible SDK
// Base URL: https://api.ionrouter.io/v1, model: kimi-k2.5
import OpenAI from 'openai'

export class IonrouterAdapter {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.IONROUTER_API_KEY,
      baseURL: 'https://kimi.ionrouter.io/v1'
    })

    this.max_output_tokens = 32768
  }

  /**
   * Strip any reasoning/thinking blocks that may have leaked into content.
   * @param {string} text - Raw content
   * @returns {string} Content with reasoning blocks removed
   */
  stripReasoningFromContent(text) {
    if (!text || typeof text !== 'string') return text || ''
    let out = text
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, '')
    out = out.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    return out.trim()
  }

  /**
   * Create a response using Ionrouter API (OpenAI-compatible)
   * For max_output_tokens > 4096, uses streaming internally.
   */
  async createResponse({
    model = 'kimi-k2.5',
    input,
    response_format,
    temperature = 0.6,
    max_output_tokens = this.max_output_tokens,
    conversation_history = [],
    store = true,
    thinkingConfig = null
  } = {}) {
    try {
      console.log('[ionrouter-adapter] createResponse', {
        model,
        has_conversation_history: conversation_history.length > 0,
        has_response_format: Boolean(response_format),
        max_output_tokens
      })

      const messages = this.normalizeInput(input, conversation_history)

      if (max_output_tokens > 4096) {
        return await this.createResponseViaStreaming({
          model,
          messages,
          response_format,
          temperature,
          max_output_tokens
        })
      }

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
        console.log('[ionrouter-adapter] createResponse token usage:', normalized.usage)
      }
      return normalized
    } catch (error) {
      console.error('[ionrouter-adapter] createResponse error:', error)
      throw error
    }
  }

  /**
   * Create response via streaming when max_tokens > 4096.
   */
  async createResponseViaStreaming({
    model,
    messages,
    response_format,
    temperature,
    max_output_tokens
  }) {
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

    let content = ''
    let promptTokens = 0
    let completionTokens = 0

    for await (const chunk of stream) {
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens ?? chunk.usage.input_tokens ?? 0
        completionTokens = chunk.usage.completion_tokens ?? chunk.usage.output_tokens ?? 0
      }
      if (chunk.choices?.[0]?.delta?.content) {
        content += chunk.choices[0].delta.content
      }
    }

    const usage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      total: promptTokens + completionTokens
    }
    console.log('[ionrouter-adapter] createResponseViaStreaming token usage:', usage)

    content = this.stripReasoningFromContent(content)

    return {
      id: null,
      output_text: content,
      usage,
      choices: [{ message: { content } }]
    }
  }

  /**
   * Stream a response using Ionrouter API (OpenAI-compatible)
   */
  async* streamResponse({
    model = 'kimi-k2.5',
    input,
    response_format,
    temperature = 0.4,
    max_output_tokens = this.max_output_tokens,
    conversation_history = [],
    thinkingConfig = null
  } = {}) {
    try {
      console.log('[ionrouter-adapter] streamResponse', {
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
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens ?? chunk.usage.input_tokens ?? 0
          completionTokens = chunk.usage.completion_tokens ?? chunk.usage.output_tokens ?? 0
        }
        if (chunk.choices?.[0]?.delta?.content) {
          yield { type: 'answer_chunk', content: chunk.choices[0].delta.content }
        }
      }

      const usage = {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        total: promptTokens + completionTokens
      }
      if (usage.total_tokens > 0) {
        console.log('[ionrouter-adapter] streamResponse token usage:', usage)
        yield { type: 'token_usage', usage }
      }
    } catch (error) {
      console.error('[ionrouter-adapter] streamResponse error:', error)
      throw error
    }
  }

  sanitizeMessage(msg) {
    if (!msg || typeof msg !== 'object') return msg
    const { role, content, name, images } = msg

    let apiContent = content ?? ''
    if (images && Array.isArray(images) && images.length > 0) {
      const textContent = typeof content === 'string' ? content : (content?.text ?? '')
      apiContent = [{ type: 'text', text: textContent }]
      for (const img of images) {
        if (img?.data) {
          apiContent.push({ type: 'image_url', image_url: { url: img.data } })
        }
      }
    }

    const sanitized = { role, content: apiContent }
    if (name) sanitized.name = name
    return sanitized
  }

  normalizeInput(input, conversation_history = []) {
    const messages = conversation_history
      .filter((m) => m && m.role)
      .map((m) => this.sanitizeMessage(m))

    if (typeof input === 'string') {
      messages.push({ role: 'user', content: input })
    } else if (Array.isArray(input)) {
      messages.push(...input.map((m) => this.sanitizeMessage(m)))
    } else if (typeof input === 'object' && input.text) {
      const content = [{ type: 'text', text: input.text }]

      if (input.images && Array.isArray(input.images)) {
        console.log(`[ionrouter-adapter] Adding ${input.images.length} images to request`)
        for (const image of input.images) {
          if (image.data) {
            content.push({
              type: 'image_url',
              image_url: { url: image.data }
            })
          } else {
            console.warn('[ionrouter-adapter] Invalid image format, expected data URL')
          }
        }
      }

      messages.push({ role: 'user', content })
    } else {
      messages.push({ role: 'user', content: String(input) })
    }

    return messages
  }

  normalizeResponseFormat(response_format) {
    if (!response_format) return null

    const rfType = response_format?.type || response_format?.format
    if (rfType === 'json_schema' || rfType === 'json' || response_format?.schema) {
      return { type: 'json_object' }
    }

    if (rfType === 'text') {
      return { type: 'text' }
    }

    return null
  }

  normalizeResponse(response) {
    const choice = response.choices?.[0]
    const msg = choice?.message
    let content = msg?.content ?? ''
    content = this.stripReasoningFromContent(content)
    const rawUsage = response.usage

    const usage = rawUsage ? {
      prompt_tokens: rawUsage.prompt_tokens ?? rawUsage.input_tokens ?? 0,
      completion_tokens: rawUsage.completion_tokens ?? rawUsage.output_tokens ?? 0,
      total_tokens: rawUsage.total_tokens ?? 0,
      total: rawUsage.total_tokens ?? 0
    } : null

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

  isContextLimitError(error) {
    const message = (error?.message || '').toLowerCase()
    const code = (error?.code || error?.status)?.toString().toLowerCase()

    const keywords = [
      'context', 'token', 'max', 'length', 'quota', 'limit',
      'too many tokens', 'exceeds', 'maximum context length', 'context length exceeded'
    ]

    const codeMatches = ['context_length_exceeded', 'max_tokens', 'rate_limit_exceeded'].some(k => (code || '').includes(k))
    const msgMatches = keywords.some(k => message.includes(k))

    return Boolean(codeMatches || msgMatches)
  }
}

export default IonrouterAdapter
