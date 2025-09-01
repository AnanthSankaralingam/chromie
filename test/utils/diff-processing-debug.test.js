// Simple test file for debugging diff processing issues

const { DiffProcessingService } = require("../../src/lib/diff-processing-service.js");

async function runTests() {
  console.log("🧪 Running diff processing debug tests...\n");

  let service;

  function setupService() {
    service = new DiffProcessingService();
    // Set up initial files
    service.setFiles({
      "manifest.json": JSON.stringify({
        "manifest_version": 3,
        "name": "Test Extension",
        "version": "1.0"
      }, null, 2)
    });
  }

  // Test 1: Simple test with known working format
  console.log("📝 Test 1: Simple working diff");
  setupService();
  const diff1 = `--- a/test.js
+++ b/test.js
@@ -1 +1,2 @@
 console.log("hello");
+console.log("world");`;

  // Update the service with a simple JS file
  service.setFiles({
    "test.js": 'console.log("hello");'
  });

  const result1 = service.processFollowUpResponse({ responseText: diff1 });
  console.log("✅ Result:", JSON.stringify(result1, null, 2));
  console.log("✅ Test 1 passed:", result1.errors.length === 0 && result1.updated.includes("test.js"));
  console.log();

  // Test 2: Diff with markdown code blocks
  console.log("📝 Test 2: Diff with markdown code blocks");
  setupService();
  service.setFiles({
    "test.js": 'console.log("hello");'
  });

  const diff2 = `\`\`\`diff
--- a/test.js
+++ b/test.js
@@ -1 +1,2 @@
 console.log("hello");
+console.log("world");
\`\`\``;

  const result2 = service.processFollowUpResponse({ responseText: diff2 });
  console.log("✅ Result:", JSON.stringify(result2, null, 2));
  console.log("✅ Test 2 passed:", result2.errors.length === 0 && result2.updated.includes("test.js"));
  console.log();

  // Test 3: Test the logging improvements
  console.log("📝 Test 3: Logging improvements test");
  setupService();
  const diff3 = `--- a/test.js
+++ b/test.js
@@ -1 +1,2 @@
 console.log("hello");
+console.log("world");`;

  service.setFiles({
    "test.js": 'console.log("hello");'
  });

  console.log("🔍 Before processing - this should show detailed logging:");
  const result3 = service.processFollowUpResponse({ responseText: diff3 });
  console.log("✅ Test 3 passed:", result3.errors.length === 0);
  console.log();

  // Test 4: Invalid diff
  console.log("📝 Test 4: Invalid diff");
  setupService();
  const diff4 = "This is not a valid diff at all";

  const result4 = service.processFollowUpResponse({ responseText: diff4 });
  console.log("✅ Result:", JSON.stringify(result4, null, 2));

  // Check if we have an error (Error objects lose properties when JSON serialized)
  const hasError = result4.errors.length > 0;
  const errorIsError = result4.errors[0].error instanceof Error;
  const errorHasMessage = result4.errors[0].error.message;
  const errorContainsExpectedText = errorHasMessage && errorHasMessage.includes("No diff hunks detected");

  console.log("✅ Test 4 passed:", hasError && errorContainsExpectedText);
  console.log("   - Has error:", hasError);
  console.log("   - Error is Error object:", errorIsError);
  console.log("   - Error message:", errorHasMessage);
  console.log("   - Message contains expected text:", errorContainsExpectedText);
  console.log();

  // Test 5: Test the JSON detection logic
  console.log("📝 Test 5: JSON detection logic");
  setupService();

  // Simulate the exact response from the logs
  const jsonResponse = `\`\`\`json
{
  "explanation": "### Tab Note Keeper Extension\\n\\n**Overview:**\\nThe Tab Note Keeper extension allows users to take quick notes while browsing. Notes are stored persistently and can be associated with specific tabs for easy reference.\\n\\n**Features:**\\n- Open the popup to jot down notes.\\n- Notes are saved automatically and persist across sessions.\\n- Associate notes with specific tabs for context.\\n\\n**Testing Instructions:**\\n1. Install the extension in Chrome.\\n2. Click the extension icon in the toolbar to open the popup.\\n3. Use the popup to write and save notes.\\n4. Close and reopen the browser to ensure notes persist.\\n\\n**Icons:**\\n- The extension uses a note icon for visual representation in the popup.\\n\\n**Note:** Ensure you have the necessary permissions enabled in your Chrome settings to allow the extension to function correctly.",
  "manifest.json": {
    "manifest_version": 3,
    "name": "Tab Note Keeper",
    "version": "1.0",
    "description": "Allows users to quickly jot down notes while browsing, with persistent storage and optional tab association.",
    "permissions": ["activeTab", "storage"],
    "background": {
      "service_worker": "background.js"
    },
    "action": {
      "default_popup": "popup.html"
    },
    "icons": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
\`\`\``;

  const hasDiffHeadersCheck = jsonResponse.includes('--- a/') && jsonResponse.includes('+++ b/');
  const hasHunkHeadersCheck = jsonResponse.includes('@@ ');
  const startsWithJson = jsonResponse.trim().startsWith('{') || jsonResponse.trim().startsWith('```json');
  const hasJsonStructure = jsonResponse.includes('"manifest.json"') || jsonResponse.includes('"explanation"');
  const isJsonResponse = (startsWithJson || hasJsonStructure) && !hasDiffHeadersCheck && !hasHunkHeadersCheck;

  console.log("✅ JSON Detection Test Results:");
  console.log("   - hasDiffHeadersCheck:", hasDiffHeadersCheck);
  console.log("   - hasHunkHeadersCheck:", hasHunkHeadersCheck);
  console.log("   - startsWithJson:", startsWithJson);
  console.log("   - hasJsonStructure:", hasJsonStructure);
  console.log("   - SHOULD BE JSON RESPONSE:", isJsonResponse);

  console.log("✅ Test 5 passed:", isJsonResponse);
  console.log();

  console.log("🎉 All tests completed!");
}

runTests().catch(console.error);
