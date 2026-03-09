// Plan limits for credit usage and browser testing
export const PLAN_LIMITS = {
  free: {
    monthly_credits: 10,
    max_projects: 1,
    monthly_browser_minutes: 15,
    max_privacy_policies: 0,
    max_demo_replays: 1,
    reset_type: 'monthly'
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

// Unified LLM Service defaults (ionrouter Kimi when IONROUTER_API_KEY set, else Gemini)
export const DEFAULT_MODEL = process.env.IONROUTER_API_KEY ? 'kimi-k2.5' : 'gemini-3-flash-preview'
export const FOLLOWUP_MODEL = 'gemini-3-flash-preview'
export const DEFAULT_PROVIDER = process.env.IONROUTER_API_KEY ? 'ionrouter' : 'gemini'
export const RESPONSE_STORE_DEFAULT = true
export const CONTEXT_WINDOW_MAX_TOKENS_DEFAULT = 1000000

// Kimi K2.5 (ionrouter): higher limits require streaming (non-streaming capped at 4096)
export const FIREWORKS_CODEGEN_MAX_TOKENS = 32768

// Supported providers
export const SUPPORTED_PROVIDERS = {
  GEMINI: 'gemini',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic'
}

// Default models for each provider
export const DEFAULT_MODELS = {
  gemini: 'gemini-3-flash-preview',
  ionrouter: 'kimi-k2.5',
  openai: 'o3',
  anthropic: 'claude-haiku-4-5-20251001'
}

// Frontend type selection confidence threshold
// When the LLM's confidence in its frontend type selection is below this threshold,
// the user will be prompted to confirm or override the selection
export const FRONTEND_CONFIDENCE_THRESHOLD = 0.8

// Follow-up difficulty threshold — at or above this score, the meta planner flow is used
export const FOLLOWUP_DIFFICULTY_THRESHOLD = 0.7

// Planning phase model configuration
export const PLANNING_MODELS = {
  DEFAULT: 'claude-haiku-4-5-20251001', // Used for use-case and frontend-selection prompts
  EXTERNAL_RESOURCES: 'claude-sonnet-4-5-20250929', // Used for external-resources prompt
  META_PLANNER: 'claude-sonnet-4-5-20250929' // Used for meta planner task graph generation
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