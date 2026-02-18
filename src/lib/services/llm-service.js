// llm-service.js
// Unified LLM service that provides a consistent interface across different providers
import { ProviderRegistry } from './provider-registry.js'
import { ChatMessagesService } from './chat-messages-service.js'

export class LLMService {
  constructor() {
    this.providerRegistry = new ProviderRegistry()
    this.chatMessages = new ChatMessagesService()
    
    // Define fallback provider hierarchy
    this.fallbackHierarchy = {
      'gemini': ['fireworks', 'anthropic', 'openai'],
      'fireworks': ['anthropic', 'openai'],
      'anthropic': ['gemini', 'fireworks', 'openai'],
      'openai': ['gemini', 'fireworks', 'anthropic']
    }
    
    // Define default models for fallback providers
    this.defaultModels = {
      'gemini': 'gemini-2.5-flash',
      'fireworks': 'accounts/fireworks/models/kimi-k2p5',
      'anthropic': 'claude-haiku-4-5-20251001',
      'openai': 'gpt-4o-mini'
    }
  }
  
  /**
   * Check if an error is retryable with a fallback provider
   * @param {Error} error - Error object
   * @returns {boolean} Whether the error should trigger fallback
   */
  isRetryableError(error) {
    const errorString = JSON.stringify(error).toLowerCase()
    const message = (error?.message || '').toLowerCase()
    const status = error?.status || error?.code
    
    // Check for 503 (Service Unavailable) or 429 (Too Many Requests) status codes
    if (status === 503 || status === '503') return true
    if (status === 429 || status === '429') return true
    if (errorString.includes('503')) return true
    if (errorString.includes('429')) return true
    
    // Check for unavailability messages
    if (errorString.includes('unavailable')) return true
    if (message.includes('unavailable')) return true
    if (errorString.includes('resource_exhausted')) return true
    if (message.includes('resource_exhausted')) return true
    
    // Check for high demand / overload messages
    if (message.includes('high demand')) return true
    if (message.includes('overloaded')) return true
    if (message.includes('temporarily unavailable')) return true
    
    // Check for rate limit / quota messages
    if (message.includes('rate limit')) return true
    if (errorString.includes('rate limit')) return true
    if (message.includes('quota exceeded')) return true
    if (errorString.includes('quota exceeded')) return true
    if (message.includes('exceeded your current quota')) return true
    
    return false
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
    provider = 'gemini',
    model,
    input,
    response_format,
    temperature = 0.2,
    max_output_tokens = 40000,
    session_id,
    store = true,
    thinkingConfig = null
  } = {}) {
    const providers = [provider, ...(this.fallbackHierarchy[provider] || [])]
    let lastError = null
    
    for (const currentProvider of providers) {
      try {
        console.log('[llm-service] createResponse', {
          provider: currentProvider,
          model: currentProvider === provider ? model : this.defaultModels[currentProvider],
          has_session_id: Boolean(session_id),
          has_response_format: Boolean(response_format),
          has_thinkingConfig: Boolean(thinkingConfig),
          is_fallback: currentProvider !== provider
        })

        // Get the appropriate adapter
        const adapter = this.providerRegistry.getAdapter(currentProvider)
        if (!adapter) {
          console.warn(`[llm-service] Provider '${currentProvider}' not found, trying next fallback`)
          continue
        }

        // Get conversation history if session_id is provided
        let conversation_history = []
        if (session_id) {
          conversation_history = await this.chatMessages.getHistory(session_id)
        }

        // Use provided model for primary provider, default model for fallbacks
        const modelToUse = currentProvider === provider 
          ? model 
          : this.defaultModels[currentProvider]

        // Create the response using the adapter
        const response = await adapter.createResponse({
          model: modelToUse,
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

        // If we get here, the request succeeded
        if (currentProvider !== provider) {
          console.log(`[llm-service] Successfully fell back to ${currentProvider} after ${provider} failed`)
        }
        
        return response
      } catch (error) {
        lastError = error
        console.error(`[llm-service] ${currentProvider} error:`, error)
        
        // Always try the next provider if one is available
        if (providers.indexOf(currentProvider) < providers.length - 1) {
          console.log(`[llm-service] ${currentProvider} failed (status: ${error?.status ?? error?.code ?? 'unknown'}), falling back to next provider`)
          continue
        }
        
        // No more providers to try
        throw error
      }
    }
    
    // If we exhausted all providers, throw the last error
    throw lastError || new Error('All providers failed')
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
    provider = 'gemini',
    model,
    input,
    response_format,
    temperature = 0.2,
    max_output_tokens = 40000,
    session_id,
    thinkingConfig = null
  } = {}) {
    const providers = [provider, ...(this.fallbackHierarchy[provider] || [])]
    let lastError = null
    
    for (const currentProvider of providers) {
      try {
        console.log('[llm-service] streamResponse', {
          provider: currentProvider,
          model: currentProvider === provider ? model : this.defaultModels[currentProvider],
          has_session_id: Boolean(session_id),
          has_thinkingConfig: Boolean(thinkingConfig),
          is_fallback: currentProvider !== provider
        })

        // Get the appropriate adapter
        const adapter = this.providerRegistry.getAdapter(currentProvider)
        if (!adapter) {
          console.warn(`[llm-service] Provider '${currentProvider}' not found, trying next fallback`)
          continue
        }

        // Get conversation history if session_id is provided
        let conversation_history = []
        if (session_id) {
          conversation_history = await this.chatMessages.getHistory(session_id)
        }

        // Use provided model for primary provider, default model for fallbacks
        const modelToUse = currentProvider === provider 
          ? model 
          : this.defaultModels[currentProvider]

        // Stream the response using the adapter
        let streamStarted = false
        for await (const chunk of adapter.streamResponse({
          model: modelToUse,
          input,
          response_format,
          temperature,
          max_output_tokens,
          conversation_history,
          thinkingConfig
        })) {
          streamStarted = true
          yield chunk
        }
        
        // If we get here, the stream completed successfully
        if (currentProvider !== provider) {
          console.log(`[llm-service] Successfully fell back to ${currentProvider} after ${provider} failed`)
        }
        return
      } catch (error) {
        lastError = error
        console.error(`[llm-service] ${currentProvider} streamResponse error:`, error)
        
        // Always try the next provider if one is available
        if (providers.indexOf(currentProvider) < providers.length - 1) {
          console.log(`[llm-service] ${currentProvider} failed (status: ${error?.status ?? error?.code ?? 'unknown'}), falling back to next provider`)
          continue
        }
        
        // No more providers to try
        throw error
      }
    }
    
    // If we exhausted all providers, throw the last error
    throw lastError || new Error('All providers failed')
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
