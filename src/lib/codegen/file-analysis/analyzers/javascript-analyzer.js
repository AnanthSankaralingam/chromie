/**
 * JavaScript file analyzer
 * Extracts imports, exports, functions, classes, event handlers, and Chrome API usage
 */

import { inferChromeContext } from '../utils/file-utils.js'
import {
  ES6_IMPORT,
  ES6_IMPORT_SIDE_EFFECT,
  DYNAMIC_IMPORT,
  COMMONJS_REQUIRE,
  NAMED_EXPORT,
  DEFAULT_EXPORT,
  EXPORT_FROM,
  FUNCTION_DECLARATION,
  ARROW_FUNCTION,
  CLASS_DECLARATION,
  CHROME_API,
  CHROME_LISTENER,
  CHROME_MESSAGE,
  CHROME_TABS_MESSAGE,
  DOM_EVENT_LISTENER,
  DOCUMENT_READY
} from '../utils/regex-patterns.js'
import { classifyImport } from '@/lib/build/package-extractor.js'

/**
 * Analyzes a JavaScript file
 * @param {string} content - File content
 * @param {string} path - File path
 * @returns {Object} Analysis result
 */
export function analyzeJavaScript(content, path) {
  const result = {
    imports: extractImports(content),
    exports: extractExports(content),
    functions: extractFunctions(content),
    classes: extractClasses(content),
    eventHandlers: extractEventHandlers(content),
    messageNames: extractMessageNames(content),
    chromeContext: inferChromeContext(path)
  }

  return result
}

/**
 * Extracts import statements
 */
function extractImports(content) {
  const imports = {
    es6: [],
    dynamic: [],
    chromeApis: [],
    sideEffect: []
  }

  // ES6 imports
  let match
  const es6Pattern = new RegExp(ES6_IMPORT.source, 'g')
  while ((match = es6Pattern.exec(content)) !== null) {
    imports.es6.push(match[1])
  }

  // Side-effect imports
  const sideEffectPattern = new RegExp(ES6_IMPORT_SIDE_EFFECT.source, 'g')
  while ((match = sideEffectPattern.exec(content)) !== null) {
    // Avoid duplicates with regular imports
    if (!imports.es6.includes(match[1])) {
      imports.sideEffect.push(match[1])
    }
  }

  // Dynamic imports
  const dynamicPattern = new RegExp(DYNAMIC_IMPORT.source, 'g')
  while ((match = dynamicPattern.exec(content)) !== null) {
    imports.dynamic.push(match[1])
  }

  // CommonJS require
  const requirePattern = new RegExp(COMMONJS_REQUIRE.source, 'g')
  while ((match = requirePattern.exec(content)) !== null) {
    const specifier = match[1]
    if (!imports.es6.includes(specifier) && !imports.dynamic.includes(specifier)) {
      imports.dynamic.push(specifier)
    }
  }

  // Chrome APIs used (extracted separately)
  imports.chromeApis = extractChromeApis(content)

  // Classify and collect npm package imports
  const allSpecifiers = [...imports.es6, ...imports.sideEffect, ...imports.dynamic]
  const npmSet = new Set()
  for (const specifier of allSpecifiers) {
    if (classifyImport(specifier) === 'npm_package') {
      // Strip subpaths: lodash/get → lodash, @scope/pkg/sub → @scope/pkg
      const root = specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0]
      npmSet.add(root)
    }
  }
  imports.npmPackages = Array.from(npmSet)

  return imports
}

/**
 * Extracts Chrome API usage
 */
function extractChromeApis(content) {
  const apis = new Set()
  let match

  const chromePattern = new RegExp(CHROME_API.source, 'g')
  while ((match = chromePattern.exec(content)) !== null) {
    const namespace = match[1]
    const method = match[2]
    if (method) {
      apis.add(`${namespace}.${method}`)
    } else {
      apis.add(namespace)
    }
  }

  return Array.from(apis)
}

/**
 * Extracts export statements
 */
