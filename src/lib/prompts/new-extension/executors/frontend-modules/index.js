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
 * Returns the frontend-specific prompt module for a given frontend type.
 * Falls back to popup for unknown types.
 * @param {string} frontendType
 * @returns {string}
 */
export function getFrontendModule(frontendType) {
  return FRONTEND_MODULE_MAP[frontendType] || POPUP_FRONTEND_MODULE
}
