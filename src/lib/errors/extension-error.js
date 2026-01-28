export class ExtensionError extends Error {
  constructor(message, code, details = {}) {
    super(message)
    this.name = 'ExtensionError'
    this.code = code
    this.details = details
  }
}

export const ERROR_CODES = {
  MISSING_API_KEY: 'EXT_001',
  UPLOAD_FAILED: 'EXT_002',
  MISSING_ICONS: 'EXT_003',
  INVALID_MANIFEST: 'EXT_004',
  SESSION_CREATION_FAILED: 'EXT_005',
}
