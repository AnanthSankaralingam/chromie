// model-configs.js
// Model-specific configurations for different LLM providers

export const MODEL_CONFIGS = {
  // OpenAI Models
  'o3': {
    provider: 'openai',
    name: 'o3',
    displayName: 'OpenAI O3',
    maxTokens: 200000,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 200000,
    costPer1kTokens: {
      input: 0.015,
      output: 0.06
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'Most advanced OpenAI model with enhanced reasoning capabilities'
  },
  'gpt-4o': {
    provider: 'openai',
    name: 'gpt-4o',
    displayName: 'GPT-4o',
    maxTokens: 128000,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 128000,
    costPer1kTokens: {
      input: 0.005,
      output: 0.015
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'Advanced GPT-4 model with vision capabilities'
  },
  'gpt-4o-mini': {
    provider: 'openai',
    name: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    maxTokens: 128000,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 128000,
    costPer1kTokens: {
      input: 0.00015,
      output: 0.0006
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'Faster and cheaper GPT-4o model'
  },
  'gpt-4-turbo': {
    provider: 'openai',
    name: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    maxTokens: 128000,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 128000,
    costPer1kTokens: {
      input: 0.01,
      output: 0.03
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'High-performance GPT-4 model with large context window'
  },
  'gpt-4': {
    provider: 'openai',
    name: 'gpt-4',
    displayName: 'GPT-4',
    maxTokens: 8192,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 8192,
    costPer1kTokens: {
      input: 0.03,
      output: 0.06
    },
    capabilities: ['text', 'json', 'function_calling'],
    description: 'Original GPT-4 model'
  },
  'gpt-3.5-turbo': {
    provider: 'openai',
    name: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    maxTokens: 4096,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 4096,
    costPer1kTokens: {
      input: 0.0015,
      output: 0.002
    },
    capabilities: ['text', 'json', 'function_calling'],
    description: 'Fast and efficient GPT-3.5 model'
  },

  // Anthropic Models
  'claude-3-5-sonnet-20241022': {
    provider: 'anthropic',
    name: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet',
    maxTokens: 8192,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 200000,
    costPer1kTokens: {
      input: 0.003,
      output: 0.015
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'Most capable Claude model with excellent reasoning'
  },
  'claude-3-5-sonnet-4.5': {
    provider: 'anthropic',
    name: 'claude-3-5-sonnet-4.5',
    displayName: 'Claude Sonnet 4.5',
    maxTokens: 8192,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 200000,
    costPer1kTokens: {
      input: 0.003,
      output: 0.015
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'Latest Claude Sonnet model with enhanced capabilities'
  },
  'claude-3-5-haiku-20241022': {
    provider: 'anthropic',
    name: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku',
    maxTokens: 8192,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 200000,
    costPer1kTokens: {
      input: 0.0008,
      output: 0.004
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'Fast and efficient Claude model'
  },
  'claude-3-opus-20240229': {
    provider: 'anthropic',
    name: 'claude-3-opus-20240229',
    displayName: 'Claude 3 Opus',
    maxTokens: 4096,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 200000,
    costPer1kTokens: {
      input: 0.015,
      output: 0.075
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'Most powerful Claude 3 model'
  },
  'claude-3-sonnet-20240229': {
    provider: 'anthropic',
    name: 'claude-3-sonnet-20240229',
    displayName: 'Claude 3 Sonnet',
    maxTokens: 4096,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 200000,
    costPer1kTokens: {
      input: 0.003,
      output: 0.015
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'Balanced Claude 3 model'
  },
  'claude-3-haiku-20240307': {
    provider: 'anthropic',
    name: 'claude-3-haiku-20240307',
    displayName: 'Claude 3 Haiku',
    maxTokens: 4096,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 200000,
    costPer1kTokens: {
      input: 0.0008,
      output: 0.004
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'Fast Claude 3 model'
  },

  // Gemini Models
  'gemini-2.5-flash': {
    provider: 'gemini',
    name: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    maxTokens: 8192,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 1000000,
    costPer1kTokens: {
      input: 0.000075,
      output: 0.0003
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'Latest fast and efficient Gemini model'
  },
  'gemini-1.5-pro': {
    provider: 'gemini',
    name: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    maxTokens: 8192,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 1000000,
    costPer1kTokens: {
      input: 0.00125,
      output: 0.005
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'Most capable Gemini model with massive context window'
  },
  'gemini-1.5-flash': {
    provider: 'gemini',
    name: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    maxTokens: 8192,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 1000000,
    costPer1kTokens: {
      input: 0.000075,
      output: 0.0003
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'Fast and efficient Gemini model'
  },
  'gemini-1.0-pro': {
    provider: 'gemini',
    name: 'gemini-1.0-pro',
    displayName: 'Gemini 1.0 Pro',
    maxTokens: 4096,
    defaultTemperature: 0.2,
    supportsStreaming: true,
    supportsJsonSchema: true,
    contextWindow: 30720,
    costPer1kTokens: {
      input: 0.0005,
      output: 0.0015
    },
    capabilities: ['text', 'json', 'function_calling', 'vision'],
    description: 'Original Gemini Pro model'
  }
}

/**
 * Get configuration for a specific model
 * @param {string} modelName - Model name
 * @returns {Object|null} Model configuration or null if not found
 */
export function getModelConfig(modelName) {
  return MODEL_CONFIGS[modelName] || null
}

/**
 * Get all models for a specific provider
 * @param {string} provider - Provider name
 * @returns {Array<Object>} List of model configurations
 */
export function getModelsByProvider(provider) {
  return Object.values(MODEL_CONFIGS).filter(config => config.provider === provider)
}

/**
 * Get all available models
 * @returns {Array<Object>} List of all model configurations
 */
export function getAllModels() {
  return Object.values(MODEL_CONFIGS)
}

/**
 * Get models that support a specific capability
 * @param {string} capability - Capability name
 * @returns {Array<Object>} List of models that support the capability
 */
export function getModelsByCapability(capability) {
  return Object.values(MODEL_CONFIGS).filter(config => 
    config.capabilities && config.capabilities.includes(capability)
  )
}

/**
 * Get the default model for a provider
 * @param {string} provider - Provider name
 * @returns {string|null} Default model name or null if not found
 */
export function getDefaultModel(provider) {
  const defaultModels = {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20241022',
    gemini: 'gemini-1.5-pro'
  }
  return defaultModels[provider] || null
}

/**
 * Check if a model supports a specific feature
 * @param {string} modelName - Model name
 * @param {string} feature - Feature name
 * @returns {boolean} Whether the model supports the feature
 */
export function modelSupportsFeature(modelName, feature) {
  const config = getModelConfig(modelName)
  if (!config) return false

  const featureMap = {
    streaming: 'supportsStreaming',
    jsonSchema: 'supportsJsonSchema',
    vision: 'vision',
    functionCalling: 'function_calling'
  }

  const configKey = featureMap[feature]
  if (configKey === 'vision' || configKey === 'function_calling') {
    return config.capabilities && config.capabilities.includes(configKey)
  }

  return configKey ? config[configKey] : false
}

export default MODEL_CONFIGS
