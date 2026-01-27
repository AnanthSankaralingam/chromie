/**
 * Transform errors to user-friendly messages
 * Sanitizes "Hyperbrowser" references and internal details
 */
export function getUserFriendlyError(error, classification) {
  const { type, category, originalError } = classification

  // Sanitize internal names
  let sanitized = originalError
    .replace(/Hyperbrowser/gi, 'Testing Browser')
    .replace(/BrowserBase/gi, 'Testing Browser')
    .split('\n')[0] // Remove stack traces

  const messages = {
    extension: {
      icons: {
        title: 'Extension Icons Missing',
        message: 'Your extension is missing required icon files. Please upload icon images (16x16, 48x48, 128x128 pixels) in PNG format.',
        action: 'Upload icons or use the icon generator',
      },
      manifest: {
        title: 'Invalid Extension Configuration',
        message: 'The manifest.json file has configuration errors. The Testing Browser requires a valid manifest.',
        action: 'Review your manifest.json file',
      },
      permissions: {
        title: 'Permission Error',
        message: 'Your extension requested permissions that couldn\'t be granted in the Testing Browser.',
        action: 'Check your manifest permissions',
      },
      upload: {
        title: 'Extension Upload Failed',
        message: 'Failed to prepare your extension for the Testing Browser. This may be due to file size or structure issues.',
        action: 'Check extension files',
      },
      structure: {
        title: 'Invalid Extension Structure',
        message: 'Your extension is missing required files or has an invalid structure.',
        action: 'Ensure manifest.json exists',
      },
    },
    auth: {
      authentication: {
        title: 'Authentication Required',
        message: 'You need to be signed in to use the Testing Browser.',
        action: 'Please sign in to continue',
      },
    },
    credits: {
      limits: {
        title: 'Credit Limit Reached',
        message: 'You\'ve reached your monthly credit limit for browser testing.',
        action: 'Upgrade your plan to continue',
      },
    },
    session: {
      inactive: {
        title: 'Session Unavailable',
        message: 'The Testing Browser session is no longer active. It may have expired or been closed.',
        action: 'Start a new testing session',
      },
    },
    general: {
      unknown: {
        title: 'Testing Browser Error',
        message: 'We\'re experiencing high traffic right now. Please try again in a moment.',
        action: 'Try again or contact support',
      },
    },
  }

  const errorDef = messages[type]?.[category] || messages.general.unknown

  return {
    title: errorDef.title,
    message: errorDef.message,
    action: errorDef.action,
    sanitized,
    category: `${type}.${category}`,
  }
}
