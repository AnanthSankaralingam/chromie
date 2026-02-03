import { llmService } from "@/lib/services/llm-service"
import { DEFAULT_MODEL } from "@/lib/constants"

/**
 * Generates a BrowserUse test script for a Chrome extension
 * This is a separate LLM call that happens after the main code generation
 * Note: Chrome extension ID will be injected at runtime (not at generation time)
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

  // Parse manifest to get extension file paths
  const manifestFile = extensionFiles.find(f => f.file_path === "manifest.json")
  let manifest = {}
  let popupFile = null
  let optionsPage = null
  let sidePanelPath = null
  
  if (manifestFile?.content) {
    try {
      manifest = JSON.parse(manifestFile.content)
      popupFile = manifest?.action?.default_popup || manifest?.browser_action?.default_popup || null
      optionsPage = manifest?.options_page || manifest?.options_ui?.page || null
      sidePanelPath = manifest?.side_panel?.default_path || null
    } catch (e) {
      console.warn("⚠️  Could not parse manifest.json:", e.message)
    }
  }

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

CRITICAL RULE: Use {{POPUP_URL}}, {{OPTIONS_URL}}, or {{SIDEPANEL_URL}} placeholders to navigate to extension pages when:
1. Starting a test (navigate to initial page)
2. Switching to a different extension page (e.g., going to settings)

DO NOT navigate when interacting on the same page (clicking buttons, typing inputs, etc.) - just use click/type actions directly.
NEVER write "click extension icon" or "open popup" - use URL placeholders instead.

IMPORTANT: You must output ONLY code. Do not think, plan, or explain. Start immediately with the import statement.

You are a Chrome extension testing expert. Your task is to generate an executable BrowserUse automation script that tests the following Chrome extension.

<extension_info>
Extension Name: ${projectName}
Frontend Type: ${frontendType}
Original User Request: ${userPrompt}
${popupFile ? `Popup File: ${popupFile}` : ""}
${optionsPage ? `Options Page: ${optionsPage}` : ""}
${sidePanelPath ? `Side Panel: ${sidePanelPath}` : ""}
</extension_info>

<extension_files>
${filesContext}
</extension_files>

<accessing_extension_pages>
CRITICAL: Understand when to navigate vs when to interact on the same page.

The Chrome extension ID will be injected at runtime. Use these placeholder variables:
- {{POPUP_URL}} - will be replaced with chrome-extension://<id>/${popupFile || "popup.html"}
- {{OPTIONS_URL}} - will be replaced with chrome-extension://<id>/${optionsPage || "options.html"}
- {{SIDEPANEL_URL}} - will be replaced with chrome-extension://<id>/${sidePanelPath || "sidepanel.html"}

NAVIGATION RULES:
1. USE NAVIGATION when switching to a DIFFERENT extension page:
   - Going to settings/options page → Use "Navigate to {{OPTIONS_URL}}"
   - Starting a test on a specific page → Use "Navigate to {{POPUP_URL}}" or appropriate placeholder
   - Switching between popup and side panel → Use navigation

2. DO NOT NAVIGATE when interacting on the SAME page:
   - Clicking buttons, typing in inputs, submitting forms → Just use click/type actions
   - These interactions happen on the current page, no navigation needed
   - Only navigate if you need to switch to a different extension page

CORRECT Examples:
✅ "1. Navigate to {{POPUP_URL}} 2. Use type action to enter [text] into the [type of input] field 3. Use click action on the [purpose/label] button"
   (All on same page - navigate once, then interact)

✅ "1. Navigate to {{POPUP_URL}} 2. Use click action on the send button 3. Verify [expected result]"
   (Staying on same page - navigate once, then interact)

✅ "1. Navigate to {{POPUP_URL}} 2. Use click action on the settings button 3. Navigate to {{OPTIONS_URL}} 4. Use click action on the save button"
   (Switching pages - navigate to options page when going to settings)

✅ "1. Navigate to {{SIDEPANEL_URL}} 2. Use type action to enter text 3. Use click action on the submit button"
   (All on same page - navigate once, then interact)

WRONG Examples (DO NOT DO THIS):
❌ "1. Navigate to {{POPUP_URL}} 2. Navigate to {{POPUP_URL}} 3. Use click action on button"
   (Don't navigate twice to same page)

❌ "1. Navigate to {{POPUP_URL}} 2. Use click action on send button 3. Navigate to {{POPUP_URL}}"
   (Don't navigate again after clicking - stay on same page)

❌ "1. Navigate to chrome://newtab/ 2. Click the extension icon 3. Use type action..."
   (Don't click extension icon - use URL placeholders)

❌ "1. Open the popup 2. Use click action..."
   (Don't say "open popup" - use "Navigate to {{POPUP_URL}}")

ALWAYS start your task with "Navigate to {{POPUP_URL}}" (or the appropriate placeholder) when beginning a test.
Only use navigation again if you need to switch to a DIFFERENT extension page (like going to settings).
If the extension ID is not available at runtime, the system will automatically convert this to fallback instructions.
</accessing_extension_pages>

<browseruse_script_format>
CRITICAL: Generate a complete, executable BrowserUse script in this EXACT format with EXACTLY 3-5 tests maximum.

IMPORTANT: Each test must cover a DIFFERENT aspect of the extension. Do NOT create repetitive tests.

\`\`\`javascript
import { Hyperbrowser } from "@hyperbrowser/sdk";

// BrowserUse test script for: ${projectName}
// Extension type: ${frontendType}
// Note: Extension URLs will be injected at runtime

const runTest = async (sessionId) => {
  const client = new Hyperbrowser({
    apiKey: process.env.HYPERBROWSER_API_KEY,
  });

  console.log('🧪 Starting BrowserUse test for ${projectName}');

  try {
    // Test 1: Core functionality - [Describe main feature]
    const result1 = await client.agents.browserUse.startAndWait({
      task: "1. Navigate to {{${frontendType === "side_panel" ? "SIDEPANEL_URL" : frontendType === "popup" ? "POPUP_URL" : "POPUP_URL"}}} 2. [Test main feature with specific steps]",
      sessionId: sessionId,
      keepBrowserOpen: true,
    });
    console.log('✅ Test 1 completed:', result1.data?.finalResult);

    // Test 2: [Different aspect - edge cases, UI, or secondary feature]
    const result2 = await client.agents.browserUse.startAndWait({
      task: "1. Navigate to {{${frontendType === "side_panel" ? "SIDEPANEL_URL" : frontendType === "popup" ? "POPUP_URL" : "POPUP_URL"}}} 2. [Test different aspect with specific steps]",
      sessionId: sessionId,
      keepBrowserOpen: true,
    });
    console.log('✅ Test 2 completed:', result2.data?.finalResult);

    // Test 3: [Another different aspect - only include if extension has enough features]
    const result3 = await client.agents.browserUse.startAndWait({
      task: "1. Navigate to {{${frontendType === "side_panel" ? "SIDEPANEL_URL" : frontendType === "popup" ? "POPUP_URL" : "POPUP_URL"}}} 2. [Test another unique aspect]",
      sessionId: sessionId,
      keepBrowserOpen: true,
    });
    console.log('✅ Test 3 completed:', result3.data?.finalResult);

    // Only add Test 4 and Test 5 if the extension has enough distinct features to warrant them
    // If the extension is simple, stop at 3 tests

    console.log('🎉 All tests completed successfully');
    return { success: true, results: [result1, result2, result3] };
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
CRITICAL: Generate EXACTLY 3-5 test tasks maximum. Each test should cover a DIFFERENT aspect of the extension to avoid repetition.

Test Coverage Strategy:
- Test 1: Core functionality - Test the main feature/primary use case
- Test 2: Edge cases - Test boundary conditions, empty inputs, or error handling
- Test 3: UI interactions - Test different UI elements, navigation, or state changes
- Test 4 (if applicable): Integration - Test interaction with web pages or external services
- Test 5 (if applicable): Settings/Configuration - Test options page or configuration if it exists

AVOID REPETITION:
- Do NOT create multiple tests that test the same feature
- Each test should focus on a UNIQUE aspect of the extension
- If the extension has limited features, generate fewer tests (3 is sufficient)
- Prioritize quality and diversity over quantity

Create specific task descriptions based on the extension type, following BrowserUse best practices:

1. BE SPECIFIC & NUMBERED:
   - Break tasks into clear, numbered steps
   - Avoid open-ended instructions like "test the extension"
   - Example: "1. Go to https://example.com 2. Click button 'Submit' 3. Verify text 'Success'"

2. NAME ACTIONS DIRECTLY:
   - Explicitly state which actions to use
   - "Use click action on the [descriptive button/element name]"
   - "Use type action to enter [text] into the [descriptive input name]"
   - "Use scroll action to..."
   - "Use extract action to get..."
   - Describe elements by their purpose/label, not by technical selectors

3. HANDLE INTERACTION PROBLEMS:
   - Include keyboard navigation fallbacks
   - Example: "If click fails, use send_keys with 'Tab' and 'Enter'"

4. ERROR RECOVERY:
   - Define what to do if a step fails
   - Example: "If page doesn't load, refresh and wait 5 seconds"

5. NAVIGATION VS INTERACTION:
   - Use "Navigate to {{URL}}" ONLY when switching to a different extension page
   - Once on a page, use click/type actions directly - DO NOT navigate again unless switching pages
   - Example (same page): "1. Navigate to {{POPUP_URL}} 2. Use type action to enter text 3. Use click action on submit button"
   - Example (different page): "1. Navigate to {{POPUP_URL}} 2. Use click action on settings button 3. Navigate to {{OPTIONS_URL}} 4. Use click action on save button"
   - NEVER write "Click extension icon" or "Open popup" - use URL placeholders instead

FOR SIDE PANEL EXTENSIONS:
- CORRECT: "1. Navigate to {{SIDEPANEL_URL}} 2. Use click action on the [purpose-based button name] 3. Verify [expected behavior]"
- WRONG: "1. Click extension icon to open side panel 2. Use click action..."

FOR POPUP EXTENSIONS:
- CORRECT: "1. Navigate to {{POPUP_URL}} 2. Use click action on the [purpose-based button name] 3. Verify [expected behavior]"
- WRONG: "1. Click extension icon to open popup 2. Use click action..."

FOR OVERLAY/CONTENT SCRIPT EXTENSIONS:
- Task: "1. Navigate to [specific target website] 2. Verify overlay appears 3. Use click action on [specific elements] 4. Verify [expected outcomes]"

FOR GENERIC EXTENSIONS:
- Task: "1. Navigate to [relevant URL] 2. Interact with extension via [specific method] 3. Perform [specific actions] 4. Verify [expected results]"
</test_task_requirements>

<customization_guidelines>
Based on the extension files provided:
1. Analyze the manifest.json to understand permissions and features
2. Analyze HTML files to understand what buttons, inputs, and controls exist
3. Analyze JS files to understand the extension's functionality
4. Identify DISTINCT features/functionality - each test should cover a UNIQUE aspect
5. Create EXACTLY 3-5 test tasks that cover different aspects (core feature, edge cases, UI interactions, etc.)
6. Describe UI elements by their PURPOSE or VISIBLE LABEL, not by technical IDs or classes
7. Test the EXACT functionality from the user's original request
8. NAVIGATION RULES:
   - Use "Navigate to {{URL}}" when starting a test or switching to a different extension page
   - Once on a page, interact directly (click/type) without navigating again unless switching pages
   - Use URL placeholders ({{POPUP_URL}}, {{OPTIONS_URL}}, {{SIDEPANEL_URL}}) - NEVER "click extension icon"
   - Example: "1. Navigate to {{POPUP_URL}} 2. Use click action on send button" (stays on same page)
   - Example: "1. Navigate to {{POPUP_URL}} 2. Navigate to {{OPTIONS_URL}}" (switching pages)
9. If the extension has limited features, generate only 3 tests. Do NOT create repetitive tests.

When describing elements in tasks:
- Use descriptive names based on what the button/input DOES or what label/text it displays
- NEVER use technical selectors like IDs, classes, or CSS selectors
- Let BrowserUse's AI figure out the actual selectors
- Focus on the user-visible purpose/label of the element

For POPUP extensions:
- CORRECT (same page): "1. Navigate to {{POPUP_URL}} 2. Use type action to enter text into the [input type] field 3. Use click action on the [button purpose/label] button 4. Verify [expected result based on functionality]"
- CORRECT (switching pages): "1. Navigate to {{POPUP_URL}} 2. Use click action on settings button 3. Navigate to {{OPTIONS_URL}} 4. Use click action on save button"
- WRONG: "1. Navigate to chrome://newtab/ 2. Click extension icon 3. Use click action..."
- WRONG: "1. Navigate to {{POPUP_URL}} 2. Navigate to {{POPUP_URL}} 3. Use click action" (don't navigate twice to same page)
- WRONG: "1. Navigate to {{POPUP_URL}} 2. Use click action on button with ID 'xyz123'"

For SIDE PANEL extensions:
- CORRECT (same page): "1. Navigate to {{SIDEPANEL_URL}} 2. Use type action to enter text into the [input type] field 3. Use click action on the [button purpose/label] button 4. Verify [expected result]"
- CORRECT (switching pages): "1. Navigate to {{SIDEPANEL_URL}} 2. Use click action on options button 3. Navigate to {{OPTIONS_URL}} 4. Verify settings page loads"
- WRONG: "1. Open side panel 2. Use type action..."
- WRONG: "1. Navigate to {{SIDEPANEL_URL}} 2. Use click action on submit 3. Navigate to {{SIDEPANEL_URL}}" (don't navigate again after clicking - stay on same page)
- WRONG: "1. Navigate to {{SIDEPANEL_URL}} 2. Use click on element with class 'xyz-class'"
</customization_guidelines>

Generate the complete executable script now.

CRITICAL INSTRUCTIONS:
- Generate EXACTLY 3-5 test tasks maximum
- Each test must cover a DIFFERENT aspect (core feature, edge cases, UI, settings, etc.)
- Do NOT create repetitive tests that test the same feature
- If the extension is simple, generate only 3 tests
- Do NOT include any thinking, planning, or explanations
- Do NOT use markdown code blocks
- Return ONLY raw JavaScript code
- Start directly with: import { Hyperbrowser } from "@hyperbrowser/sdk";
- Do NOT prefix with any text, comments about your process, or planning
- The very first line of your response MUST be the import statement`

  try {
    // Use the LLM service to generate the test script
    const response = await llmService.createResponse({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
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
// Note: Extension URLs will be injected at runtime

const runTest = async (sessionId) => {
  const client = new Hyperbrowser({
    apiKey: process.env.HYPERBROWSER_API_KEY,
  });

  console.log('🧪 Starting BrowserUse test for ${projectName}');
  console.log('⚠️  Using fallback test template due to generation error');

  try {
    // Basic functionality test
    const result = await client.agents.browserUse.startAndWait({
      task: "1. Navigate to {{POPUP_URL}} 2. Verify the extension interface loads correctly 3. Interact with any visible buttons or inputs to test basic functionality",
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

