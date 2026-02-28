import { POPUP_FRONTEND_MODULE } from './popup.js'
import { SIDEPANEL_FRONTEND_MODULE } from './sidepanel.js'
import { OVERLAY_FRONTEND_MODULE } from './overlay.js'
import { NEW_TAB_FRONTEND_MODULE } from './new-tab.js'
import { CONTENT_INJECTION_FRONTEND_MODULE } from './content-injection.js'

const FRONTEND_MODULE_MAP = {
  popup: POPUP_FRONTEND_MODULE,
  sidepanel: SIDEPANEL_FRONTEND_MODULE,
  side_panel: SIDEPANEL_FRONTEND_MODULE,
  overlay: OVERLAY_FRONTEND_MODULE,
  new_tab: NEW_TAB_FRONTEND_MODULE,
  newtab: NEW_TAB_FRONTEND_MODULE,
  content_script_ui: CONTENT_INJECTION_FRONTEND_MODULE,
  content_injection: CONTENT_INJECTION_FRONTEND_MODULE,
}

/**
 * File-name patterns that map to each frontend module.
 * Only files whose base name matches these patterns receive that module.
 */
const FILE_TO_MODULE = [
  { pattern: /^popup\.(js|html)$/i, module: POPUP_FRONTEND_MODULE },
  { pattern: /^sidepanel\.(js|html)$/i, module: SIDEPANEL_FRONTEND_MODULE },
  { pattern: /^overlay\.(js|html)$/i, module: OVERLAY_FRONTEND_MODULE },
  { pattern: /^new[-_]?tab\.(js|html)$/i, module: NEW_TAB_FRONTEND_MODULE },
  { pattern: /^content\.js$/i, module: CONTENT_INJECTION_FRONTEND_MODULE },
]

/**
 * Returns the frontend-specific prompt module for a given file name.
 * Only attaches a module when the file is actually named for that module
 * (e.g. popup.js gets popup module, content.js gets content-injection module).
 * Returns empty string for files that don't match any module (e.g. manifest.json, styles.css).
 * @param {string} fileName - e.g. 'popup.js', 'content.js'
 * @returns {string}
 */
export function getFrontendModuleForFile(fileName) {
  const baseName = fileName.split('/').pop() || fileName
  const entry = FILE_TO_MODULE.find(({ pattern }) => pattern.test(baseName))
  return entry ? entry.module : ''
}

/**
 * Returns the frontend-specific prompt module for a given frontend type.
 * Falls back to popup for unknown types.
 * @deprecated Prefer getFrontendModuleForFile(fileName) so modules are attached only to matching files.
 * @param {string} frontendType
 * @returns {string}
 */
export function getFrontendModule(frontendType) {
  return FRONTEND_MODULE_MAP[frontendType] || POPUP_FRONTEND_MODULE
}
