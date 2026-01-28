/**
 * Classify errors by type for appropriate handling
 */
export function classifyError(error) {
  const errorMessage = typeof error === 'string' ? error : error?.message || String(error)

  // Extension patterns (icons, manifest, permissions, upload, structure)
  const extensionPatterns = {
    icons: /missing required icons|failed to fetch shared icons|failed to decode|icon.*not found/i,
    manifest: /invalid manifest|manifest\.json/i,
    permissions: /permission.*denied|chrome\..*not available/i,
    upload: /failed to upload extension|extension upload|failed to create extension/i,
    structure: /missing required files|file structure/i,
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

  return { type: 'general', category: 'unknown', originalError: errorMessage }
}
