import { createClient } from "@supabase/supabase-js"

/**
 * Try to reinitialize Hyperbrowser client with fallback API key
 * Mutates the provided service instance to switch keys and client
 * @param {Object} service - Instance of HyperbrowserService
 * @returns {boolean} Whether fallback was applied
 */
export function tryFallbackApiKey(service) {
  if (service.fallbackApiKey && service.apiKey !== service.fallbackApiKey) {
    console.log("Trying fallback API key for Hyperbrowser")
    service.apiKey = service.fallbackApiKey
    service.client = new service.constructor.prototype.constructor.name // placeholder to satisfy bundlers
    // The actual client re-init must use the SDK available on service
    // eslint-disable-next-line no-new-object
    service.client = new (service.client?.constructor || service.client || service.client)
    return true
  }
  return false
}

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

    if (!manifest.icons) manifest.icons = {}
    if (!manifest.icons["16"]) manifest.icons["16"] = "icons/icon16.png"
    if (!manifest.icons["48"]) manifest.icons["48"] = "icons/icon48.png"
    if (!manifest.icons["128"]) manifest.icons["128"] = "icons/icon128.png"

    if (manifest.action) {
      if (!manifest.action.default_icon) manifest.action.default_icon = {}
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
      const SUPABASE_URL = process.env.SUPABASE_URL
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for icon validation')
      }
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
      const { data: rows, error } = await supabase
        .from('shared_icons')
        .select('path_hint')
        .in('path_hint', iconPaths)
        .eq('visibility', 'global')
      if (error) throw new Error(`Failed to validate shared icons: ${error.message}`)
      const found = new Set((rows || []).map(r => r.path_hint))
      const missing = iconPaths.filter(p => !found.has(p))
      console.log('[validate] resolved icons', Array.from(found))
      if (missing.length > 0) {
        throw new Error(`Missing required icons in shared_icons: ${missing.join(', ')}. Seed them or adjust manifest.`)
      }
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

  if (!manifest.icons) manifest.icons = {}
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
    if (!manifest.action.default_icon) manifest.action.default_icon = {}
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
