/**
 * Pre-bundled webextension-polyfill is ESM with only `export default` (browser namespace).
 * `const { runtime } = require('webextension-polyfill')` leaves `runtime` as undefined →
 * minified `(void 0).onInstalled` in background scripts.
 */

export const WEBEXTENSION_POLYFILL_NAMED_EXPORTS = [
  'runtime',
  'storage',
  'tabs',
  'windows',
  'action',
  'alarms',
  'bookmarks',
  'browserAction',
  'browsingData',
  'commands',
  'contextMenus',
  'cookies',
  'devtools',
  'downloads',
  'extension',
  'history',
  'i18n',
  'identity',
  'idle',
  'management',
  'notifications',
  'pageAction',
  'permissions',
  'scripting',
  'sessions',
  'topSites',
  'webNavigation',
  'webRequest',
  'declarativeNetRequest',
]

/**
 * @param {string} source - contents of pre-bundled webextension-polyfill vendor file
 * @returns {string}
 */
export function augmentWebextensionPolyfillVendorModule(source) {
  const m = source.match(/export default (\w+)\(\)\s*;/)
  if (!m) {
    console.warn(
      '[esbuild-service] webextension-polyfill vendor: could not find `export default <fn>();` — named exports not added'
    )
    return source
  }
  const factory = m[1]
  const lines = [
    `const __chromieBrowser = ${factory}();`,
    'export default __chromieBrowser;',
    ...WEBEXTENSION_POLYFILL_NAMED_EXPORTS.map(
      (name) => `export const ${name} = __chromieBrowser.${name};`
    ),
  ]
  return source.replace(/export default (\w+)\(\)\s*;/, `${lines.join('\n')}\n`)
}
