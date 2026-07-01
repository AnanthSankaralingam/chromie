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

export const CHROMIE_LOGO_URL = "/chromie-logo-1.png?v=2"
