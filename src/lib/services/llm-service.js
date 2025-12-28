// llm-service.js
// Unified LLM service that provides a consistent interface across different providers
import { ProviderRegistry } from './provider-registry.js'
import { ChatMessagesService } from './chat-messages-service.js'

export class LLMService {
  constructor() {
    this.providerRegistry = new ProviderRegistry()
    this.chatMessages = new ChatMessagesService()
  }

  /**
   * Create a new response using the specified provider and model
   * @param {Object} params - Request parameters
   * @param {string} params.provider - Provider name (openai, anthropic, gemini)
   * @param {string} params.model - Model name
   * @param {string|Array} params.input - Input text or messages
   * @param {Object} params.response_format - Response format configuration
   * @param {number} params.temperature - Temperature setting
   * @param {number} params.max_output_tokens - Maximum output tokens
   * @param {string} params.session_id - Session ID for conversation history
   * @param {boolean} params.store - Whether to store the response
   * @returns {Promise<Object>} Response object
   */
  async createResponse({
    provider = 'openai',
    model,
    input,
    response_format,
    temperature = 0.2,
    max_output_tokens = 4096,
    session_id,
    store = true,
    thinkingConfig = null
  } = {}) {
    try {
      console.log('[llm-service] createResponse', {
        provider,
        model,
        has_session_id: Boolean(session_id),
        has_response_format: Boolean(response_format),
        has_thinkingConfig: Boolean(thinkingConfig)
      })

      // Get the appropriate adapter
      const adapter = this.providerRegistry.getAdapter(provider)
      if (!adapter) {
        throw new Error(`Provider '${provider}' not found`)
      }

      // Get conversation history if session_id is provided
      let conversation_history = []
      if (session_id) {
        conversation_history = await this.chatMessages.getHistory(session_id)
      }

      // Create the response using the adapter
      const response = await adapter.createResponse({
        model,
        input,
        response_format,
        temperature,
        max_output_tokens,
        conversation_history,
        store,
        thinkingConfig
      })

      // Store the response in conversation history if session_id is provided
      if (session_id && store) {
        await this.chatMessages.addMessage(session_id, {
          role: 'user',
          content: typeof input === 'string' ? input : JSON.stringify(input)
        })
        await this.chatMessages.addMessage(session_id, {
          role: 'assistant',
          content: response.output_text || response.choices?.[0]?.message?.content || ''
        })
      }

      return response
    } catch (error) {
      console.error('[llm-service] createResponse error:', error)
      throw error
    }
  }

  /**
   * Stream a response using the specified provider and model
   * @param {Object} params - Request parameters
   * @param {string} params.provider - Provider name (openai, anthropic, gemini)
   * @param {string} params.model - Model name
   * @param {string|Array} params.input - Input text or messages
   * @param {Object} params.response_format - Response format configuration
   * @param {number} params.temperature - Temperature setting
   * @param {number} params.max_output_tokens - Maximum output tokens
   * @param {string} params.session_id - Session ID for conversation history
   * @returns {AsyncGenerator<Object>} Streaming response chunks
   */
  async* streamResponse({
    provider = 'openai',
    model,
    input,
    response_format,
    temperature = 0.2,
    max_output_tokens = 4096,
    session_id,
    thinkingConfig = null
  } = {}) {
    try {
      console.log('[llm-service] streamResponse', {
        provider,
        model,
        has_session_id: Boolean(session_id),
        has_thinkingConfig: Boolean(thinkingConfig)
      })

      // Get the appropriate adapter
      const adapter = this.providerRegistry.getAdapter(provider)
      if (!adapter) {
        throw new Error(`Provider '${provider}' not found`)
      }

      // Get conversation history if session_id is provided
      let conversation_history = []
      if (session_id) {
        conversation_history = await this.chatMessages.getHistory(session_id)
      }

      // Stream the response using the adapter
      for await (const chunk of adapter.streamResponse({
        model,
        input,
        response_format,
        temperature,
        max_output_tokens,
        conversation_history,
        thinkingConfig
      })) {
        yield chunk
      }
    } catch (error) {
      console.error('[llm-service] streamResponse error:', error)
      throw error
    }
  }

  /**
   * Get conversation history for a session
   * @param {string} session_id - Session ID
   * @returns {Array} Conversation history
   */
  getConversationHistory(session_id) {
    return this.chatMessages.getHistory(session_id)
  }

  /**
   * Clear conversation history for a session
   * @param {string} session_id - Session ID
   */
  async clearConversationHistory(session_id) {
    await this.chatMessages.clearHistory(session_id)
  }

  /**
   * Get available providers
   * @returns {Array<string>} List of available provider names
   */
  getAvailableProviders() {
    return this.providerRegistry.getAvailableProviders()
  }

  /**
   * Get available models for a provider
   * @param {string} provider - Provider name
   * @returns {Array<string>} List of available model names
   */
  getAvailableModels(provider) {
    return this.providerRegistry.getAvailableModels(provider)
  }
}

// Create and export a singleton instance
export const llmService = new LLMService()

export default llmService
