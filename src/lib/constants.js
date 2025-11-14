// Plan limits for token usage and browser testing
export const PLAN_LIMITS = {
  free: { 
    monthly_tokens: 40000,
    max_projects: 1,
    monthly_browser_minutes: 15,
    reset_type: 'monthly'
  },
  starter: { 
    monthly_tokens: 150000,
    max_projects: 2,
    monthly_browser_minutes: 30,
    reset_type: 'one_time'
  },
  pro: { 
    monthly_tokens: 1000000,
    max_projects: 10,
    monthly_browser_minutes: 120,
    reset_type: 'one_time'
  },
  legend: { 
    monthly_tokens: 5000000,
    max_projects: 300,
    monthly_browser_minutes: 240,
    reset_type: 'monthly'
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
  anthropic: 'claude-haiku-4-5-20251001'
}

// Browser session configuration
export const BROWSER_SESSION_CONFIG = {
  SESSION_DURATION_MINUTES: 3, // Maximum session duration
  WARNING_TIME_MINUTES: 2.5, // Warning before session expires
  CLEANUP_INTERVAL_MINUTES: 1.5 // How often to clean up expired sessions
}

// Share link rate limiting
export const SHARE_RATE_LIMITS = {
  // Per user limits
  MAX_SHARES_PER_USER: 10, // Maximum active shares per user
  MAX_DOWNLOADS_PER_SHARE_PER_HOUR: 50, // Max downloads per share per hour
  MAX_DOWNLOADS_PER_USER_PER_HOUR: 100, // Max downloads per user per hour
  
  // Share expiration (in days)
  DEFAULT_SHARE_EXPIRY_DAYS: 30,
  MAX_SHARE_EXPIRY_DAYS: 365
}

// One-time purchase configuration
export const ONE_TIME_PURCHASE_PLANS = ['starter', 'pro']
export const SUBSCRIPTION_PLANS = ['free', 'legend']

// Plan reset types
export const PLAN_RESET_TYPES = {
  MONTHLY: 'monthly',
  ONE_TIME: 'one_time'
} 