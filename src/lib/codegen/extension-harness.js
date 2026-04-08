/**
 * Extension Harness
 * Static structural validation after task-graph generation.
 * Catches manifest file reference errors and message-passing mismatches
 * that ESLint cannot detect.
 */

import { analyzeManifest } from '@/lib/codegen/file-analysis/analyzers/manifest-analyzer.js'
import { AVAILABLE_ICON_PATHS } from '@/lib/utils/available-icons.js'

const GLOB_PATTERN = /[*?[\]]/
const ICON_REF_RE = /icons\/[A-Za-z0-9-_]+\.png/gi
const FALLBACK_ICON = 'icons/icon128.png'

const CODE_EXTENSIONS = ['.js', '.json', '.html']

/**
 * @typedef {Object} HarnessError
 * @property {string} type - 'missing_file' | 'unhandled_message_type' | 'unmatched_listener'
 * @property {string} referencedBy - File that references the problem
 * @property {string} referencedFile - The missing file or message type string
 * @property {string} field - The manifest field or API call that caused the error
 */

/**
 * Validates that all files referenced in manifest.json exist in completedFiles.
 * @param {Map<string,string>} completedFiles
 * @returns {HarnessError[]}
 */
export function validateManifestFileReferences(completedFiles) {
  const errors = []
  const manifestContent = completedFiles.get('manifest.json')
  if (!manifestContent) return errors

  const analyzed = analyzeManifest(manifestContent, 'manifest.json')
  if (analyzed.parseError) return errors

  function check(referencedFile, field) {
    if (!referencedFile || typeof referencedFile !== 'string') return
    if (GLOB_PATTERN.test(referencedFile)) return
    if (!completedFiles.has(referencedFile)) {
      errors.push({ type: 'missing_file', referencedBy: 'manifest.json', referencedFile, field })
    }
  }

  // background
  if (analyzed.background) {
    check(analyzed.background.serviceWorker, 'background.service_worker')
    for (const s of analyzed.background.scripts || []) {
      check(s, 'background.scripts')
    }
  }

  // action
  if (analyzed.action) {
    check(analyzed.action.defaultPopup, 'action.default_popup')
  }

  // content scripts
  for (let i = 0; i < (analyzed.contentScripts || []).length; i++) {
    const cs = analyzed.contentScripts[i]
    for (const f of cs.js || []) check(f, `content_scripts[${i}].js`)
    for (const f of cs.css || []) check(f, `content_scripts[${i}].css`)
  }

  // side panel
  if (analyzed.sidePanel) {
    check(analyzed.sidePanel.defaultPath, 'side_panel.default_path')
  }

  // options
  if (analyzed.options) {
    check(analyzed.options.page, analyzed.options.type === 'ui' ? 'options_ui.page' : 'options_page')
  }

  // chrome url overrides
  if (analyzed.chromeUrlOverrides) {
    for (const [key, val] of Object.entries(analyzed.chromeUrlOverrides)) {
      check(val, `chrome_url_overrides.${key}`)
    }
  }

  // web accessible resources
  for (let i = 0; i < (analyzed.webAccessibleResources || []).length; i++) {
    for (const r of analyzed.webAccessibleResources[i].resources || []) {
      check(r, `web_accessible_resources[${i}].resources`)
    }
  }

  return errors
}

/**
 * Levenshtein distance for string similarity.
 */
function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const d = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) d[i][0] = i
  for (let j = 0; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
    }
  }
  return d[m][n]
}

/**
 * Picks the most similar valid icon path for an invalid reference.
 */
