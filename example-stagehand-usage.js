/**
 * Example: Using Stagehand Bridge in a Chrome Extension
 * This demonstrates how to integrate the real Browserbase Stagehand SDK
 * into a Chrome extension for automated testing
 */

import { StagehandBridge } from './src/lib/stagehand-bridge.js'

// Example: Extension service worker using Stagehand
class ExtensionServiceWorker {
  constructor() {
    this.stagehandBridge = new StagehandBridge()
    this.isInitialized = false
  }

  async initialize() {
    try {
      // Initialize Stagehand with Browserbase
      const result = await this.stagehandBridge.initializeStagehand({
        // Connect to existing session if available
        sessionId: await this.getStoredSessionId(),
        
        // Browserbase configuration
        proxies: false,
        region: "us-west-2",
        timeout: 3600,
        keepAlive: true,
        browserSettings: {
          viewport: { width: 1920, height: 1080 },
          blockAds: true,
          solveCaptchas: false,
          recordSession: true
        },
        userMetadata: {
          userId: "chrome-extension-user",
          environment: "production"
        }
      })

      // Store session ID for future use
      await this.storeSessionId(result.sessionId)
      this.isInitialized = true

      console.log("✅ Extension initialized with Stagehand")
      console.log("Session ID:", result.sessionId)
      console.log("Debug URL:", result.debugUrl)

      return result
    } catch (error) {
      console.error("❌ Failed to initialize Stagehand:", error)
      throw error
    }
  }

  // Handle messages from content scripts
  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.cmd) {
        case "INITIALIZE_STAGEHAND":
          if (!this.isInitialized) {
            await this.initialize()
          }
          sendResponse({ success: true, data: { initialized: true } })
          break

        case "EXECUTE_STAGEHAND_ACTION":
          const actionResult = await this.stagehandBridge.executeAction(request.payload.action)
          sendResponse({ success: true, data: actionResult })
          break

        case "EXECUTE_STAGEHAND_EXTRACT":
          const extractResult = await this.stagehandBridge.extractData(request.payload.schema)
          sendResponse({ success: true, data: extractResult })
          break

        case "EXECUTE_STAGEHAND_OBSERVE":
          const observeResult = await this.stagehandBridge.observeElements(request.payload.query)
          sendResponse({ success: true, data: observeResult })
          break

        case "EXECUTE_STAGEHAND_AGENT":
          const agentResult = await this.stagehandBridge.executeAgentTask(
            request.payload.task,
            request.payload.config
          )
          sendResponse({ success: true, data: agentResult })
          break

        case "GET_SESSION_INFO":
          sendResponse({
            success: true,
            data: {
              sessionId: this.stagehandBridge.sessionId,
              isInitialized: this.isInitialized
            }
          })
          break

        default:
          sendResponse({ success: false, error: "Unknown command" })
      }
    } catch (error) {
      console.error("❌ Error handling message:", error)
      sendResponse({ success: false, error: error.message })
    }
  }

  // Storage helpers
  async getStoredSessionId() {
    const result = await chrome.storage.local.get(['stagehandSessionId'])
    return result.stagehandSessionId
  }

  async storeSessionId(sessionId) {
    await chrome.storage.local.set({ stagehandSessionId: sessionId })
  }

  async cleanup() {
    if (this.isInitialized) {
      await this.stagehandBridge.close()
      this.isInitialized = false
    }
  }
}

// Example: Content script using Stagehand
class ExtensionContentScript {
  constructor() {
    this.initializeStagehandAPI()
  }

