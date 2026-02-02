// Extension console log capture utilities for Hyperbrowser test sessions
import * as logStorage from './console-log-storage.js'
import { isLogCaptureActive, markLogCaptureActive } from './puppeteer-connection-cache.js'

/**
 * Determine the log source from context and target info
 */
function determineLogSource(context, targetInfo = {}) {
  const { targetUrl } = targetInfo

  // Use context first, then fall back to URL-based detection
  if (context === 'background') return 'extension:background'
  if (context === 'popup') return 'extension:popup'
  if (context === 'sidepanel') return 'extension:sidepanel'
  if (context === 'newtab') return 'extension:newtab'
  if (context === 'options') return 'extension:options'

  // If no specific context, check URL
  if (targetUrl?.startsWith('chrome-extension://')) {
    if (targetUrl.includes('/popup.html')) return 'extension:popup'
    if (targetUrl.includes('/sidepanel.html')) return 'extension:sidepanel'
    if (targetUrl.includes('/newtab.html')) return 'extension:newtab'
    if (targetUrl.includes('/options.html')) return 'extension:options'
    return 'extension:content'
  }

  return 'browser:page'
}

/**
 * Process and store ALL log messages (no filtering)
 * CHROMIE prefix is still extracted for styling purposes, but does NOT filter logs
 */
export function processLogMessage(text, type, context, sessionId, targetInfo = {}) {
  // Determine source from context and target info
  const source = determineLogSource(context, targetInfo)

  // Extract CHROMIE prefix if present (for styling only, NOT filtering)
  const chromiePrefixMatch = text.match(/^\[CHROMIE:([^\]]+)\](.*)/)

  const logEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: type,
    text: chromiePrefixMatch ? chromiePrefixMatch[2].trim() : text,
    source: source,
    isChromieLog: !!chromiePrefixMatch,
    component: chromiePrefixMatch ? chromiePrefixMatch[1] : null,
    context: context,
    timestamp: new Date().toISOString()
  }

  // Store ALL logs, not just CHROMIE-tagged ones
  logStorage.addLog(sessionId, logEntry)
}

/**
 * Attach console listeners to a page (popup, sidepanel, etc.)
 * Uses CDP only to avoid duplicate logs from both Puppeteer events and CDP.
 */
export async function attachToPage(targetPage, targetUrl, sessionId) {
  if (!targetPage) return

  // Determine context type from URL
  let contextType = 'extension'
  if (targetUrl.includes('/popup.html')) {
    contextType = 'popup'
  } else if (targetUrl.includes('/sidepanel.html')) {
    contextType = 'sidepanel'
  } else if (targetUrl.includes('/newtab.html')) {
    contextType = 'newtab'
  } else if (targetUrl.includes('/options.html')) {
    contextType = 'options'
  }

  const targetInfo = { targetUrl }

  // Use CDP only for console capture to avoid duplicates
  // (Puppeteer's page.on('console') and CDP both capture the same logs)
  try {
    const pageClient = await targetPage.target().createCDPSession()
    await pageClient.send('Runtime.enable')

    pageClient.on('Runtime.consoleAPICalled', (params) => {
      const { type, args } = params
      if (args && args.length > 0) {
        const text = args.map(arg => {
          // Handle different CDP RemoteObject types
          if (arg.type === 'string') {
            return arg.value || ''
          }
          if (arg.value !== undefined) {
            return String(arg.value)
          }
          if (arg.description) {
            return arg.description
          }
          if (arg.unserializableValue) {
            return arg.unserializableValue
          }
          return String(arg.type || '')
        }).join(' ')
        processLogMessage(text, type, contextType, sessionId, targetInfo)
      }
    })

    // Capture exceptions via CDP
    pageClient.on('Runtime.exceptionThrown', (params) => {
      const errorText = params.exceptionDetails.exception?.description ||
                       params.exceptionDetails.text ||
                       'Unknown error'
      processLogMessage(errorText, 'error', contextType, sessionId, targetInfo)
    })
  } catch (cdpError) {
    console.warn(`[extension-log-capture] Could not attach CDP to ${contextType}:`, cdpError.message)
  }
}

/**
 * Attach to a service worker target using CDP
 */
