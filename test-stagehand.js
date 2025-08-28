/**
 * Test file to demonstrate the functional Stagehand Bridge with Browserbase
 * This shows how the bridge implements the real Stagehand SDK from Browserbase
 */

import { stagehandBridge } from './src/lib/stagehand-bridge.js'

// Example extension configuration
const extensionConfig = {
  name: "Test Extension",
  description: "A test extension for Stagehand automation with Browserbase",
  version: "1.0.0",
  stagehandScript: `
    // Custom Stagehand automation script using real Browserbase SDK
    console.log("Running custom automation with Browserbase...")
    
    // Test natural language actions
    await page.act("click the submit button")
    await page.act("fill the email field with test@example.com")
    
    // Test data extraction
    const { price, title } = await page.extract({
      schema: { price: true, title: true }
    })
    
    // Test element observation
    const buttons = await page.observe("find all buttons")
    
    // Test agent automation
    const agent = stagehand.agent({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      options: {
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
    })
    await agent.execute("apply for this job")
  `
}

// Test the Stagehand Bridge with Browserbase
async function testStagehandBridge() {
  console.log("🔗 Testing Stagehand Bridge with Browserbase...")
  
  try {
    // Initialize Stagehand with Browserbase
    console.log("📋 Initializing Stagehand...")
    const initResult = await stagehandBridge.initializeStagehand({
      // Optional: Connect to existing session
      // sessionId: "existing-session-uuid-here",
      
      // Browserbase configuration
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
        userId: "test-extension-user",
        environment: "development"
      }
    })
    
    console.log("✅ Stagehand initialized successfully!")
    console.log("Session ID:", initResult.sessionId)
    console.log("Debug URL:", initResult.debugUrl)
    console.log("Session URL:", initResult.sessionUrl)
    
    // Test Stagehand API methods
    console.log("\n🎯 Testing Stagehand API methods...")
    
    // Test page.act()
    console.log("Testing page.act()...")
    const actResult = await stagehandBridge.executeAction("click the login button")
    console.log("Act result:", actResult)
    
    // Test page.extract()
    console.log("Testing page.extract()...")
    const extractResult = await stagehandBridge.extractData({
      schema: { price: true, title: true }
    })
    console.log("Extract result:", extractResult)
    
    // Test page.observe()
    console.log("Testing page.observe()...")
    const observeResult = await stagehandBridge.observeElements("find submit buttons")
    console.log("Observe result:", observeResult)
    
    // Test agent.execute()
    console.log("Testing agent.execute()...")
    const agentResult = await stagehandBridge.executeAgentTask("apply for this job", {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      options: {
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
    })
    console.log("Agent result:", agentResult)
    
    // Generate bridge code
    console.log("\n🔧 Generating bridge code...")
    const contentScriptBridge = stagehandBridge.generateContentScriptBridge(extensionConfig)
    const serviceWorkerBridge = stagehandBridge.generateServiceWorkerBridge(extensionConfig)
    const stagehandScript = stagehandBridge.generateStagehandScript(extensionConfig, extensionConfig.stagehandScript)
    
    console.log("✅ Generated Content Script Bridge (length:", contentScriptBridge.length, "chars)")
    console.log("✅ Generated Service Worker Bridge (length:", serviceWorkerBridge.length, "chars)")
    console.log("✅ Generated Stagehand Script (length:", stagehandScript.length, "chars)")
    
    // Close the session
    console.log("\n🔒 Closing Stagehand session...")
    await stagehandBridge.close()
    
    console.log("\n🎉 All tests completed successfully!")
    
  } catch (error) {
    console.error("❌ Test failed:", error)
    
    // Try to close session even if there was an error
    try {
      await stagehandBridge.close()
    } catch (closeError) {
      console.error("❌ Error closing session:", closeError)
    }
  }
}

// Environment variables setup guide
console.log("🔧 Stagehand Bridge Setup Guide:")
console.log("")
console.log("1. Set up environment variables:")
console.log("   export BROWSERBASE_API_KEY=your_api_key_here")
console.log("   export BROWSERBASE_PROJECT_ID=your_project_id_here")
console.log("   export ANTHROPIC_API_KEY=your_anthropic_key_here")
console.log("")
console.log("2. Get your API key and Project ID from the Browserbase Dashboard")
console.log("   https://www.browserbase.com/dashboard")
console.log("")
console.log("3. The bridge supports connecting to existing sessions:")
console.log("   await stagehandBridge.initializeStagehand({")
console.log("     sessionId: 'existing-session-uuid-here'")
console.log("   })")
console.log("")
console.log("🎯 Stagehand Bridge Features:")
console.log("✅ Real Browserbase Stagehand SDK integration")
console.log("✅ page.act() - Execute natural language actions")
console.log("✅ page.extract() - Pull structured data with schema")
console.log("✅ page.observe() - Discover available actions")
console.log("✅ agent.execute() - Automate entire workflows")
console.log("✅ Chrome extension integration")
console.log("✅ Session management and persistence")
console.log("✅ Error handling and logging")
console.log("")

// Run the test if environment variables are set
if (process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID) {
  console.log("🚀 Environment variables detected, running tests...")
  testStagehandBridge()
} else {
  console.log("⚠️  Environment variables not set. Please set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID to run tests.")
  console.log("")
  console.log("📝 Usage Examples:")
  console.log(`
// Initialize Stagehand with Browserbase
const stagehand = new Stagehand({
  env: "BROWSERBASE",
  browserbaseSessionID: "existing-session-uuid-here",
});

await stagehand.init();
console.log("Resumed Session ID:", stagehand.sessionId);

// Act - Execute natural language actions
await page.act("click the login button");

// Extract - Pull structured data
const { price } = await page.extract({
  schema: { price: true }
});

// Observe - Discover available actions
const actions = await page.observe("find submit buttons");

// Agent - Automate entire workflows
const agent = stagehand.agent({
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    options: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
})
await agent.execute("apply for this job");
`)
}
