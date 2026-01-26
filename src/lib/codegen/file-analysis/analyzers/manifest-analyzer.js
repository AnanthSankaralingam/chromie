/**
 * Manifest.json analyzer
 * Extracts manifest version, permissions, background, action, content scripts, etc.
 */

/**
 * Analyzes a manifest.json file
 * @param {string} content - File content
 * @param {string} path - File path
 * @returns {Object} Analysis result
 */
export function analyzeManifest(content, path) {
  const result = {
    manifestVersion: null,
    name: null,
    version: null,
    description: null,
    permissions: [],
    hostPermissions: [],
    background: null,
    action: null,
    contentScripts: [],
    sidePanel: null,
    options: null,
    chromeUrlOverrides: null,
    webAccessibleResources: [],
    icons: null,
    parseError: null
  }

  try {
    const manifest = JSON.parse(content)

    // Basic info
    result.manifestVersion = manifest.manifest_version || null
    result.name = manifest.name || null
    result.version = manifest.version || null
    result.description = manifest.description || null

    // Permissions
    result.permissions = manifest.permissions || []
    result.hostPermissions = manifest.host_permissions || []

    // Background
    if (manifest.background) {
      result.background = extractBackground(manifest.background, manifest.manifest_version)
    }

    // Action (browserAction in MV2)
    if (manifest.action) {
      result.action = extractAction(manifest.action)
    } else if (manifest.browser_action) {
      result.action = extractAction(manifest.browser_action)
    }

    // Content scripts
    if (manifest.content_scripts) {
      result.contentScripts = extractContentScripts(manifest.content_scripts)
    }

    // Side panel
    if (manifest.side_panel) {
      result.sidePanel = {
        defaultPath: manifest.side_panel.default_path || null
      }
    }

    // Options page
    if (manifest.options_page) {
      result.options = {
        page: manifest.options_page,
        type: 'page'
      }
    } else if (manifest.options_ui) {
      result.options = {
        page: manifest.options_ui.page || null,
        type: 'ui',
        openInTab: manifest.options_ui.open_in_tab || false
      }
    }

    // Chrome URL overrides
    if (manifest.chrome_url_overrides) {
      result.chromeUrlOverrides = manifest.chrome_url_overrides
    }

    // Web accessible resources
    if (manifest.web_accessible_resources) {
      result.webAccessibleResources = extractWebAccessibleResources(
        manifest.web_accessible_resources,
        manifest.manifest_version
      )
    }

    // Icons
    if (manifest.icons) {
      result.icons = manifest.icons
    }

  } catch (error) {
    result.parseError = error.message
  }

  return result
}

/**
 * Extracts background script/service worker info
 */
function extractBackground(background, manifestVersion) {
  const result = {
    type: null,
    scripts: [],
    serviceWorker: null,
    persistent: null
  }

  if (manifestVersion === 3) {
    // MV3 uses service_worker
    if (background.service_worker) {
      result.type = 'service_worker'
      result.serviceWorker = background.service_worker
    }
  } else {
    // MV2 uses scripts array
    if (background.scripts) {
      result.type = 'scripts'
      result.scripts = background.scripts
    }
    if (background.page) {
      result.type = 'page'
      result.scripts = [background.page]
    }
    result.persistent = background.persistent !== false
  }

  return result
}

/**
 * Extracts action/browserAction info
 */
function extractAction(action) {
  return {
    defaultPopup: action.default_popup || null,
    defaultIcon: action.default_icon || null,
    defaultTitle: action.default_title || null
  }
}

/**
 * Extracts content scripts info
 */
function extractContentScripts(contentScripts) {
  return contentScripts.map(script => ({
    matches: script.matches || [],
    js: script.js || [],
    css: script.css || [],
    runAt: script.run_at || 'document_idle',
    allFrames: script.all_frames || false
  }))
}

/**
 * Extracts web accessible resources
 */
function extractWebAccessibleResources(resources, manifestVersion) {
  if (manifestVersion === 3) {
    // MV3 format: array of objects with resources and matches
    return resources.map(entry => ({
      resources: entry.resources || [],
      matches: entry.matches || []
    }))
  } else {
    // MV2 format: array of strings
    return resources.map(resource => ({
      resources: [resource],
      matches: ['<all_urls>']
    }))
  }
}