function extractExports(content) {
  const exports = {
    named: [],
    default: null,
    reExports: []
  }

  let match

  // Named exports
  const namedPattern = new RegExp(NAMED_EXPORT.source, 'g')
  while ((match = namedPattern.exec(content)) !== null) {
    exports.named.push(match[1])
  }

  // Default export
  const defaultPattern = new RegExp(DEFAULT_EXPORT.source, 'g')
  if ((match = defaultPattern.exec(content)) !== null) {
    exports.default = match[1] || 'anonymous'
  }

  // Re-exports from other modules
  const reExportPattern = new RegExp(EXPORT_FROM.source, 'g')
  while ((match = reExportPattern.exec(content)) !== null) {
    exports.reExports.push(match[1])
  }

  return exports
}

/**
 * Extracts function declarations
 */
function extractFunctions(content) {
  const functions = []
  const lines = content.split('\n')

  let match

  // Function declarations
  const funcPattern = new RegExp(FUNCTION_DECLARATION.source, 'g')
  while ((match = funcPattern.exec(content)) !== null) {
    const name = match[1]
    const params = match[2].split(',').map(p => p.trim()).filter(Boolean)

    functions.push({
      name,
      params
    })
  }

  // Arrow functions assigned to variables
  const arrowPattern = new RegExp(ARROW_FUNCTION.source, 'g')
  while ((match = arrowPattern.exec(content)) !== null) {
    const name = match[1]

    functions.push({
      name,
      params: []  // Harder to extract reliably with regex
    })
  }

  return functions
}

/**
 * Extracts class declarations
 */
function extractClasses(content) {
  const classes = []
  let match

  const classPattern = new RegExp(CLASS_DECLARATION.source, 'g')
  while ((match = classPattern.exec(content)) !== null) {
    const name = match[1]
    const extends_ = match[2] || null

    classes.push({
      name,
      extends: extends_
    })
  }

  return classes
}

/**
 * Extracts event handlers (Chrome and DOM)
 */
function extractEventHandlers(content) {
  const handlers = {
    chrome: [],
    dom: [],
    messageHandlers: {
      senders: [],
      receivers: []
    }
  }

  let match

  // Chrome listeners
  const listenerPattern = new RegExp(CHROME_LISTENER.source, 'g')
  while ((match = listenerPattern.exec(content)) !== null) {
    const api = `${match[1]}.${match[2]}.addListener`
    if (!handlers.chrome.includes(api)) {
      handlers.chrome.push(api)
    }
  }

  // DOM event listeners
  const domPattern = new RegExp(DOM_EVENT_LISTENER.source, 'g')
  while ((match = domPattern.exec(content)) !== null) {
    if (!handlers.dom.includes(match[1])) {
      handlers.dom.push(match[1])
    }
  }

  // Document ready patterns
  const readyPattern = new RegExp(DOCUMENT_READY.source, 'g')
  if (readyPattern.test(content)) {
    if (!handlers.dom.includes('DOMContentLoaded')) {
      handlers.dom.push('DOMContentLoaded')
    }
  }

  // Message passing - deduplicate senders/receivers
  const messagePattern = new RegExp(CHROME_MESSAGE.source, 'g')
  while ((match = messagePattern.exec(content)) !== null) {
    const method = match[1]
    if (method === 'sendMessage' && !handlers.messageHandlers.senders.includes('runtime.sendMessage')) {
      handlers.messageHandlers.senders.push('runtime.sendMessage')
    } else if (method === 'onMessage' && !handlers.messageHandlers.receivers.includes('runtime.onMessage')) {
      handlers.messageHandlers.receivers.push('runtime.onMessage')
    } else if (method === 'connect' && !handlers.messageHandlers.senders.includes('runtime.connect')) {
      handlers.messageHandlers.senders.push('runtime.connect')
    } else if (method === 'onConnect' && !handlers.messageHandlers.receivers.includes('runtime.onConnect')) {
      handlers.messageHandlers.receivers.push('runtime.onConnect')
    }
  }

  // tabs.sendMessage
  const tabsMessagePattern = new RegExp(CHROME_TABS_MESSAGE.source, 'g')
  if (tabsMessagePattern.test(content) && !handlers.messageHandlers.senders.includes('tabs.sendMessage')) {
    handlers.messageHandlers.senders.push('tabs.sendMessage')
  }

  return handlers
}

