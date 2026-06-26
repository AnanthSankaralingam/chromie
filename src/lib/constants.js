// Plan limits for account billing. Automation usage is tracked separately in workflow_runs.
export const PLAN_LIMITS = {
  free: {
    monthly_credits: 0,
    monthly_browser_minutes: 0,
    reset_type: "monthly",
  },
  pro: {
    monthly_credits: 250,
    monthly_browser_minutes: Infinity,
    reset_type: "monthly",
  },
}

export const DEFAULT_PLAN = "free"

export const SUPPORTED_PROVIDERS = {
  GEMINI: "gemini",
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  IONROUTER: "ionrouter",
}

export const MODEL_SELECTION = {
  LLM_SERVICE_FALLBACK_GEMINI: "gemini-3-flash-preview",
  LLM_SERVICE_FALLBACK_IONROUTER: "kimi-k2.5",
  LLM_SERVICE_FALLBACK_ANTHROPIC: "claude-haiku-4-5-20251001",
  LLM_SERVICE_OPENAI_FALLBACK: "gpt-5.4-mini",
}

export const DEFAULT_PROVIDER = SUPPORTED_PROVIDERS.IONROUTER

export const BILLING_SUBSCRIBE = {
  pro: "https://buy.stripe.com/6oU3cu4ch6FW5BJby67kc07",
}

export const PLAN_RESET_TYPES = {
  MONTHLY: "monthly",
}

export const CHROMIE_LOGO_URL = "/chromie-logo-1.png?v=2"
