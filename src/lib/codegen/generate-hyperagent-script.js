import { llmService } from "../services/llm-service"
import { DEFAULT_MODEL } from "../constants"

/**
 * Generates a BrowserUse test script for a Chrome extension
 * This is a separate LLM call that happens after the main code generation
 * @param {Object} params - Parameters for test script generation
 * @param {string} params.projectId - Project identifier
 * @param {string} params.projectName - Name of the extension
 * @param {string} params.userPrompt - Original user request
 * @param {Array} params.extensionFiles - Generated extension files
 * @returns {Promise<string>} The generated BrowserUse test script
 */
export async function generateHyperAgentTestScript({ projectId, projectName, userPrompt, extensionFiles }) {
  console.log("🤖 Generating BrowserUse test script with separate LLM call...")

  // Build context from extension files
  const filesContext = extensionFiles.map(file => {
    return `File: ${file.file_path}\n\`\`\`\n${file.content}\n\`\`\``
  }).join("\n\n")

  // Determine frontend type from files
  let frontendType = "generic"
  if (extensionFiles.some(f => f.file_path === "sidepanel.js" || f.file_path === "sidepanel.html")) {
    frontendType = "side_panel"
  } else if (extensionFiles.some(f => f.file_path === "popup.js" || f.file_path === "popup.html")) {
    frontendType = "popup"
  } else if (extensionFiles.some(f => f.file_path === "content.js")) {
    frontendType = "overlay/content"
  }

  // Create the prompt for BrowserUse script generation
  const prompt = `TASK: Generate executable JavaScript code for BrowserUse testing.

IMPORTANT: You must output ONLY code. Do not think, plan, or explain. Start immediately with the import statement.

You are a Chrome extension testing expert. Your task is to generate an executable BrowserUse automation script that tests the following Chrome extension.

<extension_info>
Extension Name: ${projectName}
Frontend Type: ${frontendType}
Original User Request: ${userPrompt}
</extension_info>

<extension_files>
${filesContext}
</extension_files>

<browseruse_script_format>
CRITICAL: Generate a complete, executable BrowserUse script in this EXACT format:

\`\`\`javascript
import { Hyperbrowser } from "@hyperbrowser/sdk";

// BrowserUse test script for: ${projectName}
// Extension type: ${frontendType}

const runTest = async (sessionId) => {
  const client = new Hyperbrowser({
    apiKey: process.env.HYPERBROWSER_API_KEY,
  });

  console.log('🧪 Starting BrowserUse test for ${projectName}');

  try {
    // Test 1: [First test description]
    const result1 = await client.agents.browserUse.startAndWait({
      task: "[Detailed task description for first test]",
      sessionId: sessionId,
      keepBrowserOpen: true,
    });
    console.log('✅ Test 1 completed:', result1.data?.finalResult);

    // Test 2: [Second test description if needed]
    const result2 = await client.agents.browserUse.startAndWait({
      task: "[Detailed task description for second test]",
      sessionId: sessionId,
      keepBrowserOpen: true,
    });
    console.log('✅ Test 2 completed:', result2.data?.finalResult);

    console.log('🎉 All tests completed successfully');
    return { success: true, results: [result1, result2] };
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    return { success: false, error: err.message };
  }
};

// Export for use by test runner
export { runTest };

// Allow standalone execution
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error('Usage: node hyperagent_test_script.js <sessionId>');
    process.exit(1);
  }
  runTest(sessionId).catch(console.error);
}
\`\`\`
</browseruse_script_format>

<test_task_requirements>
Create specific task descriptions based on the extension type, following BrowserUse best practices:

1. BE SPECIFIC & NUMBERED:
   - Break tasks into clear, numbered steps
   - Avoid open-ended instructions like "test the extension"
   - Example: "1. Go to https://example.com 2. Click button 'Submit' 3. Verify text 'Success'"

2. NAME ACTIONS DIRECTLY:
   - Explicitly state which actions to use
   - "Use click action on..."
   - "Use type action to enter..."
   - "Use scroll action to..."
   - "Use extract action to get..."

3. HANDLE INTERACTION PROBLEMS:
   - Include keyboard navigation fallbacks
   - Example: "If click fails, use send_keys with 'Tab' and 'Enter'"

4. ERROR RECOVERY:
   - Define what to do if a step fails
   - Example: "If page doesn't load, refresh and wait 5 seconds"

FOR SIDE PANEL EXTENSIONS:
- Task: "1. Navigate to [relevant URL] 2. Click extension icon to open side panel 3. Use click action on [specific controls] 4. Verify [expected behavior]"

FOR POPUP EXTENSIONS:
- Task: "1. Navigate to [relevant URL] 2. Click extension icon to open popup 3. Use click action on [specific buttons] 4. Verify [expected behavior]"

FOR OVERLAY/CONTENT SCRIPT EXTENSIONS:
- Task: "1. Navigate to [specific target website] 2. Verify overlay appears 3. Use click action on [specific elements] 4. Verify [expected outcomes]"

FOR GENERIC EXTENSIONS:
- Task: "1. Navigate to [relevant URL] 2. Interact with extension via [specific method] 3. Perform [specific actions] 4. Verify [expected results]"
</test_task_requirements>

<customization_guidelines>
Based on the extension files provided:
1. Analyze the manifest.json to understand permissions and features
2. Analyze HTML files to identify specific UI elements and IDs
3. Analyze JS files to understand the extension's functionality
4. Create task descriptions that test the ACTUAL features implemented
5. Use SPECIFIC element selectors from the HTML/JS files
6. Test the EXACT functionality from the user's original request

Example for a note-taking extension:
- "1. Navigate to chrome://newtab/ 2. Open side panel 3. Use click action on button with ID 'add-note-btn' 4. Use type action to enter 'Test note' into textarea '#note-input' 5. Use click action on 'Save' button 6. Verify note appears in list 7. If save fails, use send_keys 'Enter' to submit"
</customization_guidelines>

Generate the complete executable script now.

CRITICAL INSTRUCTIONS:
- Do NOT include any thinking, planning, or explanations
- Do NOT use markdown code blocks
- Return ONLY raw JavaScript code
- Start directly with: import { Hyperbrowser } from "@hyperbrowser/sdk";
- Do NOT prefix with any text, comments about your process, or planning
- The very first line of your response MUST be the import statement`

  try {
    // Use the LLM service to generate the test script
    const response = await llmService.createResponse({
      provider: 'gemini',
      model: DEFAULT_MODEL,
      input: prompt,
      store: false,
      temperature: 0.3, // Very low temperature for code generation only
      max_output_tokens: 15000,
      session_id: projectId,
      thinkingConfig: { includeThoughts: false } // Disable thinking for cleaner code output
    })

    let testScript = response?.output_text || ''

    console.log("🔍 Raw LLM response length:", testScript.length)
    console.log("🔍 First 200 chars:", testScript.substring(0, 200))

    // Check if response contains thinking/planning text
    if (testScript.includes('**') || testScript.toLowerCase().includes('okay, so') || testScript.toLowerCase().includes("i've got")) {
      console.warn("⚠️ LLM returned thinking instead of code, attempting to extract code...")

      // Try to find code block
      const codeBlockMatch = testScript.match(/```(?:javascript)?\s*([\s\S]*?)\s*```/)
      if (codeBlockMatch) {
        testScript = codeBlockMatch[1].trim()
        console.log("✅ Extracted code from markdown block")
      } else {
        // Try to find import statement and take everything after it
        const importIndex = testScript.indexOf('import { Hyperbrowser }')
        if (importIndex !== -1) {
          testScript = testScript.substring(importIndex).trim()
          console.log("✅ Extracted code starting from import statement")
        } else {
          console.error("❌ Could not extract valid code from response")
          throw new Error("LLM generated thinking instead of code")
        }
      }
    }

    // Extract code from markdown if still present
    if (testScript.includes('```javascript')) {
      const match = testScript.match(/```javascript\s*([\s\S]*?)\s*```/)
      if (match) {
        testScript = match[1].trim()
      }
    } else if (testScript.includes('```')) {
      const match = testScript.match(/```\s*([\s\S]*?)\s*```/)
      if (match) {
        testScript = match[1].trim()
      }
    }

    // Final validation - ensure it starts with import
    testScript = testScript.trim()
    if (!testScript.startsWith('import { Hyperbrowser }')) {
      console.error("❌ Generated script doesn't start with import statement")
      throw new Error("Invalid script format generated")
    }

    console.log("✅ BrowserUse test script generated successfully")
    return testScript

  } catch (error) {
    console.error("❌ Error generating BrowserUse test script:", error)

    // Return a fallback test script if generation fails
    return `import { Hyperbrowser } from "@hyperbrowser/sdk";

// BrowserUse test script for: ${projectName} (Fallback)
// Extension type: ${frontendType}

const runTest = async (sessionId) => {
  const client = new Hyperbrowser({
    apiKey: process.env.HYPERBROWSER_API_KEY,
  });

  console.log('🧪 Starting BrowserUse test for ${projectName}');
  console.log('⚠️ Using fallback test template due to generation error');

  try {
    // Basic functionality test
    const result = await client.agents.browserUse.startAndWait({
      task: "Navigate to chrome://newtab/, click the Chrome extension icon for ${projectName}, interact with the extension interface, and verify it loads and responds correctly",
      sessionId: sessionId,
      keepBrowserOpen: true,
    });
    
    console.log('✅ Test completed:', result.data?.finalResult);
    return { success: true, results: [result] };
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    return { success: false, error: err.message };
  }
};

// Export for use by test runner
export { runTest };

// Allow standalone execution
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error('Usage: node hyperagent_test_script.js <sessionId>');
    process.exit(1);
  }
  runTest(sessionId).catch(console.error);
}`
  }
}

