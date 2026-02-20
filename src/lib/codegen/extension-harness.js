/**
 * Extension Harness
 * Static structural validation after task-graph generation.
 * Catches manifest file reference errors and message-passing mismatches
 * that ESLint cannot detect.
 */

import { analyzeManifest } from '@/lib/codegen/file-analysis/analyzers/manifest-analyzer.js'

const GLOB_PATTERN = /[*?[\]]/

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
 * @param {Map<string,string>} completedFiles
 * @returns {{ errors: HarnessError[], hasErrors: boolean }}
 */
export function runExtensionHarness(completedFiles) {
  const errors = [
    ...validateManifestFileReferences(completedFiles),
    ...validateMessagePassing(completedFiles)
  ]
  return { errors, hasErrors: errors.length > 0 }
}