  initializeStagehandAPI() {
    // Create Stagehand API interface
    window.stagehand = {
      page: {
        // Act - Execute natural language actions
        act: async (action) => {
          console.log("🎯 STAGEHAND ACT:", action)
          return await this.sendToServiceWorker("EXECUTE_STAGEHAND_ACTION", { action })
        },

        // Extract - Pull structured data
        extract: async (schema) => {
          console.log("📊 STAGEHAND EXTRACT:", schema)
          return await this.sendToServiceWorker("EXECUTE_STAGEHAND_EXTRACT", { schema })
        },

        // Observe - Discover available actions
        observe: async (query) => {
          console.log("👁️ STAGEHAND OBSERVE:", query)
          return await this.sendToServiceWorker("EXECUTE_STAGEHAND_OBSERVE", { query })
        }
      },

      // Agent - Automate entire workflows
      agent: (config) => ({
        execute: async (task) => {
          console.log("🤖 STAGEHAND AGENT:", task, config)
          return await this.sendToServiceWorker("EXECUTE_STAGEHAND_AGENT", { task, config })
        }
      })
    }

    console.log("🔗 Stagehand API initialized in content script")
  }

  async sendToServiceWorker(cmd, payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ cmd, payload }, (response) => {
        if (response && response.success) {
          resolve(response.data)
        } else {
          reject(new Error(response?.error || "Service worker error"))
        }
      })
    })
  }

  // Example: Run automated test
  async runAutomatedTest() {
    try {
      console.log("🤖 Starting automated test...")

      // Initialize Stagehand if needed
      await this.sendToServiceWorker("INITIALIZE_STAGEHAND", {})

      // Test natural language actions
      await window.stagehand.page.act("click the login button")
      await window.stagehand.page.act("fill the email field with test@example.com")

      // Test data extraction
      const { price, title } = await window.stagehand.page.extract({
        schema: { price: true, title: true }
      })
      console.log("Extracted data:", { price, title })

      // Test element observation
      const buttons = await window.stagehand.page.observe("find submit buttons")
      console.log("Found buttons:", buttons)

      // Test agent automation
      const agent = window.stagehand.agent({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        options: {
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
      })
      await agent.execute("apply for this job")

      console.log("✅ Automated test completed successfully!")
    } catch (error) {
      console.error("❌ Automated test failed:", error)
    }
  }
}

// Example: Usage in manifest.json
const manifestExample = {
  manifest_version: 3,
  name: "Stagehand Extension",
  version: "1.0.0",
  description: "Chrome extension with Stagehand automation",
  
  permissions: [
    "storage",
    "activeTab",
    "scripting"
  ],

  background: {
    service_worker: "service-worker.js"
  },

  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content-script.js"],
      run_at: "document_end"
    }
  ],

  action: {
    default_popup: "popup.html"
  }
}

// Example: Service worker file (service-worker.js)
const serviceWorkerExample = `
import { StagehandBridge } from './src/lib/stagehand-bridge.js'

const extensionServiceWorker = new ExtensionServiceWorker()

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  extensionServiceWorker.handleMessage(request, sender, sendResponse)
  return true // Keep channel open for async response
})

// Cleanup on extension unload
chrome.runtime.onSuspend.addListener(() => {
  extensionServiceWorker.cleanup()
})
`

// Example: Content script file (content-script.js)
const contentScriptExample = `
import { ExtensionContentScript } from './example-stagehand-usage.js'

const contentScript = new ExtensionContentScript()

// Example: Run test when extension button is clicked
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "runTest") {
    contentScript.runAutomatedTest()
  }
})
`

console.log("📚 Stagehand Extension Integration Examples:")
console.log("")
console.log("1. Service Worker:", serviceWorkerExample)
console.log("")
console.log("2. Content Script:", contentScriptExample)
console.log("")
console.log("3. Manifest:", JSON.stringify(manifestExample, null, 2))
console.log("")
console.log("🚀 The Stagehand Bridge is now fully integrated with Browserbase!")
console.log("")
console.log("Key Features:")
console.log("✅ Real Browserbase Stagehand SDK integration")
console.log("✅ Session persistence across extension reloads")
console.log("✅ Natural language automation")
console.log("✅ Structured data extraction")
console.log("✅ Element observation and discovery")
console.log("✅ Agent-based workflow automation")
console.log("✅ Chrome extension compatibility")
console.log("✅ Error handling and logging")
