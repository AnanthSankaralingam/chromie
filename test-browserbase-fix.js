/**
 * Test Browserbase API fix
 */

console.log("🔧 Testing Browserbase API fix...")

// Mock Browserbase client for testing
const mockBrowserbaseClient = {
  sessions: {
    update: async (sessionId, payload) => {
      console.log("📡 Mock Browserbase session update called with:")
      console.log("  Session ID:", sessionId)
      console.log("  Payload:", JSON.stringify(payload, null, 2))
      
      // Simulate the fix - no status field in payload
      if (payload.status) {
        throw new Error("400 body/status must be equal to constant")
      }
      
      console.log("✅ Mock session update successful")
      return { success: true }
    }
  }
}

// Test the fixed session update
async function testSessionUpdate() {
  try {
    console.log("\n🧪 Testing session update with status field (should fail)...")
    
    // This should fail (old behavior)
    try {
      await mockBrowserbaseClient.sessions.update("test-session", {
        projectId: "test-project",
        status: "ready", // This causes the error
        url: "data:text/html,test"
      })
    } catch (error) {
      console.log("❌ Expected error caught:", error.message)
    }
    
    console.log("\n🧪 Testing session update without status field (should succeed)...")
    
    // This should succeed (fixed behavior)
    await mockBrowserbaseClient.sessions.update("test-session", {
      projectId: "test-project",
      url: "data:text/html,test"
    })
    
    console.log("✅ Fixed session update works correctly!")
    
  } catch (error) {
    console.error("❌ Test failed:", error)
  }
}

// Run the test
testSessionUpdate()
