// Plan limits for token usage and browser testing
export const PLAN_LIMITS = {
  free: { 
    monthly_tokens: 12000,
    max_projects: 3,
    monthly_browser_minutes: 5
  },
  starter: { 
    monthly_tokens: 100000,
    max_projects: 25,
    monthly_browser_minutes: 100
  },
  pro: { 
    monthly_tokens: 1000000,
    max_projects: 50,
    monthly_browser_minutes: 250
  },
  enterprise: { 
    monthly_tokens: -1, // unlimited
    max_projects: -1,
    monthly_browser_minutes: -1 // unlimited
  }
}

// Default plan for users without billing info
export const DEFAULT_PLAN = 'free'

// Unified LLM Service defaults
export const DEFAULT_MODEL = 'gemini-2.5-flash'
export const DEFAULT_PROVIDER = 'gemini'
export const RESPONSE_STORE_DEFAULT = true
export const CONTEXT_WINDOW_MAX_TOKENS_DEFAULT = 1000000

// Supported providers
export const SUPPORTED_PROVIDERS = {
  GEMINI: 'gemini',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic'
}

// Default models for each provider
export const DEFAULT_MODELS = {
  gemini: 'gemini-2.5-flash',
  openai: 'o3',
  anthropic: 'claude-3-5-sonnet-20241022'
}

// Browser session configuration
export const BROWSER_SESSION_CONFIG = {
  SESSION_DURATION_MINUTES: 1, // Maximum session duration
  WARNING_TIME_MINUTES: 0.5, // Warning before session expires
  CLEANUP_INTERVAL_MINUTES: 2 // How often to clean up expired sessions
} 