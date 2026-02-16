/**
 * File Protection Rules for Agent File Operations
 * Defines what files can be safely deleted by AI agents
 */

const PROTECTION_RULES = {
  // Files that can NEVER be deleted by agents
  CRITICAL_FILES: ['manifest.json'],
  
  // Files that require user confirmation before deletion
  SENSITIVE_FILES: [
    'background.js',
    'content.js',
    'popup.html',
    'popup.js',
    'options.html',
    'options.js',
    'service-worker.js'
  ],
  
  // File extensions that are safe to delete
  SAFE_EXTENSIONS: ['.js', '.css', '.html', '.json', '.md', '.txt'],
  
  // Directories that require extra caution (files in these need confirmation)
  PROTECTED_DIRECTORIES: ['icons/', 'assets/', 'images/'],
  
  // Minimum file count - don't let agent delete if it would leave fewer than this
  MIN_PROJECT_FILES: 2
}

/**
 * Check if an agent can delete a file
 * @param {string} filePath - Path of file to delete
 * @param {number} totalProjectFiles - Total number of files in project
 * @returns {Object} { allowed: boolean, requiresConfirmation: boolean, reason: string }
 */
export function canAgentDelete(filePath, totalProjectFiles = 10) {
  const fileName = filePath.split('/').pop().toLowerCase()
  const directory = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/') + 1) : ''
  
  // Never delete critical files
  if (PROTECTION_RULES.CRITICAL_FILES.includes(fileName)) {
    return { 
      allowed: false, 
      requiresConfirmation: false,
      reason: 'Critical system file - cannot be deleted' 
    }
  }
  
  // Prevent deletion if it would leave too few files
  if (totalProjectFiles <= PROTECTION_RULES.MIN_PROJECT_FILES) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: `Project must have at least ${PROTECTION_RULES.MIN_PROJECT_FILES} files`
    }
  }
  
  // Check file extension
  const ext = '.' + filePath.split('.').pop().toLowerCase()
  if (!PROTECTION_RULES.SAFE_EXTENSIONS.includes(ext)) {
    return { 
      allowed: false, 
      requiresConfirmation: false,
      reason: `File type ${ext} cannot be deleted by agents` 
    }
  }
  
  // Check if it's in a protected directory
  if (PROTECTION_RULES.PROTECTED_DIRECTORIES.some(dir => directory.includes(dir))) {
    return { 
      allowed: true, 
      requiresConfirmation: true, 
      reason: 'File is in a protected directory (assets/icons)' 
    }
  }
  
  // Check if it's a sensitive file
  if (PROTECTION_RULES.SENSITIVE_FILES.includes(fileName)) {
    return { 
      allowed: true, 
      requiresConfirmation: true, 
      reason: 'Core extension file - requires confirmation' 
    }
  }
  
  // Safe to delete without confirmation
  return { 
    allowed: true, 
    requiresConfirmation: false,
    reason: 'Safe to delete'
  }
}

/**
 * Get list of protected file patterns
 * @returns {Array<string>} List of protected patterns
 */
export function getProtectedPatterns() {
  return [
    ...PROTECTION_RULES.CRITICAL_FILES,
    ...PROTECTION_RULES.SENSITIVE_FILES,
  ]
}

export { PROTECTION_RULES }