/**
 * Extracts message names this file receives and sends.
 *
 * Received patterns detected:
 *   message !== 'get-status'           (direct equality/inequality comparison)
 *   message.type === 'GET_STATUS'      (property comparison)
 *   switch (message.type) { case 'X': (switch case with brace-counting)
 *
 * Sent patterns detected:
 *   chrome.runtime.sendMessage('x')                      (string literal)
 *   chrome.runtime.sendMessage({ type: 'x' })            (object with type/action)
 *   chrome.tabs.sendMessage(tabId, 'x')                  (string literal)
 *   chrome.tabs.sendMessage(tabId, { type: 'x' })        (object with type/action)
 */
function extractMessageNames(content) {
  const received = new Set()
  const sent = new Set()
  let match

  // ── Received ──────────────────────────────────────────────────────────────

  // Direct: message === 'x' or message !== 'x'
  const directPattern = /\bmessage\s*[!=]=+\s*['"]([^'"]+)['"]/g
  while ((match = directPattern.exec(content)) !== null) {
    received.add(match[1])
  }

  // Property: (message|request|msg|req).type/action/command/name === 'x'
  const propPattern = /\b(?:message|request|msg|req|data)\.(?:type|action|command|name|kind|event)\s*[!=]=+\s*['"]([^'"]+)['"]/g
  while ((match = propPattern.exec(content)) !== null) {
    received.add(match[1])
  }

  // Switch: switch (message[.prop]) { case 'x': ... }
  // Uses brace-counting to reliably extract only cases inside the switch block.
  const switchPattern = /switch\s*\(\s*(?:message|request|msg|req|data|e)(?:\.(?:type|action|command|name|kind|event))?\s*\)/g
  while ((match = switchPattern.exec(content)) !== null) {
    const braceStart = content.indexOf('{', match.index + match[0].length)
    if (braceStart === -1) continue

    let depth = 0
    let blockEnd = braceStart
    for (let i = braceStart; i < content.length; i++) {
      if (content[i] === '{') depth++
      else if (content[i] === '}') {
        depth--
        if (depth === 0) { blockEnd = i; break }
      }
    }

    const block = content.slice(braceStart, blockEnd + 1)
    const casePattern = /\bcase\s+['"]([^'"]+)['"]\s*:/g
    let caseMatch
    while ((caseMatch = casePattern.exec(block)) !== null) {
      received.add(caseMatch[1])
    }
  }

  // ── Sent ──────────────────────────────────────────────────────────────────

  // chrome.runtime.sendMessage('x')
  const runtimeStringPattern = /chrome\.runtime\.sendMessage\(\s*['"]([^'"]+)['"]/g
  while ((match = runtimeStringPattern.exec(content)) !== null) {
    sent.add(match[1])
  }

  // chrome.tabs.sendMessage(tabId, 'x')
  const tabsStringPattern = /chrome\.tabs\.sendMessage\([^,)]+,\s*['"]([^'"]+)['"]/g
  while ((match = tabsStringPattern.exec(content)) !== null) {
    sent.add(match[1])
  }

  // chrome.runtime.sendMessage({ type/action/command: 'x' })
  // chrome.tabs.sendMessage(tabId, { type/action/command: 'x' })
  // Use [\s\S]{0,300}? to tolerate nested parens inside the argument object.
  const sendObjectPattern = /chrome\.(?:runtime|tabs)\.sendMessage\([\s\S]{0,300}?(?:type|action|command|name|kind)\s*:\s*['"]([^'"]+)['"]/g
  while ((match = sendObjectPattern.exec(content)) !== null) {
    sent.add(match[1])
  }

  return {
    received: Array.from(received),
    sent: Array.from(sent)
  }
}
