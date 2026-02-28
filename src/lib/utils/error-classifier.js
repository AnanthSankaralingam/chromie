/**
 * Classify errors by type for appropriate handling
 */
export function classifyError(error) {
  const errorMessage = typeof error === 'string' ? error : error?.message || String(error)

  // Extension patterns (icons, manifest, permissions, upload, structure, build)
  const extensionPatterns = {
    icons: /missing required icons|failed to fetch shared icons|failed to decode|icon.*not found/i,
    manifest: /invalid manifest|manifest\.json/i,
    permissions: /permission.*denied|chrome\..*not available/i,
    upload: /failed to upload extension|extension upload|failed to create extension/i,
    structure: /missing required files|file structure/i,
    build: /no matching export|extension build failed|vendor-pkg/i,
  }

  for (const [category, pattern] of Object.entries(extensionPatterns)) {
    if (pattern.test(errorMessage)) {
      return { type: 'extension', category, originalError: errorMessage }
    }
  }

  // Auth, credits, session, or general
  if (/unauthorized|authentication|missing.*api.*key/i.test(errorMessage)) {
    return { type: 'auth', category: 'authentication', originalError: errorMessage }
  }
  if (/credit.*limit|limit.*reached/i.test(errorMessage)) {
    return { type: 'credits', category: 'limits', originalError: errorMessage }
  }
  if (/session.*not.*active|session.*expired|session.*closed/i.test(errorMessage)) {
    return { type: 'session', category: 'inactive', originalError: errorMessage }
  }

  // High traffic / rate limits - not fixable by extension code changes
  if (
    /429|503|rate limit|too many requests|high traffic|service unavailable|try again later/i.test(errorMessage)
  ) {
    return { type: 'infrastructure', category: 'high_traffic', originalError: errorMessage }
  }

  return { type: 'general', category: 'unknown', originalError: errorMessage }
}
