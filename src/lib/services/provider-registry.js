// provider-registry.js
// Registry for managing different LLM providers and their adapters
import { OpenAIAdapter } from './adapters/openai-adapter.js'
import { AnthropicAdapter } from './adapters/anthropic-adapter.js'
import { GeminiAdapter } from './adapters/gemini-adapter.js'

export class ProviderRegistry {
  constructor() {
    this.adapters = new Map()
    this.modelConfigs = new Map()
    this.providerConfigs = new Map()
    
    this.initializeProviders()
  }

  /**
   * Initialize all available providers and their adapters
   */
  initializeProviders() {
    // Register OpenAI adapter
    this.registerProvider('openai', new OpenAIAdapter(), {
      name: 'OpenAI',
      baseURL: 'https://api.openai.com/v1',
      apiKeyEnv: 'OPENAI_API_KEY',
      supportsStreaming: true,
      supportsJsonSchema: true,
      maxContextWindow: 128000
    })

    // Register Anthropic adapter (via OpenAI SDK)
    this.registerProvider('anthropic', new AnthropicAdapter(), {
      name: 'Anthropic',
      baseURL: 'https://api.anthropic.com/v1',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      supportsStreaming: true,
      supportsJsonSchema: true,
      maxContextWindow: 200000
    })

    // Register Gemini adapter (via OpenAI SDK)
    this.registerProvider('gemini', new GeminiAdapter(), {
      name: 'Google Gemini',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKeyEnv: 'GOOGLE_AI_API_KEY',
      supportsStreaming: true,
      supportsJsonSchema: true,
      maxContextWindow: 1000000
    })
  }

  /**
   * Register a provider with its adapter and configuration
   * @param {string} name - Provider name
   * @param {Object} adapter - Adapter instance
   * @param {Object} config - Provider configuration
   */
  registerProvider(name, adapter, config) {
    this.adapters.set(name, adapter)
    this.providerConfigs.set(name, config)
    
    // Initialize model configurations for this provider
    this.initializeModelConfigs(name)
  }

  /**
   * Initialize model configurations for a provider
   * @param {string} providerName - Provider name
   */
  initializeModelConfigs(providerName) {
    const models = this.getProviderModels(providerName)
    models.forEach(modelName => {
      const modelConfig = this.createModelConfig(providerName, modelName)
      this.modelConfigs.set(`${providerName}:${modelName}`, modelConfig)
    })
  }

  /**
   * Get available models for a provider
   * @param {string} providerName - Provider name
   * @returns {Array<string>} List of model names
   */
  getProviderModels(providerName) {
    const modelMap = {
      openai: [
        'o3',
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo'
      ],
      anthropic: [
        'claude-3-5-sonnet-4.5',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ],
      gemini: [
        'gemini-2.5-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.0-pro'
      ]
    }
    
    return modelMap[providerName] || []
  }

  /**
   * Create model configuration for a specific model
   * @param {string} providerName - Provider name
   * @param {string} modelName - Model name
   * @returns {Object} Model configuration
   */
  createModelConfig(providerName, modelName) {
    const baseConfig = {
      provider: providerName,
      name: modelName,
      maxTokens: 4096,
      temperature: 0.2,
      supportsStreaming: true,
      supportsJsonSchema: true
    }

    // Provider-specific model configurations
    const modelConfigs = {
      openai: {
        'o3': { maxTokens: 200000, temperature: 0.2 },
        'gpt-4o': { maxTokens: 128000, temperature: 0.2 },
        'gpt-4o-mini': { maxTokens: 128000, temperature: 0.2 },
        'gpt-4-turbo': { maxTokens: 128000, temperature: 0.2 },
        'gpt-4': { maxTokens: 8192, temperature: 0.2 },
        'gpt-3.5-turbo': { maxTokens: 4096, temperature: 0.2 }
      },
      anthropic: {
        'claude-3-5-sonnet-4.5': { maxTokens: 8192, temperature: 0.2 },
        'claude-3-5-sonnet-20241022': { maxTokens: 8192, temperature: 0.2 },
        'claude-3-5-haiku-20241022': { maxTokens: 8192, temperature: 0.2 },
        'claude-3-opus-20240229': { maxTokens: 4096, temperature: 0.2 },
        'claude-3-sonnet-20240229': { maxTokens: 4096, temperature: 0.2 },
        'claude-3-haiku-20240307': { maxTokens: 4096, temperature: 0.2 }
      },
      gemini: {
        'gemini-2.5-flash': { maxTokens: 8192, temperature: 0.2 },
        'gemini-1.5-pro': { maxTokens: 8192, temperature: 0.2 },
        'gemini-1.5-flash': { maxTokens: 8192, temperature: 0.2 },
        'gemini-1.0-pro': { maxTokens: 4096, temperature: 0.2 }
      }
    }

    const providerConfigs = modelConfigs[providerName] || {}
    const modelSpecificConfig = providerConfigs[modelName] || {}

    return {
      ...baseConfig,
      ...modelSpecificConfig
    }
  }

  /**
   * Get adapter for a provider
   * @param {string} providerName - Provider name
   * @returns {Object|null} Adapter instance or null if not found
   */
  getAdapter(providerName) {
    return this.adapters.get(providerName) || null
  }

  /**
   * Get configuration for a provider
   * @param {string} providerName - Provider name
   * @returns {Object|null} Provider configuration or null if not found
   */
  getProviderConfig(providerName) {
    return this.providerConfigs.get(providerName) || null
  }

  /**
   * Get configuration for a specific model
   * @param {string} providerName - Provider name
   * @param {string} modelName - Model name
   * @returns {Object|null} Model configuration or null if not found
   */
  getModelConfig(providerName, modelName) {
    return this.modelConfigs.get(`${providerName}:${modelName}`) || null
  }

  /**
   * Get all available providers
   * @returns {Array<string>} List of provider names
   */
  getAvailableProviders() {
    return Array.from(this.adapters.keys())
  }

  /**
   * Get all available models for a provider
   * @param {string} providerName - Provider name
   * @returns {Array<string>} List of model names
   */
  getAvailableModels(providerName) {
    return this.getProviderModels(providerName)
  }

  /**
   * Check if a provider supports a specific feature
   * @param {string} providerName - Provider name
   * @param {string} feature - Feature name (e.g., 'streaming', 'jsonSchema')
   * @returns {boolean} Whether the provider supports the feature
   */
  supportsFeature(providerName, feature) {
    const config = this.getProviderConfig(providerName)
    if (!config) return false

    const featureMap = {
      streaming: 'supportsStreaming',
      jsonSchema: 'supportsJsonSchema'
    }

    const configKey = featureMap[feature]
    return configKey ? config[configKey] : false
  }

  /**
   * Get the maximum context window for a provider
   * @param {string} providerName - Provider name
   * @returns {number} Maximum context window size
   */
  getMaxContextWindow(providerName) {
    const config = this.getProviderConfig(providerName)
    return config?.maxContextWindow || 4096
  }
}

export default ProviderRegistry
