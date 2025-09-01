export const REQUEST_TYPES = {
  NEW_EXTENSION: "new_extension",
  ADD_TO_EXISTING: "add_to_existing"
}

export const PLAN_LIMITS = {
  free: 10000,        // 10,000 tokens
  starter: 100000,    // 100,000 tokens
  pro: 1000000,       // 1,000,000 tokens
  enterprise: -1      // unlimited
}

export const DEFAULT_PLAN = 'free'