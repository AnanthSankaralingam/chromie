/**
 * Standalone Node.js test for Stagehand Bridge
 * This will actually run and show console output in the terminal
 */

// Mock environment variables for testing
process.env.BROWSERBASE_API_KEY = "test-api-key"
process.env.BROWSERBASE_PROJECT_ID = "test-project-id"
process.env.ANTHROPIC_API_KEY = "test-anthropic-key"

// Mock the Stagehand import since we're testing locally
const mockStagehand = {
  init: async () => ({
    sessionId: "test-session-123",
    debugUrl: "https://test-debug-url.com",
    sessionUrl: "https://test-session-url.com"
  }),
  page: {
    act: async (action) => ({ success: true, action }),
    extract: async (schema) => ({ success: true, data: { price: 99.99, title: "Test Product" } }),
    observe: async (query) => ({ success: true, elements: [{ type: "button", text: "Submit" }] })
  },
  agent: (config) => ({
    execute: async (task) => ({ success: true, result: task })
  }),
  close: async () => ({ success: true })
}

// Mock the import
const originalImport = global.import
global.import = async (module) => {
  if (module === "@browserbasehq/stagehand") {
    return { Stagehand: class Stagehand {
      constructor(config) {
        this.config = config
      }
      async init() {
        return mockStagehand.init()
      }
      get page() {
        return mockStagehand.page
      }
      agent(config) {
        return mockStagehand.agent(config)
      }
      async close() {
        return mockStagehand.close()
      }
    }}
  }
  return originalImport(module)
}

// Import our bridge
import { StagehandBridge } from './src/lib/stagehand-bridge.js'

async function testStagehandBridge() {
  console.log("🚀 Starting Stagehand Bridge Test...")
  console.log("This will show console output in your terminal!")
  
  const bridge = new StagehandBridge()
  
  try {
    // Test initialization
    console.log("\n📋 Testing initialization...")
    const initResult = await bridge.initializeStagehand({
      proxies: false,
      region: "us-west-2",
      timeout: 3600,
      keepAlive: false,
      browserSettings: {
        viewport: { width: 1920, height: 1080 },
        blockAds: true,
        solveCaptchas: false,
        recordSession: true
      },
      userMetadata: {
        userId: "test-user",
        environment: "development"
      }
    })
    
    console.log("✅ Initialization result:", initResult)
    
    // Test API methods
    console.log("\n🎯 Testing API methods...")
    
    const actResult = await bridge.executeAction("click the login button")
    console.log("Act result:", actResult)
    
    const extractResult = await bridge.extractData({ schema: { price: true, title: true } })
    console.log("Extract result:", extractResult)
    
    const observeResult = await bridge.observeElements("find submit buttons")
    console.log("Observe result:", observeResult)
    
    const agentResult = await bridge.executeAgentTask("apply for this job", {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514"
    })
    console.log("Agent result:", agentResult)
    
    // Test bridge code generation
    console.log("\n🔧 Testing bridge code generation...")
    const extensionConfig = {
      name: "Test Extension",
      description: "Test extension for Stagehand",
      version: "1.0.0"
    }
    
    const contentScriptBridge = bridge.generateContentScriptBridge(extensionConfig)
    const serviceWorkerBridge = bridge.generateServiceWorkerBridge(extensionConfig)
    const stagehandScript = bridge.generateStagehandScript(extensionConfig, "console.log('test')")
    
    console.log("✅ Generated Content Script Bridge (length:", contentScriptBridge.length, "chars)")
    console.log("✅ Generated Service Worker Bridge (length:", serviceWorkerBridge.length, "chars)")
    console.log("✅ Generated Stagehand Script (length:", stagehandScript.length, "chars)")
    
    // Test cleanup
    console.log("\n🔒 Testing cleanup...")
    await bridge.close()
    console.log("✅ Cleanup completed")
    
    console.log("\n🎉 All tests completed successfully!")
    
  } catch (error) {
    console.error("❌ Test failed:", error)
  }
}

// Run the test
console.log("🔗 STAGEHAND: Starting terminal test...")
testStagehandBridge()
