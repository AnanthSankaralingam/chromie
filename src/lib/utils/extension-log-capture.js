// Extension console log capture utilities for Hyperbrowser test sessions
import * as logStorage from './console-log-storage.js'

/**
 * Process and filter log messages - only store CHROMIE-tagged logs
 */
export function processLogMessage(text, type, context, sessionId) {
  // Extract CHROMIE prefix: [CHROMIE:COMPONENT] message
  const chromiePrefixMatch = text.match(/^\[CHROMIE:([^\]]+)\](.*)/)

  if (!chromiePrefixMatch) {
    // Skip non-CHROMIE logs
    return
  }

  const component = chromiePrefixMatch[1]
  const cleanText = chromiePrefixMatch[2].trim()

  const logEntry = {
    type: type,
    text: cleanText,
    prefix: 'CHROMIE:' + component,
    component: component,
    isChromieLog: true,
    context: context,
    timestamp: new Date().toISOString()
  }

  logStorage.addLog(sessionId, logEntry)
}

/**
 * Attach console listeners to a page (popup, sidepanel, etc.)
 */
export async function attachToPage(targetPage, targetUrl, sessionId) {
  if (!targetPage) return

  // Determine context type from URL
  let contextType = 'extension'
  if (targetUrl.includes('/popup.html')) {
    contextType = 'popup'
  } else if (targetUrl.includes('/sidepanel.html')) {
    contextType = 'sidepanel'
  }

  // Attach console listener
  targetPage.on('console', (msg) => {
    processLogMessage(msg.text(), msg.type(), contextType, sessionId)
  })

  // Attach error listener
  targetPage.on('pageerror', (error) => {
    processLogMessage(error.message, 'error', contextType, sessionId)
  })

  // Set up CDP for additional console capture
  try {
    const pageClient = await targetPage.target().createCDPSession()
    await pageClient.send('Runtime.enable')

    pageClient.on('Runtime.consoleAPICalled', (params) => {
      const { type, args } = params
      if (args && args.length > 0) {
        const text = args.map(arg => {
          if (arg.value !== undefined) return String(arg.value)
          if (arg.description) return arg.description
          return String(arg.type)
        }).join(' ')
        processLogMessage(text, type, contextType, sessionId)
      }
    })
  } catch (cdpError) {
    console.warn(`[extension-log-capture] Could not attach CDP to ${contextType}:`, cdpError.message)
  }
}

/**
 * Attach to a service worker target using CDP
 */
export async function attachToServiceWorker(target, targetUrl, sessionId, activeCDPSessions) {
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
          if (arg.value !== undefined) return String(arg.value)
          if (arg.description) return arg.description
          return String(arg.type)
        }).join(' ')
        processLogMessage(text, type, 'background', sessionId)
      }
    })

    // Listen for exceptions
    workerClient.on('Runtime.exceptionThrown', (params) => {
      const errorText = params.exceptionDetails.exception?.description ||
                       params.exceptionDetails.text ||
                       'Unknown error'
      processLogMessage(errorText, 'error', 'background', sessionId)
    })

    // Test injection to verify CDP is working
    await workerClient.send('Runtime.evaluate', {
      expression: `console.log('[CHROMIE-TEST] CDP attached to service worker'); 'CDP_TEST_EXECUTED';`,
      returnByValue: true
    }).catch(() => {})

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
 */
export async function setupLogCapture(browser, page, sessionId) {
  const activeCDPSessions = new Map()

  // Attach console listeners to existing workers
  const existingWorkers = await page.workers()
  for (const worker of existingWorkers) {
    const workerUrl = worker.url()
    if (workerUrl.startsWith('chrome-extension://')) {
      worker.on('console', (msg) => {
        processLogMessage(msg.text(), msg.type(), 'background', sessionId)
      })
      worker.on('error', (error) => {
        processLogMessage(error.message, 'error', 'background', sessionId)
      })
    }
  }

  // Listen for new workers
  browser.on('workercreated', (worker) => {
    const workerUrl = worker.url()
    if (workerUrl.startsWith('chrome-extension://')) {
      worker.on('console', (msg) => {
        processLogMessage(msg.text(), msg.type(), 'background', sessionId)
      })
      worker.on('error', (error) => {
        processLogMessage(error.message, 'error', 'background', sessionId)
      })
    }
  })

  // Listen for new targets (sidepanels, popups, etc.)
  browser.on('targetcreated', async (target) => {
    const targetType = target.type()
    const targetUrl = target.url()

    const isExtensionTarget = targetUrl.startsWith('chrome-extension://')
    const couldBeSidepanel = targetType === 'page' || targetType === 'other'

    if (isExtensionTarget || (couldBeSidepanel && targetType !== 'browser')) {
      try {
        // Wait for target to be ready
        await new Promise(resolve => setTimeout(resolve, 200))
        const updatedUrl = target.url()

        const targetPage = await target.page().catch(() => null)

        if (targetPage) {
          await attachToPage(targetPage, updatedUrl || targetUrl, sessionId)
        } else if (isExtensionTarget) {
          await attachToServiceWorker(target, updatedUrl || targetUrl, sessionId, activeCDPSessions)
        }
      } catch (error) {
        console.error(`[extension-log-capture] Failed to attach to target:`, error.message)
      }
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

  return activeCDPSessions
}
