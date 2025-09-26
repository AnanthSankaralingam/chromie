/**
 * Chrome API Validator
 * Validates generated extension code for common API usage issues and missing permissions
 */

// Common Chrome APIs and their required permissions
const API_PERMISSIONS = {
  'chrome.contextMenus': ['contextMenus'],
  'chrome.bookmarks': ['bookmarks'],
  'chrome.history': ['history'],
  'chrome.tabs': ['tabs'], // Note: basic tab operations don't need permissions, but URL/title access does
  'chrome.storage': ['storage'],
  'chrome.notifications': ['notifications'],
  'chrome.downloads': ['downloads'],
  'chrome.cookies': ['cookies'],
  'chrome.browsingData': ['browsingData'],
  'chrome.identity': ['identity'],
  'chrome.alarms': ['alarms'],
  'chrome.scripting': ['scripting'],
  'chrome.webRequest': ['webRequest'],
  'chrome.webNavigation': ['webNavigation'],
  'chrome.sidePanel': ['sidePanel'],
  'chrome.topSites': ['topSites'],
  'chrome.management': ['management'],
  'chrome.sessions': ['sessions'],
  'chrome.fontSettings': ['fontSettings'],
  'chrome.privacy': ['privacy'],
  'chrome.contentSettings': ['contentSettings'],
  'chrome.pageCapture': ['pageCapture'],
  'chrome.idle': ['idle'],
  'chrome.tts': ['tts'],
  'chrome.commands': [], // No special permission needed
  'chrome.runtime': [], // No special permission needed
  'chrome.action': [], // No special permission needed
  'chrome.windows': [], // No special permission needed
  'chrome.permissions': [], // No special permission needed
  'chrome.offscreen': ['offscreen'],
  'chrome.declarativeNetRequest': ['declarativeNetRequest']
};