export async function attachToServiceWorker(target, targetUrl, sessionId, activeCDPSessions) {
  const targetInfo = { targetUrl }

  try {
    const workerClient = await target.createCDPSession()
    const sessionKey = `sw-${target._targetId || targetUrl}`
    activeCDPSessions.set(sessionKey, workerClient)

    await workerClient.send('Runtime.enable')
    await workerClient.send('Log.enable')

    // Listen for console logs via CDP
    workerClient.on('Runtime.consoleAPICalled', (params) => {
      const { type, args } = params
      if (args && args.length > 0) {
        const text = args.map(arg => {
          // Handle different CDP RemoteObject types
          if (arg.type === 'string') {
            return arg.value || ''
          }
          if (arg.value !== undefined) {
            return String(arg.value)
          }
          if (arg.description) {
            return arg.description
          }
          if (arg.unserializableValue) {
            return arg.unserializableValue
          }
          return String(arg.type || '')
        }).join(' ')
        processLogMessage(text, type, 'background', sessionId, targetInfo)
      }
    })

    // Listen for exceptions
    workerClient.on('Runtime.exceptionThrown', (params) => {
      const errorText = params.exceptionDetails.exception?.description ||
                       params.exceptionDetails.text ||
                       'Unknown error'
      processLogMessage(errorText, 'error', 'background', sessionId, targetInfo)
    })

    workerClient.on('disconnected', () => {
      activeCDPSessions.delete(sessionKey)
    })

    return workerClient
  } catch (error) {
    console.error(`[extension-log-capture] Failed to attach to service worker:`, error.message)
    throw error
  }
}

/**
 * Set up console log capture for extension targets
 * This function is idempotent - calling it multiple times for the same session is safe.
 */
export async function setupLogCapture(browser, page, sessionId) {
  // Idempotency check - only set up log capture once per session
  if (isLogCaptureActive(sessionId)) {
    console.log('[extension-log-capture] Log capture already active for session', sessionId)
    return new Map() // Return empty map since capture is already set up
  }

  console.log('[extension-log-capture] Setting up log capture for session', sessionId)

  const activeCDPSessions = new Map()

  // Attach console listeners to existing workers
  const existingWorkers = await page.workers()
  for (const worker of existingWorkers) {
    const workerUrl = worker.url()
    if (workerUrl.startsWith('chrome-extension://')) {
      const targetInfo = { targetUrl: workerUrl }
      worker.on('console', (msg) => {
        processLogMessage(msg.text(), msg.type(), 'background', sessionId, targetInfo)
      })
      worker.on('error', (error) => {
        processLogMessage(error.message, 'error', 'background', sessionId, targetInfo)
      })
    }
  }

  // Listen for new workers
  browser.on('workercreated', (worker) => {
    const workerUrl = worker.url()
    if (workerUrl.startsWith('chrome-extension://')) {
      const targetInfo = { targetUrl: workerUrl }
      worker.on('console', (msg) => {
        processLogMessage(msg.text(), msg.type(), 'background', sessionId, targetInfo)
      })
      worker.on('error', (error) => {
        processLogMessage(error.message, 'error', 'background', sessionId, targetInfo)
      })
    }
  })

  // Listen for new targets (sidepanels, popups, etc.)
  browser.on('targetcreated', async (target) => {
    try {
      // Wait for target to be ready and URL to stabilize
      await new Promise(resolve => setTimeout(resolve, 200))

      const targetType = target.type()
      const targetUrl = target.url()

      // Only attach to extension targets
      const isExtensionTarget = targetUrl.startsWith('chrome-extension://')

      if (!isExtensionTarget) {
        return // Skip non-extension targets (regular web pages)
      }

      const targetPage = await target.page().catch(() => null)

      if (targetPage) {
        await attachToPage(targetPage, targetUrl, sessionId)
      } else {
        await attachToServiceWorker(target, targetUrl, sessionId, activeCDPSessions)
      }
    } catch (error) {
      console.error(`[extension-log-capture] Failed to attach to target:`, error.message)
    }
  })

  // Attach to existing extension targets
  const existingTargets = browser.targets()
  for (const target of existingTargets) {
    const targetUrl = target.url()
    if (targetUrl.startsWith('chrome-extension://')) {
      try {
        const targetPage = await target.page().catch(() => null)
        if (targetPage) {
          await attachToPage(targetPage, targetUrl, sessionId)
        } else {
          await attachToServiceWorker(target, targetUrl, sessionId, activeCDPSessions)
        }
      } catch (error) {
        console.error(`[extension-log-capture] Failed to attach to existing target:`, error.message)
      }
    }
  }

  // Mark log capture as active for this session to prevent duplicate setup
  markLogCaptureActive(sessionId)
  console.log('[extension-log-capture] Log capture setup complete for session', sessionId)

  return activeCDPSessions
}
