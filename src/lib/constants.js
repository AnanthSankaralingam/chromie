// Plan limits for credit usage and browser testing
export const PLAN_LIMITS = {
  free: {
    monthly_credits: 10,
    max_projects: 1,
    monthly_browser_minutes: 15,
    max_privacy_policies: 0,
    max_demo_replays: 1,
    reset_type: 'daily'
  },
  starter: {
    monthly_credits: 100,
    max_projects: Infinity,
    monthly_browser_minutes: Infinity,
    max_privacy_policies: 0,
    max_demo_replays: Infinity,
    reset_type: 'never'
  },
  pro: {
    monthly_credits: 500,
    max_projects: 300,
    monthly_browser_minutes: 240,
    max_privacy_policies: Infinity,
    max_demo_replays: Infinity,
    reset_type: 'monthly'
  }
}

// Credit costs for different request types
export const CREDIT_COSTS = {
  INITIAL_GENERATION: 3,  // Initial code generation project requests
  FOLLOW_UP_GENERATION: 1,  // Follow-up code generation requests
  BROWSER_TESTING: 1,  // Browser testing session (per use)
  IMAGE_GENERATION: 3  // AI image generation (per use)
}

// Default plan for users without billing info
export const DEFAULT_PLAN = 'free'

// Supported providers
export const SUPPORTED_PROVIDERS = {
  GEMINI: 'gemini',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  IONROUTER: 'ionrouter'
}

// Centralized model selection for codegen/planning flows.
// Update values here to switch models globally by use case.
export const MODEL_SELECTION = {
  CODEGEN_DEFAULT: process.env.IONROUTER_API_KEY ? 'kimi-k2.5' : 'gemini-3-flash-preview',
  CODEGEN_FOLLOWUP: 'gemini-3-flash-preview',
  CODE_PATCH_DEFAULT: 'gemini-3-flash-preview',
  CODE_PATCH_FALLBACK: 'gemini-3-flash-preview',
  TASK_EXECUTOR_HTML: 'gemini-3.1-flash-lite-preview',
  TASK_EXECUTOR_CSS: 'gemini-3-flash-preview',
  FOLLOWUP_PATCH_CSS_FAST: 'gemini-3.1-flash-preview',
  FOLLOWUP_PATCH_CSS_COMPLEX: 'gemini-3-flash-preview',
  TASK_EXECUTOR_JSON: 'gemini-3-flash-preview',
  HYPERAGENT_SCRIPT: 'claude-haiku-4-5-20251001',
  LLM_SERVICE_FALLBACK_GEMINI: 'gemini-3-flash-preview',
  LLM_SERVICE_FALLBACK_IONROUTER: 'kimi-k2.5',
  LLM_SERVICE_FALLBACK_ANTHROPIC: 'claude-haiku-4-5-20251001',
  LLM_SERVICE_OPENAI_FALLBACK: 'gpt-5.4-mini',
}

// Legacy exports kept for compatibility with existing imports.
export const DEFAULT_MODEL = MODEL_SELECTION.CODEGEN_DEFAULT
export const FOLLOWUP_MODEL = MODEL_SELECTION.CODEGEN_FOLLOWUP
export const CODE_PATCH_MODEL = MODEL_SELECTION.CODE_PATCH_DEFAULT
export const DEFAULT_PROVIDER = SUPPORTED_PROVIDERS.IONROUTER
export const HTML_CODEGEN_MODEL = MODEL_SELECTION.TASK_EXECUTOR_HTML
export const RESPONSE_STORE_DEFAULT = true
export const CONTEXT_WINDOW_MAX_TOKENS_DEFAULT = 1000000

// Kimi K2.5 (ionrouter): higher limits require streaming (non-streaming capped at 4096)
export const FIREWORKS_CODEGEN_MAX_TOKENS = 32768

export const FRONTEND_CONFIDENCE_THRESHOLD = 0.8

// Follow-up difficulty threshold — at or above this score, the meta planner flow is used
export const FOLLOWUP_DIFFICULTY_THRESHOLD = 0.6

// Planning phase model configuration
export const PLANNING_MODELS = {
  DEFAULT: 'claude-haiku-4-5-20251001', // Used for use-case and frontend-selection prompts
  EXTERNAL_RESOURCES: 'claude-sonnet-4-5-20250929', 
  META_PLANNER: 'claude-sonnet-4-6'  
}

// Browser session configuration
export const BROWSER_SESSION_CONFIG = {
  SESSION_DURATION_MINUTES: 3.25, // Maximum session duration
  WARNING_TIME_MINUTES: 2.5, // Warning before session expires
  CLEANUP_INTERVAL_MINUTES: 1.5 // How often to clean up expired sessions
}

// Share link rate limiting
export const SHARE_RATE_LIMITS = {
  // Per user limits
  MAX_SHARES_PER_USER: 15, // Maximum active shares per user
  MAX_DOWNLOADS_PER_SHARE_PER_HOUR: 50, // Max downloads per share per hour
  MAX_DOWNLOADS_PER_USER_PER_HOUR: 100, // Max downloads per user per hour
  
  // Share expiration (in days)
  DEFAULT_SHARE_EXPIRY_DAYS: 30,
  MAX_SHARE_EXPIRY_DAYS: 365
}

/** ISO time used for admin-owned share links (profiles.is_admin); treated as non-expiring in UI. */
export const ADMIN_SHARE_EXPIRES_AT = '2099-12-31T23:59:59.999Z'

// Subscription plans
export const SUBSCRIPTION_PLANS = ['free', 'pro']

// Plan reset types
export const PLAN_RESET_TYPES = {
  MONTHLY: 'monthly',
  ONE_TIME: 'one_time'
}

// Input limits for security and abuse prevention (characters)
export const INPUT_LIMITS = {
  PROMPT: 5000,           // Main prompt, follow-up, chat messages
  API_DESCRIPTION: 1000,  // API descriptions, feedback textarea
  URL: 2000,              // URLs (API endpoints, website URLs)
  FILE_PATH: 500,         // File paths (e.g. asset upload path)
  API_NAME: 100,          // Max length for user-entered API names
  MAX_TOTAL_APIS: 5,      // Cap on total APIs (suggested + user-added)
}

// App logo path (bump ?v=N when you replace the file so Vercel CDN/browsers fetch the new image)
export const CHROMIE_LOGO_URL = '/chromie-logo-1.png?v=2'

// API Key configuration
export const API_KEY_CONFIG = {
  // Maximum API keys per user (across all projects)
  MAX_KEYS_PER_USER: 1,
  // Maximum API keys per project
  MAX_KEYS_PER_PROJECT: 1,
  // API key prefix format
  KEY_PREFIX: 'chromie_live_',
  // API key length (excluding prefix)
  KEY_LENGTH: 32
} 