// Host permissions patterns
const HOST_PERMISSION_PATTERNS = [
  /fetch\s*\(\s*['"`]https?:\/\/([^'"`\/]+)/g,
  /XMLHttpRequest.*open\s*\(\s*['"`]\w+['"`]\s*,\s*['"`]https?:\/\/([^'"`\/]+)/g,
  /new\s+URL\s*\(\s*['"`]https?:\/\/([^'"`\/]+)/g
];

/**
 * Validates Chrome extension code for common API issues
 * @param {Object} extensionFiles - Generated extension files
 * @returns {Object} Validation results with warnings and suggestions
 */
export function validateChromeExtension(extensionFiles) {
  const results = {
    isValid: true,
    warnings: [],
    errors: [],
    suggestions: []
  };

  try {
    // Parse manifest
    let manifest = {};
    if (extensionFiles['manifest.json']) {
      try {
        manifest = typeof extensionFiles['manifest.json'] === 'string' 
          ? JSON.parse(extensionFiles['manifest.json'])
          : extensionFiles['manifest.json'];
      } catch (error) {
        results.errors.push('Invalid manifest.json format');
        results.isValid = false;
        return results;
      }
    }

    // Get all code files
    const codeFiles = ['background.js', 'content.js', 'popup.js', 'sidepanel.js'];
    let allCode = '';
    
    codeFiles.forEach(filename => {
      if (extensionFiles[filename]) {
        allCode += extensionFiles[filename] + '\n';
      }
    });

    // Check for missing permissions
    const missingPermissions = checkMissingPermissions(allCode, manifest);
    missingPermissions.forEach(permission => {
      results.errors.push(`Missing permission "${permission}" in manifest.json`);
      results.isValid = false;
    });

    // Check for missing host permissions
    const missingHostPermissions = checkMissingHostPermissions(allCode, manifest);
    missingHostPermissions.forEach(host => {
      results.warnings.push(`Consider adding host permission for "${host}" in manifest.json`);
    });

    // Check for common API usage issues
    const apiIssues = checkCommonAPIIssues(allCode);
    apiIssues.forEach(issue => {
      if (issue.severity === 'error') {
        results.errors.push(issue.message);
        results.isValid = false;
      } else {
        results.warnings.push(issue.message);
      }
    });

    // Check manifest structure
    const manifestIssues = checkManifestStructure(manifest);
    manifestIssues.forEach(issue => {
      if (issue.severity === 'error') {
        results.errors.push(issue.message);
        results.isValid = false;
      } else {
        results.warnings.push(issue.message);
      }
    });

    // Generate suggestions
    results.suggestions = generateSuggestions(allCode, manifest);

  } catch (error) {
    results.errors.push(`Validation error: ${error.message}`);
    results.isValid = false;
  }

  return results;
}

/**
 * Check for missing permissions based on API usage
 */
function checkMissingPermissions(code, manifest) {
  const missingPermissions = [];
  const existingPermissions = manifest.permissions || [];

  // Check each API usage
  Object.entries(API_PERMISSIONS).forEach(([api, requiredPerms]) => {
    if (code.includes(api)) {
      requiredPerms.forEach(perm => {
        if (!existingPermissions.includes(perm)) {
          missingPermissions.push(perm);
        }
      });
    }
  });

  return [...new Set(missingPermissions)];
}

/**
 * Check for missing host permissions
 */
function checkMissingHostPermissions(code, manifest) {
  const missingHosts = [];
  const existingHostPermissions = manifest.host_permissions || [];

  HOST_PERMISSION_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const host = match[1];
      const hostPattern = `*://${host}/*`;
      
      if (!existingHostPermissions.some(perm => 
        perm.includes(host) || perm === '<all_urls>')) {
        missingHosts.push(hostPattern);
      }
    }
  });

  return [...new Set(missingHosts)];
}

/**
 * Check for common API usage issues
 */
function checkCommonAPIIssues(code) {
  const issues = [];

  // Check for context menu without proper setup
  if (code.includes('chrome.contextMenus.onClicked') && !code.includes('chrome.contextMenus.create')) {
    issues.push({
      severity: 'warning',
      message: 'Using contextMenus.onClicked without creating context menu items'
    });
  }

  // Check for storage usage without error handling
  if (code.includes('chrome.storage') && !code.includes('chrome.runtime.lastError')) {
    issues.push({
      severity: 'warning',
      message: 'Consider adding error handling for chrome.storage operations'
    });
  }

  // Check for tabs API usage patterns
  if (code.includes('chrome.tabs.query') && !code.includes('activeTab') && !code.includes('tabs')) {
    issues.push({
      severity: 'warning',
      message: 'tabs.query may require "tabs" or "activeTab" permission for full functionality'
    });
  }

  // Check for identity API without OAuth2 config
  if (code.includes('chrome.identity.getAuthToken') && !code.includes('oauth2')) {
    issues.push({
      severity: 'error',
      message: 'Using identity.getAuthToken requires oauth2 configuration in manifest'
    });
  }

  // Check for Google Workspace API usage
  const workspaceAPIs = [
    'makeWorkspaceAPIRequest',
    'getGoogleWorkspaceToken',
    'googleapis.com/drive',
    'googleapis.com/gmail',
    'googleapis.com/calendar'
  ];
  
  const hasWorkspaceAPI = workspaceAPIs.some(api => code.includes(api));
  if (hasWorkspaceAPI && !code.includes('oauth2')) {
    issues.push({
      severity: 'error',
      message: 'Google Workspace integration requires oauth2 configuration with client_id and scopes'
    });
  }

  // Check for missing authentication UI in Workspace extensions
  if (hasWorkspaceAPI && !code.includes('Sign in') && !code.includes('Connect to Google')) {
    issues.push({
      severity: 'warning',
      message: 'Google Workspace extensions should include authentication UI (sign-in button)'
    });
  }

  return issues;
}

/**
 * Check manifest structure for common issues
 */
function checkManifestStructure(manifest) {
  const issues = [];

  // Check manifest version
  if (!manifest.manifest_version) {
    issues.push({
      severity: 'error',
      message: 'Missing manifest_version in manifest.json'
    });
  } else if (manifest.manifest_version !== 3) {
    issues.push({
      severity: 'warning',
      message: 'Consider using Manifest V3 for new extensions'
    });
  }

  // Check required fields
  if (!manifest.name) {
    issues.push({
      severity: 'error',
      message: 'Missing required "name" field in manifest.json'
    });
  }

  if (!manifest.version) {
    issues.push({
      severity: 'error',
      message: 'Missing required "version" field in manifest.json'
    });
  }

  // Check for background script configuration
  if (manifest.background) {
    if (manifest.manifest_version === 3 && manifest.background.scripts) {
      issues.push({
        severity: 'warning',
        message: 'Manifest V3 should use "service_worker" instead of "scripts" in background'
      });
    }
  }

  return issues;
}

/**
 * Generate suggestions for improvement
 */
function generateSuggestions(code, manifest) {
  const suggestions = [];

  // Suggest using chrome.storage for data persistence
  if (code.includes('localStorage') || code.includes('sessionStorage')) {
    suggestions.push('Consider using chrome.storage instead of localStorage for better extension data management');
  }

  // Suggest error handling patterns
  if (code.includes('chrome.') && !code.includes('chrome.runtime.lastError')) {
    suggestions.push('Add proper error handling using chrome.runtime.lastError for Chrome API calls');
  }

  // Suggest using async/await for better code readability
  if (code.includes('chrome.') && code.includes('callback') && !code.includes('async')) {
    suggestions.push('Consider using async/await pattern with chrome API promises for better code readability');
  }

  return suggestions;
}

/**
 * Auto-fix common issues in extension files
 * @param {Object} extensionFiles - Generated extension files
 * @returns {Object} Fixed extension files
 */
export function autoFixExtension(extensionFiles) {
  const validation = validateChromeExtension(extensionFiles);
  const fixedFiles = { ...extensionFiles };

  try {
    // Parse manifest
    let manifest = typeof fixedFiles['manifest.json'] === 'string' 
      ? JSON.parse(fixedFiles['manifest.json'])
      : fixedFiles['manifest.json'];

    // Auto-fix missing permissions
    const allCode = Object.values(extensionFiles)
      .filter(content => typeof content === 'string')
      .join('\n');

    const missingPermissions = checkMissingPermissions(allCode, manifest);
    if (missingPermissions.length > 0) {
      manifest.permissions = manifest.permissions || [];
      missingPermissions.forEach(perm => {
        if (!manifest.permissions.includes(perm)) {
          manifest.permissions.push(perm);
        }
      });
    }

    // Auto-fix missing host permissions
    const missingHostPermissions = checkMissingHostPermissions(allCode, manifest);
    if (missingHostPermissions.length > 0) {
      manifest.host_permissions = manifest.host_permissions || [];
      missingHostPermissions.forEach(host => {
        if (!manifest.host_permissions.includes(host)) {
          manifest.host_permissions.push(host);
        }
      });
    }

    // Auto-fix Google Workspace OAuth2 configuration
    const workspaceAPIs = [
      'makeWorkspaceAPIRequest',
      'getGoogleWorkspaceToken', 
      'googleapis.com/drive',
      'googleapis.com/gmail',
      'googleapis.com/calendar'
    ];
    
    const hasWorkspaceAPI = workspaceAPIs.some(api => allCode.includes(api));
    if (hasWorkspaceAPI && !manifest.oauth2) {
      // Add basic OAuth2 configuration template
      manifest.oauth2 = {
        "client_id": "YOUR_CLIENT_ID.googleusercontent.com",
        "scopes": [
          "https://www.googleapis.com/auth/drive.file",
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/calendar.readonly"
        ]
      };
      
      // Ensure identity permission is included
      manifest.permissions = manifest.permissions || [];
      if (!manifest.permissions.includes('identity')) {
        manifest.permissions.push('identity');
      }
    }

    // Update manifest
    fixedFiles['manifest.json'] = typeof extensionFiles['manifest.json'] === 'string'
      ? JSON.stringify(manifest, null, 2)
      : manifest;

  } catch (error) {
    console.error('Auto-fix error:', error);
  }

  return fixedFiles;
}

/**
 * Generate a detailed validation report
 * @param {Object} extensionFiles - Generated extension files
 * @returns {string} Formatted validation report
 */
export function generateValidationReport(extensionFiles) {
  const validation = validateChromeExtension(extensionFiles);
  
  let report = '# Chrome Extension Validation Report\n\n';
  
  if (validation.isValid) {
    report += '✅ **Status**: Valid\n\n';
  } else {
    report += '❌ **Status**: Issues found\n\n';
  }

  if (validation.errors.length > 0) {
    report += '## ❌ Errors\n';
    validation.errors.forEach(error => {
      report += `- ${error}\n`;
    });
    report += '\n';
  }

  if (validation.warnings.length > 0) {
    report += '## ⚠️ Warnings\n';
    validation.warnings.forEach(warning => {
      report += `- ${warning}\n`;
    });
    report += '\n';
  }

  if (validation.suggestions.length > 0) {
    report += '## 💡 Suggestions\n';
    validation.suggestions.forEach(suggestion => {
      report += `- ${suggestion}\n`;
    });
    report += '\n';
  }

  return report;
}
