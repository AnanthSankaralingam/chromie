// Plan limits for token usage
export const PLAN_LIMITS = {
  free: 50000,      // 50k tokens for free users
  starter: 100000,   // 100k tokens for starter plan
  pro: 1000000,      // 1M tokens for pro plan
  enterprise: -1     // -1 means unlimited
}

// Default plan for users without billing info
export const DEFAULT_PLAN = 'free'

// Model names used in the application
export const OPENAI_MODELS = {
  GPT4O: 'gpt-4o'
} 