function bestMatchingIcon(invalidPath, validPaths) {
  const invalidName = invalidPath.replace(/^icons\//i, '').replace(/\.png$/i, '').toLowerCase()
  if (!invalidName) return FALLBACK_ICON
  let best = FALLBACK_ICON
  let bestScore = -1
  for (const p of validPaths) {
    const name = p.replace(/^icons\//i, '').replace(/\.png$/i, '').toLowerCase()
    const dist = levenshtein(invalidName, name)
    const maxLen = Math.max(invalidName.length, name.length, 1)
    const score = 1 - dist / maxLen
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  return best
}

/**
 * Validates icon usage across JS, JSON, and HTML files. Replaces invalid icon refs
 * with the best string-matched similar from shared icons or user uploads, or icons/icon128.png.
 * Mutates completedFiles in place.
 * @param {Map<string,string>} completedFiles
 */
/**
 * Manifest V3: each string in web_accessible_resources[].matches must be a match pattern
 * whose path is exactly /* (origin-only). Chrome rejects e.g. https://site.com/path/* with
 * "Invalid match pattern" — unlike content_scripts, where path-specific patterns are allowed.
 * @param {object} manifest - parsed manifest.json
 * @returns {boolean} true if any match string was rewritten
 */
function normalizeWebAccessibleResourceMatchesInPlace(manifest) {
  if (!manifest || manifest.manifest_version !== 3 || !Array.isArray(manifest.web_accessible_resources)) {
    return false
  }
  let changed = false
  for (const entry of manifest.web_accessible_resources) {
    if (!entry || !Array.isArray(entry.matches)) continue
    entry.matches = entry.matches.map((p) => {
      if (typeof p !== 'string') return p
      const trimmed = p.trim()
      if (trimmed === '<all_urls>') return trimmed
      const m = trimmed.match(/^([^:]+:\/\/[^/]+)(\/.*)?$/)
      if (!m) return trimmed
      const fixed = `${m[1]}/*`
      if (fixed !== trimmed) {
        changed = true
        console.log(
          `[extension-harness] Normalized web_accessible_resources.matches (MV3 requires origin + /* only): "${trimmed}" -> "${fixed}"`
        )
      }
      return fixed
    })
  }
  return changed
}

/**
 * Rewrites invalid MV3 web_accessible_resources match patterns in manifest.json.
 * @param {Map<string,string>} completedFiles
 */
export function fixWebAccessibleResourceMatches(completedFiles) {
  const raw = completedFiles.get('manifest.json')
  if (!raw) return
  let manifest
  try {
    manifest = JSON.parse(raw)
  } catch {
    return
  }
  if (!normalizeWebAccessibleResourceMatchesInPlace(manifest)) return
  completedFiles.set('manifest.json', JSON.stringify(manifest, null, 2))
}

export function validateAndFixIconUsage(completedFiles) {
  const customIcons = new Set()
  for (const path of completedFiles.keys()) {
    if (path.startsWith('icons/')) customIcons.add(path)
  }
  const validPaths = new Set([...AVAILABLE_ICON_PATHS, ...customIcons])
  if (validPaths.size === 0) validPaths.add(FALLBACK_ICON)

  for (const [fileName, content] of completedFiles) {
    const ext = fileName.slice(fileName.lastIndexOf('.'))
    if (!CODE_EXTENSIONS.includes(ext)) continue

    const refs = [...new Set(content.match(ICON_REF_RE) || [])]
    let updated = content
    for (const ref of refs) {
      const normalized = ref.toLowerCase()
      const isValid = [...validPaths].some((p) => p.toLowerCase() === normalized)
      if (isValid) continue

      const replacement = bestMatchingIcon(ref, validPaths)
      updated = updated.replace(new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacement)
      console.log(`[extension-harness] Fixed invalid icon "${ref}" -> "${replacement}" in ${fileName}`)
    }
    if (updated !== content) completedFiles.set(fileName, updated)
  }
}

/**
 * Validates that chrome.runtime.sendMessage types have matching onMessage listeners and vice versa.
 * @param {Map<string,string>} completedFiles
 * @returns {HarnessError[]}
 */
export function validateMessagePassing(completedFiles) {
  const errors = []

  // type/action string sent via sendMessage
  const senderRe = /chrome\.(?:runtime|tabs)\.sendMessage\s*\([^)]*?\{\s*(?:type|action)\s*:\s*['"]([A-Za-z0-9_\-]+)['"]/g
  // type/action string checked in onMessage handler
  const listenerRe = /\b(?:request|message|msg)\.(?:type|action)\s*===?\s*['"]([A-Za-z0-9_\-]+)['"]/g

  // sentFrom: type -> Set<file>
  const sentFrom = new Map()
  // listenedIn: type -> Set<file>
  const listenedIn = new Map()

  for (const [fileName, content] of completedFiles) {
    if (!fileName.endsWith('.js')) continue

    // Extract sent types
    const sentMatches = [...content.matchAll(senderRe)]
    for (const m of sentMatches) {
      const type = m[1]
      if (!sentFrom.has(type)) sentFrom.set(type, new Set())
      sentFrom.get(type).add(fileName)
    }

    // Extract listener types (only in files that use onMessage)
    if (content.includes('onMessage')) {
      const listenerMatches = [...content.matchAll(listenerRe)]
      for (const m of listenerMatches) {
        const type = m[1]
        if (!listenedIn.has(type)) listenedIn.set(type, new Set())
        listenedIn.get(type).add(fileName)
      }
    }
  }

  // Sent but not listened
  for (const [type, files] of sentFrom) {
    if (!listenedIn.has(type)) {
      for (const file of files) {
        errors.push({
          type: 'unhandled_message_type',
          referencedBy: file,
          referencedFile: type,
          field: 'chrome.runtime.sendMessage'
        })
      }
    }
  }

  // Listened but not sent — only flag when there are senders (avoids false positives on listener-only files)
  if (sentFrom.size > 0) {
    for (const [type, files] of listenedIn) {
      if (!sentFrom.has(type)) {
        for (const file of files) {
          errors.push({
            type: 'unmatched_listener',
            referencedBy: file,
            referencedFile: type,
            field: 'onMessage.addListener'
          })
        }
      }
    }
  }

  return errors
}

/**
 * Runs all harness validators and returns aggregated results.
 * Runs icon validation/fix first (mutates completedFiles), then structural validators.
 * @param {Map<string,string>} completedFiles
 * @returns {{ errors: HarnessError[], hasErrors: boolean }}
 */
export function runExtensionHarness(completedFiles) {
  validateAndFixIconUsage(completedFiles)
  fixWebAccessibleResourceMatches(completedFiles)
  const errors = [
    ...validateManifestFileReferences(completedFiles),
    ...validateMessagePassing(completedFiles)
  ]
  return { errors, hasErrors: errors.length > 0 }
}
