// Configurable limits
export const FILE_VALIDATION_LIMITS = {
  MAX_LINES_PER_FILE: 1500,
  MAX_TOTAL_CHARACTERS: 100000,
  MAX_EXTENSION_FILES: 20, // Maximum files allowed in extension upload
}

// Allowed file extensions for extension uploads
export const ALLOWED_EXTENSIONS = {
  code: new Set(['js', 'json', 'html', 'css']),
  images: new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'])
}

export function countLines(content) {
  if (!content) return 0
  return content.split('\n').length
}

export function validateFile(content) {
  const lineCount = countLines(content)
  const charCount = content?.length || 0

  return {
    lineCount,
    charCount,
    exceedsLineLimit: lineCount > FILE_VALIDATION_LIMITS.MAX_LINES_PER_FILE,
    isValid: lineCount <= FILE_VALIDATION_LIMITS.MAX_LINES_PER_FILE
  }
}

export function validateTaggedFiles(taggedFilesWithContent) {
  let totalChars = 0
  const results = []

  for (const file of taggedFilesWithContent) {
    const validation = validateFile(file.content)
    totalChars += validation.charCount
    results.push({
      ...file,
      ...validation
    })
  }

  return {
    files: results,
    totalChars,
    exceedsTotalLimit: totalChars > FILE_VALIDATION_LIMITS.MAX_TOTAL_CHARACTERS,
    hasInvalidFiles: results.some(f => !f.isValid)
  }
}

/**
 * Get file extension from a file path
 */
export function getFileExtension(filePath = '') {
  const parts = filePath.split('.')
  if (parts.length < 2) return ''
  return parts.pop().toLowerCase()
}

/**
 * Check if a file is an allowed code file
 */
export function isAllowedCodeFile(filePath) {
  const ext = getFileExtension(filePath)
  return ALLOWED_EXTENSIONS.code.has(ext)
}

/**
 * Check if a file is an allowed image file
 */
export function isAllowedImageFile(filePath) {
  const ext = getFileExtension(filePath)
  return ALLOWED_EXTENSIONS.images.has(ext)
}

/**
 * Check if a file is allowed (code or image)
 */
export function isAllowedFile(filePath) {
  return isAllowedCodeFile(filePath) || isAllowedImageFile(filePath)
}

/**
 * Validate a list of files for extension upload
 * Returns { valid: boolean, error?: string, invalidFiles?: string[] }
 */
export function validateExtensionFiles(files) {
  // Check file count
  if (files.length > FILE_VALIDATION_LIMITS.MAX_EXTENSION_FILES) {
    return {
      valid: false,
      error: `Too many files. Maximum ${FILE_VALIDATION_LIMITS.MAX_EXTENSION_FILES} files allowed, but ${files.length} files were provided.`
    }
  }

  // Check file types
  const invalidFiles = []
  for (const file of files) {
    const filePath = file.name || file.webkitRelativePath || ''
    if (filePath && !isAllowedFile(filePath)) {
      invalidFiles.push(filePath)
    }
  }

  if (invalidFiles.length > 0) {
    const allowedExtsList = [
      ...Array.from(ALLOWED_EXTENSIONS.code),
      ...Array.from(ALLOWED_EXTENSIONS.images)
    ].join(', ')

    return {
      valid: false,
      error: `Invalid file types detected. Only ${allowedExtsList} files are allowed.`,
      invalidFiles
    }
  }

  return { valid: true }
}
