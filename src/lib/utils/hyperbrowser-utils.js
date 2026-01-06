import { createClient } from "@supabase/supabase-js"

/**
 * Validate extension files and ensure required files are present
 * @param {Array<{file_path: string, content: string}>} files - Extension files
 */
export async function validateExtensionFiles(files) {
  console.log("Validating extension files...")

  const manifestFile = files.find(f => f.file_path === 'manifest.json')
  if (!manifestFile) {
    throw new Error("Extension must have a manifest.json file")
  }

  try {
    const manifest = JSON.parse(manifestFile.content)
    console.log("Manifest validation:", {
      name: manifest.name,
      version: manifest.version,
      manifest_version: manifest.manifest_version
    })

    if (!manifest.name) throw new Error("manifest.json must have a 'name' field")
    if (!manifest.version) throw new Error("manifest.json must have a 'version' field")
    if (!manifest.manifest_version) throw new Error("manifest.json must have a 'manifest_version' field")

    if (manifest.action && manifest.action.default_popup) {
      const popupFile = files.find(f => f.file_path === manifest.action.default_popup)
      if (!popupFile) {
        console.warn(`⚠️ Popup file '${manifest.action.default_popup}' declared in manifest but not found - will create default`)
      }
    }

    if (manifest.side_panel && manifest.side_panel.default_path) {
      const sidePanelFile = files.find(f => f.file_path === manifest.side_panel.default_path)
      if (!sidePanelFile) {
        console.warn(`⚠️ Side panel file '${manifest.side_panel.default_path}' declared in manifest but not found - will create default`)
      }
    }

    if (manifest.background && manifest.background.service_worker) {
      const backgroundFile = files.find(f => f.file_path === manifest.background.service_worker)
      if (!backgroundFile) {
        console.warn(`⚠️ Background script '${manifest.background.service_worker}' declared in manifest but not found - will create default`)
      }
    }

    if (manifest.content_scripts) {
      for (const script of manifest.content_scripts) {
        if (script.js) {
          for (const jsFile of script.js) {
            const contentFile = files.find(f => f.file_path === jsFile)
            if (!contentFile) {
              console.warn(`⚠️ Content script '${jsFile}' declared in manifest but not found - will create default`)
            }
          }
        }
      }
    }

    // Ensure icons is an object, not a string
    if (!manifest.icons || typeof manifest.icons !== 'object' || Array.isArray(manifest.icons)) {
      manifest.icons = {}
    }
    if (!manifest.icons["16"]) manifest.icons["16"] = "icons/icon16.png"
    if (!manifest.icons["48"]) manifest.icons["48"] = "icons/icon48.png"
    if (!manifest.icons["128"]) manifest.icons["128"] = "icons/icon128.png"

    if (manifest.action) {
      // Ensure default_icon is an object, not a string
      if (!manifest.action.default_icon || typeof manifest.action.default_icon !== 'object' || Array.isArray(manifest.action.default_icon)) {
        manifest.action.default_icon = {}
      }
      if (!manifest.action.default_icon["16"]) manifest.action.default_icon["16"] = "icons/icon16.png"
      if (!manifest.action.default_icon["48"]) manifest.action.default_icon["48"] = "icons/icon48.png"
      if (!manifest.action.default_icon["128"]) manifest.action.default_icon["128"] = "icons/icon128.png"
    }

    const requiredIconPaths = new Set()
    for (const p of Object.values(manifest.icons || {})) if (typeof p === 'string') requiredIconPaths.add(p)
    if (manifest.action && manifest.action.default_icon) {
      for (const p of Object.values(manifest.action.default_icon)) if (typeof p === 'string') requiredIconPaths.add(p)
    }
    const iconPaths = Array.from(requiredIconPaths).filter(p => p.startsWith('icons/'))
    console.log('[validate] required icon paths', iconPaths)

    if (iconPaths.length > 0) {
      // First check if icons are already provided in the files array (custom uploaded icons)
      const customIconPaths = new Set()
      for (const file of files) {
        if (file.file_path && file.file_path.startsWith('icons/')) {
          customIconPaths.add(file.file_path)
        }
      }
      console.log('[validate] custom icons in files', Array.from(customIconPaths))

      // Only check shared_icons for icons NOT already provided as custom
      const iconsToCheckInShared = iconPaths.filter(p => !customIconPaths.has(p))
      console.log('[validate] icons to check in shared_icons', iconsToCheckInShared)

      if (iconsToCheckInShared.length > 0) {
        const SUPABASE_URL = process.env.SUPABASE_URL
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
          throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for icon validation')
        }
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
        const { data: rows, error } = await supabase
          .from('shared_icons')
          .select('path_hint')
          .in('path_hint', iconsToCheckInShared)
          .eq('visibility', 'global')
        if (error) throw new Error(`Failed to validate shared icons: ${error.message}`)
        const foundInShared = new Set((rows || []).map(r => r.path_hint))
        const missing = iconsToCheckInShared.filter(p => !foundInShared.has(p))
        console.log('[validate] icons resolved from shared_icons', Array.from(foundInShared))

        if (missing.length > 0) {
          throw new Error(`Missing required icons: ${missing.join(', ')}. Upload them as custom assets or seed them in shared_icons.`)
        }
      }

      console.log('[validate] ✅ All required icons resolved (custom + shared)')
    }

    console.log("✅ Extension files validation passed")
  } catch (error) {
    console.error("❌ Extension validation failed:", error.message)
    throw new Error(`Extension validation failed: ${error.message}`)
  }
}

