// Plan limits for token usage
export const PLAN_LIMITS = {
  free: { 
    monthly_tokens: 50000,
    max_projects: 10 
  },
  starter: { 
    monthly_tokens: 100000,
    max_projects: 25 
  },
  pro: { 
    monthly_tokens: 1000000,
    max_projects: 50 
  },
  enterprise: { 
    monthly_tokens: -1, // unlimited
    max_projects: -1 
  }
}

// Default plan for users without billing info
export const DEFAULT_PLAN = 'free'

// Model names used in the application
export const OPENAI_MODELS = {
  GPT4O: 'gpt-4o'
} 