// provider-configs.js
// Provider-specific settings and configurations

export const PROVIDER_CONFIGS = {
  openai: {
    name: 'OpenAI',
    displayName: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    supportsStreaming: true,
    supportsJsonSchema: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    maxContextWindow: 128000,
    defaultModel: 'gpt-4o',
    rateLimits: {
      requestsPerMinute: 500,
      tokensPerMinute: 150000
    },
    features: {
      chatCompletions: true,
      completions: true,
      embeddings: true,
      fineTuning: true,
      moderations: true
    },
    pricing: {
      currency: 'USD',
      billing: 'per_token'
    },
    documentation: 'https://platform.openai.com/docs',
    statusPage: 'https://status.openai.com'
  },

  anthropic: {
    name: 'Anthropic',
    displayName: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    supportsStreaming: true,
    supportsJsonSchema: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    maxContextWindow: 200000,
    defaultModel: 'claude-3-5-sonnet-20241022',
    rateLimits: {
      requestsPerMinute: 50,
      tokensPerMinute: 40000
    },
    features: {
      chatCompletions: true,
      completions: false,
      embeddings: false,
      fineTuning: false,
      moderations: false
    },
    pricing: {
      currency: 'USD',
      billing: 'per_token'
    },
    documentation: 'https://docs.anthropic.com',
    statusPage: 'https://status.anthropic.com'
  },

  gemini: {
    name: 'Google Gemini',
    displayName: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKeyEnv: 'GOOGLE_AI_API_KEY',
    supportsStreaming: true,
    supportsJsonSchema: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    maxContextWindow: 1000000,
    defaultModel: 'gemini-1.5-pro',
    rateLimits: {
      requestsPerMinute: 60,
      tokensPerMinute: 32000
    },
    features: {
      chatCompletions: true,
      completions: true,
      embeddings: true,
      fineTuning: false,
      moderations: false
    },
    pricing: {
      currency: 'USD',
      billing: 'per_token'
    },
    documentation: 'https://ai.google.dev/docs',
    statusPage: 'https://status.cloud.google.com'
  }
}

/**
 * Get configuration for a specific provider
 * @param {string} providerName - Provider name
 * @returns {Object|null} Provider configuration or null if not found
 */
export function getProviderConfig(providerName) {
  return PROVIDER_CONFIGS[providerName] || null
}

/**
 * Get all available providers
 * @returns {Array<Object>} List of all provider configurations
 */
export function getAllProviders() {
  return Object.values(PROVIDER_CONFIGS)
}

/**
 * Get providers that support a specific feature
 * @param {string} feature - Feature name
 * @returns {Array<Object>} List of providers that support the feature
 */
export function getProvidersByFeature(feature) {
  return Object.values(PROVIDER_CONFIGS).filter(config => 
    config[feature] === true
  )
}

/**
 * Check if a provider supports a specific feature
 * @param {string} providerName - Provider name
 * @param {string} feature - Feature name
 * @returns {boolean} Whether the provider supports the feature
 */
export function providerSupportsFeature(providerName, feature) {
  const config = getProviderConfig(providerName)
  if (!config) return false

  const featureMap = {
    streaming: 'supportsStreaming',
    jsonSchema: 'supportsJsonSchema',
    functionCalling: 'supportsFunctionCalling',
    vision: 'supportsVision',
    chatCompletions: 'features.chatCompletions',
    completions: 'features.completions',
    embeddings: 'features.embeddings',
    fineTuning: 'features.fineTuning',
    moderations: 'features.moderations'
  }

  const configKey = featureMap[feature]
  if (!configKey) return false

  // Handle nested feature checks
  if (configKey.includes('.')) {
    const [parent, child] = configKey.split('.')
    return config[parent] && config[parent][child] === true
  }

  return config[configKey] === true
}

/**
 * Get the maximum context window for a provider
 * @param {string} providerName - Provider name
 * @returns {number} Maximum context window size
 */
export function getMaxContextWindow(providerName) {
  const config = getProviderConfig(providerName)
  return config?.maxContextWindow || 4096
}

/**
 * Get the default model for a provider
 * @param {string} providerName - Provider name
 * @returns {string|null} Default model name or null if not found
 */
export function getDefaultModel(providerName) {
  const config = getProviderConfig(providerName)
  return config?.defaultModel || null
}

/**
 * Get rate limits for a provider
 * @param {string} providerName - Provider name
 * @returns {Object|null} Rate limits or null if not found
 */
export function getRateLimits(providerName) {
  const config = getProviderConfig(providerName)
  return config?.rateLimits || null
}

/**
 * Get API key environment variable name for a provider
 * @param {string} providerName - Provider name
 * @returns {string|null} Environment variable name or null if not found
 */
export function getApiKeyEnv(providerName) {
  const config = getProviderConfig(providerName)
  return config?.apiKeyEnv || null
}

/**
 * Get base URL for a provider
 * @param {string} providerName - Provider name
 * @returns {string|null} Base URL or null if not found
 */
export function getBaseURL(providerName) {
  const config = getProviderConfig(providerName)
  return config?.baseURL || null
}

/**
 * Check if a provider is available (has API key)
 * @param {string} providerName - Provider name
 * @returns {boolean} Whether the provider is available
 */
export function isProviderAvailable(providerName) {
  const config = getProviderConfig(providerName)
  if (!config) return false

  const apiKeyEnv = config.apiKeyEnv
  return Boolean(process.env[apiKeyEnv])
}

/**
 * Get all available providers (those with API keys)
 * @returns {Array<string>} List of available provider names
 */
export function getAvailableProviders() {
  return Object.keys(PROVIDER_CONFIGS).filter(providerName => 
    isProviderAvailable(providerName)
  )
}

/**
 * Get provider display information
 * @param {string} providerName - Provider name
 * @returns {Object|null} Display information or null if not found
 */
export function getProviderDisplayInfo(providerName) {
  const config = getProviderConfig(providerName)
  if (!config) return null

  return {
    name: config.name,
    displayName: config.displayName,
    documentation: config.documentation,
    statusPage: config.statusPage,
    available: isProviderAvailable(providerName)
  }
}

export default PROVIDER_CONFIGS