/**
 * Ensure all required extension files are present, create defaults if missing
 * @param {Array<{file_path: string, content: string}>} files - Extension files
 * @returns {Array<{file_path: string, content: string}>}
 */
export function ensureRequiredFiles(files) {
  console.log("Ensuring required extension files...")
  const result = [...files]

  const manifestFile = files.find(f => f.file_path === 'manifest.json')
  if (!manifestFile) {
    throw new Error("Extension must have a manifest.json file")
  }

  const manifest = JSON.parse(manifestFile.content)

  if (manifest.action && manifest.action.default_popup) {
    const popupFile = files.find(f => f.file_path === manifest.action.default_popup)
    if (!popupFile) {
      console.log(`Creating default popup file: ${manifest.action.default_popup}`)
      result.push({ file_path: manifest.action.default_popup, content: createDefaultPopupHTML(manifest.name || 'Extension') })
    }
  }

  if (manifest.side_panel && manifest.side_panel.default_path) {
    const sidePanelFile = files.find(f => f.file_path === manifest.side_panel.default_path)
    if (!sidePanelFile) {
      console.log(`Creating default side panel file: ${manifest.side_panel.default_path}`)
      result.push({ file_path: manifest.side_panel.default_path, content: createDefaultSidePanelHTML(manifest.name || 'Extension') })
    }
  }

  if (manifest.background && manifest.background.service_worker) {
    const backgroundFile = files.find(f => f.file_path === manifest.background.service_worker)
    if (!backgroundFile) {
      console.log(`Creating default background script: ${manifest.background.service_worker}`)
      result.push({ file_path: manifest.background.service_worker, content: createDefaultBackgroundJS() })
    }
  }

  if (manifest.content_scripts) {
    for (const script of manifest.content_scripts) {
      if (script.js) {
        for (const jsFile of script.js) {
          const contentFile = files.find(f => f.file_path === jsFile)
          if (!contentFile) {
            console.log(`Creating default content script: ${jsFile}`)
            result.push({ file_path: jsFile, content: createDefaultContentJS() })
          }
        }
      }
    }
  }

  // Ensure icons is an object, not a string
  if (!manifest.icons || typeof manifest.icons !== 'object' || Array.isArray(manifest.icons)) {
    manifest.icons = {}
  }
  if (!manifest.icons["16"]) manifest.icons["16"] = "icons/icon16.png"
  if (!manifest.icons["48"]) manifest.icons["48"] = "icons/icon48.png"
  if (!manifest.icons["128"]) manifest.icons["128"] = "icons/icon128.png"
  {
    const manifestIndex = result.findIndex(f => f.file_path === 'manifest.json')
    if (manifestIndex !== -1) {
      result[manifestIndex].content = JSON.stringify(manifest, null, 2)
    }
  }

  if (manifest.action) {
    // Ensure default_icon is an object, not a string
    if (!manifest.action.default_icon || typeof manifest.action.default_icon !== 'object' || Array.isArray(manifest.action.default_icon)) {
      manifest.action.default_icon = {}
    }
    if (!manifest.action.default_icon["16"]) manifest.action.default_icon["16"] = "icons/icon16.png"
    if (!manifest.action.default_icon["48"]) manifest.action.default_icon["48"] = "icons/icon48.png"
    if (!manifest.action.default_icon["128"]) manifest.action.default_icon["128"] = "icons/icon128.png"
    const manifestIndex = result.findIndex(f => f.file_path === 'manifest.json')
    if (manifestIndex !== -1) {
      result[manifestIndex].content = JSON.stringify(manifest, null, 2)
    }
  }

  console.log("✅ Required files ensured")
  return result
}

export function createDefaultIconBase64() {
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
}

/**
 * Create a default background.js service worker
 * Safe implementation that checks for API availability
 */
export function createDefaultBackgroundJS() {
  return `// [CHROMIE:background.js] Default background service worker
console.log('[CHROMIE:background.js] Service worker loaded');

// Listen for extension installation
if (chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener((details) => {
    console.log('[CHROMIE:background.js] Extension installed:', details.reason);
  });
}

// Handle action button clicks (if action API is available)
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener((tab) => {
    console.log('[CHROMIE:background.js] Action button clicked');
    
    // If sidePanel API is available, open side panel
    if (chrome.sidePanel && chrome.sidePanel.open) {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => {
        console.error('[CHROMIE:background.js] Failed to open side panel:', error);
      });
    }
  });
}

// Handle messages from content scripts or other parts of the extension
if (chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[CHROMIE:background.js] Message received:', message);
    // Handle messages here
    return true; // Keep the message channel open for async responses
  });
}
`
}

/**
 * Create default popup HTML
 */
export function createDefaultPopupHTML(extensionName = 'Extension') {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${extensionName}</title>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: 300px;
      min-height: 200px;
    }
    h1 {
      font-size: 18px;
      margin: 0 0 12px 0;
    }
  </style>
</head>
<body>
  <h1>${extensionName}</h1>
  <p>Extension popup interface</p>
</body>
</html>
`
}

/**
 * Create default side panel HTML
 */
export function createDefaultSidePanelHTML(extensionName = 'Extension') {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${extensionName}</title>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    h1 {
      font-size: 20px;
      margin: 0 0 12px 0;
    }
  </style>
</head>
<body>
  <h1>${extensionName}</h1>
  <p>Side panel interface</p>
</body>
</html>
`
}

/**
 * Create default content script
 */
export function createDefaultContentJS() {
  return `// [CHROMIE:content.js] Default content script
console.log('[CHROMIE:content.js] Content script loaded');

// Listen for messages from background, side panel, or popup
if (chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[CHROMIE:content.js] Message received:', message);
    
    // Handle different message actions
    if (message.action === 'scanPage') {
      // Example: Scan page and return data
      const elements = [];
      // ... scan logic ...
      sendResponse({ elements });
    } else if (message.action === 'highlightElement') {
      // Example: Highlight an element
      // ... highlight logic ...
      sendResponse({ success: true });
    }
    
    // Return true to indicate we will send a response asynchronously
    return true;
  });
}
`
}
