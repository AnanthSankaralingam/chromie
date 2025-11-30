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
CRITICAL: Generate a complete, executable BrowserUse script in this EXACT format.
Replace the extension name and test tasks with the actual values for THIS specific extension.
DO NOT use template literals like \${variable} - use the actual extension name directly.

\`\`\`javascript
import { Hyperbrowser } from "@hyperbrowser/sdk";

// BrowserUse test script for: ${projectName}
// Extension type: ${frontendType}

// Helper to connect to browser session via Puppeteer (puppeteer-core)
async function getBrowserContext(sessionId, apiKey) {
  const puppeteer = await import('puppeteer-core');
  const client = new Hyperbrowser({ apiKey });
  const sessionInfo = await client.sessions.get(sessionId);
  const wsEndpoint = sessionInfo.wsEndpoint || sessionInfo.connectUrl;
  
  if (!wsEndpoint) {
    throw new Error(\`Missing wsEndpoint for session \${sessionId}\`);
  }
  
  // Connect using Puppeteer
  const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  
  return { browser, page };
}

// Automatically pin the extension to toolbar using Puppeteer
async function pinExtension(sessionId, apiKey) {
  console.log('[PIN] Starting extension pinning with Puppeteer...');
  
  let browser = null;
  let page = null;
  
  try {
    const context = await getBrowserContext(sessionId, apiKey);
    browser = context.browser;
    page = context.page;
    
    // Navigate to chrome://extensions using Puppeteer
    const currentUrl = page.url();
    if (!currentUrl.includes('chrome://extensions')) {
      await page.goto('chrome://extensions', { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
    }
    
    // Wait for extensions manager element using Puppeteer waitForSelector
    await page.waitForSelector('extensions-manager', { timeout: 10000 });
    
    // Wait for shadow DOM to be ready using Puppeteer waitForFunction
    await page.waitForFunction(() => {
      const manager = document.querySelector('extensions-manager');
      return manager && manager.shadowRoot !== null;
    }, { timeout: 10000 });
    
    // Small delay for stability
    await page.waitForTimeout(3000);
    
    // Click Details button through shadow DOM using Puppeteer evaluate
    const detailsClicked = await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      if (!manager?.shadowRoot) throw new Error('extensions-manager not found');
      
      let items = manager.shadowRoot.querySelectorAll('extensions-item');
      if (items.length === 0) {
        const itemList = manager.shadowRoot.querySelector('extensions-item-list');
        if (itemList?.shadowRoot) {
          items = itemList.shadowRoot.querySelectorAll('extensions-item');
        }
      }
      
      if (items.length === 0) throw new Error('No extension items found');
      
      const firstItem = items[0];
      let detailsButton = firstItem.shadowRoot?.querySelector('#detailsButton');
      
      if (!detailsButton) {
        const buttons = (firstItem.shadowRoot || firstItem).querySelectorAll('cr-button, button');
        for (const btn of buttons) {
          if (btn.textContent?.toLowerCase().includes('details')) {
            detailsButton = btn;
            break;
          }
        }
      }
      
      if (!detailsButton) throw new Error('Details button not found');
      detailsButton.click();
      return true;
    });
    
    if (!detailsClicked) throw new Error('Failed to click Details');
    
    await page.waitForTimeout(2000);
    
    // Toggle Pin to Toolbar using Puppeteer evaluate
    const pinResult = await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      if (!manager?.shadowRoot) throw new Error('manager not found');
      
      const detailView = manager.shadowRoot.querySelector('extensions-detail-view');
      if (!detailView) throw new Error('detail view not found');
      
      let pinToggle = (detailView.shadowRoot || detailView).querySelector('#pin-to-toolbar');
      
      if (!pinToggle) {
        const toggleRows = (detailView.shadowRoot || detailView).querySelectorAll('extensions-toggle-row');
        for (const row of toggleRows) {
          if (row.textContent?.toLowerCase().includes('pin')) {
            pinToggle = row;
            break;
          }
        }
      }
      
      if (!pinToggle) throw new Error('Pin toggle not found');
      
      // Check if already pinned
      let isPinned = false;
      const toggle = pinToggle.shadowRoot?.querySelector('cr-toggle');
      if (toggle) {
        isPinned = toggle.checked || toggle.hasAttribute('checked');
      }
      
      if (isPinned) return { alreadyPinned: true };
      
      pinToggle.click();
      if (toggle) toggle.click();
      
      return { clicked: true };
    });
    
    await page.waitForTimeout(2000);
    
    console.log('[PIN] ✅ Extension pinned successfully');
    return { success: true, ...pinResult };
    
  } catch (err) {
    const isSessionClosed = err.message?.includes('Target closed') || 
                           err.message?.includes('Session closed') ||
                           err.message?.includes('Protocol error');
    
    if (isSessionClosed) {
      console.log('[PIN] ℹ️  Session closed during pinning');
      return { success: true, sessionClosed: true };
    }
    
    console.error('[PIN] ❌ Pinning failed:', err.message);
    return { success: false, error: err.message };
  } finally {
    // Don't close browser - let session continue
  }
}

const runTest = async (sessionId) => {
  const client = new Hyperbrowser({
    apiKey: process.env.HYPERBROWSER_API_KEY,
  });

  console.log('🧪 Starting BrowserUse test for ${projectName}');

  try {
    // Step 1: Pin the extension to toolbar
    console.log('📌 Pinning extension to toolbar...');
    const pinResult = await pinExtension(sessionId, process.env.HYPERBROWSER_API_KEY);
    
    if (pinResult.success) {
      console.log('✅ Extension pinned successfully');
    } else {
      console.warn('⚠️  Extension pinning had issues, continuing anyway:', pinResult.error);
    }

    // Step 2: Test extension functionality with BrowserUse
    const result1 = await client.agents.browserUse.startAndWait({
      task: "STEP 1: Navigate to https://example.com. STEP 2: Click the pinned extension icon in the toolbar. STEP 3: Test the main feature. STEP 4: Verify it works correctly.",
      sessionId: sessionId,
      keepBrowserOpen: true,
    });
    console.log('✅ Test 1 completed:', result1.data?.finalResult);

    // Add more tests if needed based on the extension's features
    // Each test should be a separate startAndWait call

    console.log('🎉 All tests completed successfully');
    return { success: true, pinResult, results: [result1] };
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    return { success: false, error: err.message };
  }
};

// Export for use by test runner
export { runTest };

// Allow standalone execution
if (import.meta.url === 'file://' + process.argv[1]) {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error('Usage: node hyperagent_test_script.js <sessionId>');
    process.exit(1);
  }
  runTest(sessionId).catch(console.error);
}
\`\`\`

IMPORTANT RULES FOR THE GENERATED CODE:
1. Use the ACTUAL extension name in comments and console.log statements
2. Use the ACTUAL extension type in comments
3. DO NOT use template literals like \${url} or \${variable} in the task strings
4. DO NOT leave placeholder text like [URL] or [description]
5. Use ONLY concrete strings like "https://example.com" and actual element names
6. All strings must be complete and valid JavaScript - no undefined variables
</browseruse_script_format>

<test_task_requirements>
Create specific task descriptions based on the extension type, following BrowserUse best practices:

IMPORTANT: The extension will be automatically pinned to the toolbar using Playwright before BrowserUse tests run.
Your tasks should focus on TESTING the extension functionality, NOT on pinning it.

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
- Task: "STEP 1: Navigate to [relevant CAPTCHA-free URL like https://example.com]. STEP 2: Click the pinned extension icon in the browser toolbar to open side panel. STEP 3: Use click action on [specific controls]. STEP 4: Verify [expected behavior]"

FOR POPUP EXTENSIONS:
- Task: "STEP 1: Navigate to [relevant CAPTCHA-free URL like https://example.com]. STEP 2: Click the pinned extension icon in the toolbar to open popup. STEP 3: Use click action on [specific buttons]. STEP 4: Verify [expected behavior]"

FOR OVERLAY/CONTENT SCRIPT EXTENSIONS:
- Task: "STEP 1: Navigate to [specific target CAPTCHA-free website like https://example.com or https://httpbin.org]. STEP 2: Verify overlay appears automatically. STEP 3: Use click action on [specific elements]. STEP 4: Verify [expected outcomes]"

FOR GENERIC EXTENSIONS:
- Task: "STEP 1: Navigate to [relevant CAPTCHA-free URL like https://example.com]. STEP 2: Click the pinned extension icon in the toolbar. STEP 3: Interact with extension and perform [specific actions]. STEP 4: Verify [expected results]"

CRITICAL REQUIREMENTS:
1. **DO NOT include pinning steps**: Extension pinning is handled automatically before tests run
2. **Use CAPTCHA-free sites**: 
   - ✅ GOOD: https://example.com, https://httpbin.org, chrome://newtab, https://jsonplaceholder.typicode.com
   - ❌ AVOID: Google sites, social media, sites requiring login, sites with bot detection
3. **Be specific**: Use actual element names, IDs, and URLs from the extension code
</test_task_requirements>

<customization_guidelines>
Based on the extension files provided:
1. Analyze the manifest.json to understand permissions and features
2. Analyze HTML files to identify specific UI elements and IDs
3. Analyze JS files to understand the extension's functionality
4. Create task descriptions that test the ACTUAL features implemented
5. Use SPECIFIC element selectors from the HTML/JS files
6. Test the EXACT functionality from the user's original request

CRITICAL RULES FOR TASK STRINGS:
- DO NOT include steps to pin the extension (this is automated with Playwright before tests run)
- NEVER use placeholders like [url], [URL], [relevant URL], [description], etc.
- NEVER use template literals with variables like \${url} or \${extensionName}
- ALWAYS use REAL, COMPLETE URLs like https://example.com, https://httpbin.org (avoid CAPTCHA sites)
- ALWAYS use REAL, SPECIFIC element names from the actual HTML files
- NEVER leave incomplete sentences like "Navigate to." or "Click on."
- Each task MUST be a complete, executable instruction

Example for a note-taking side panel extension:
- "STEP 1: Navigate to https://example.com. STEP 2: Click the pinned extension icon in the toolbar to open side panel. STEP 3: Use click action on button with ID 'add-note-btn'. STEP 4: Use type action to enter 'Test note' into textarea '#note-input'. STEP 5: Use click action on 'Save' button. STEP 6: Verify note appears in the notes list."
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

    // Check for common undefined variable patterns that would cause runtime errors
    const problematicPatterns = [
      /\$\{url\}/g,
      /\$\{URL\}/g,
      /\$\{extensionName\}/g,
      /\$\{projectName\}/g,
      /\$\{description\}/g,
      /\$\{variable\}/g
    ]

    let hasProblematicPattern = false
    problematicPatterns.forEach(pattern => {
      if (pattern.test(testScript)) {
        console.error("❌ Generated script contains undefined variable pattern:", pattern)
        hasProblematicPattern = true
      }
    })

    if (hasProblematicPattern) {
      console.error("❌ Script contains template literal variables that would be undefined at runtime")
      throw new Error("Generated script has undefined variables - using fallback")
    }

    console.log("✅ BrowserUse test script generated successfully")
    return testScript

  } catch (error) {
    console.error("❌ Error generating BrowserUse test script:", error)

    // Return a fallback test script if generation fails
    // Note: projectName and frontendType are properly interpolated into the template
    return `import { Hyperbrowser } from "@hyperbrowser/sdk";

// BrowserUse test script for: ${projectName} (Fallback)
// Extension type: ${frontendType}

// Helper to connect to browser session via Puppeteer (puppeteer-core)
async function getBrowserContext(sessionId, apiKey) {
  const puppeteer = await import('puppeteer-core');
  const client = new Hyperbrowser({ apiKey });
  const sessionInfo = await client.sessions.get(sessionId);
  const wsEndpoint = sessionInfo.wsEndpoint || sessionInfo.connectUrl;
  
  if (!wsEndpoint) {
    throw new Error(\`Missing wsEndpoint for session \${sessionId}\`);
  }
  
  // Connect using Puppeteer
  const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  
  return { browser, page };
}

// Automatically pin the extension to toolbar using Puppeteer
async function pinExtension(sessionId, apiKey) {
  console.log('[PIN] Starting extension pinning with Puppeteer...');
  
  let browser = null;
  let page = null;
  
  try {
    const context = await getBrowserContext(sessionId, apiKey);
    browser = context.browser;
    page = context.page;
    
    // Navigate to chrome://extensions using Puppeteer
    const currentUrl = page.url();
    if (!currentUrl.includes('chrome://extensions')) {
      await page.goto('chrome://extensions', { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
    }
    
    // Wait for extensions manager element using Puppeteer waitForSelector
    await page.waitForSelector('extensions-manager', { timeout: 10000 });
    
    // Wait for shadow DOM to be ready using Puppeteer waitForFunction
    await page.waitForFunction(() => {
      const manager = document.querySelector('extensions-manager');
      return manager && manager.shadowRoot !== null;
    }, { timeout: 10000 });
    
    // Small delay for stability
    await page.waitForTimeout(3000);
    
    // Click Details button through shadow DOM using Puppeteer evaluate
    const detailsClicked = await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      if (!manager?.shadowRoot) throw new Error('extensions-manager not found');
      
      let items = manager.shadowRoot.querySelectorAll('extensions-item');
      if (items.length === 0) {
        const itemList = manager.shadowRoot.querySelector('extensions-item-list');
        if (itemList?.shadowRoot) {
          items = itemList.shadowRoot.querySelectorAll('extensions-item');
        }
      }
      
      if (items.length === 0) throw new Error('No extension items found');
      
      const firstItem = items[0];
      let detailsButton = firstItem.shadowRoot?.querySelector('#detailsButton');
      
      if (!detailsButton) {
        const buttons = (firstItem.shadowRoot || firstItem).querySelectorAll('cr-button, button');
        for (const btn of buttons) {
          if (btn.textContent?.toLowerCase().includes('details')) {
            detailsButton = btn;
            break;
          }
        }
      }
      
      if (!detailsButton) throw new Error('Details button not found');
      detailsButton.click();
      return true;
    });
    
    if (!detailsClicked) throw new Error('Failed to click Details');
    
    await page.waitForTimeout(2000);
    
    // Toggle Pin to Toolbar using Puppeteer evaluate
    const pinResult = await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      if (!manager?.shadowRoot) throw new Error('manager not found');
      
      const detailView = manager.shadowRoot.querySelector('extensions-detail-view');
      if (!detailView) throw new Error('detail view not found');
      
      let pinToggle = (detailView.shadowRoot || detailView).querySelector('#pin-to-toolbar');
      
      if (!pinToggle) {
        const toggleRows = (detailView.shadowRoot || detailView).querySelectorAll('extensions-toggle-row');
        for (const row of toggleRows) {
          if (row.textContent?.toLowerCase().includes('pin')) {
            pinToggle = row;
            break;
          }
        }
      }
      
      if (!pinToggle) throw new Error('Pin toggle not found');
      
      // Check if already pinned
      let isPinned = false;
      const toggle = pinToggle.shadowRoot?.querySelector('cr-toggle');
      if (toggle) {
        isPinned = toggle.checked || toggle.hasAttribute('checked');
      }
      
      if (isPinned) return { alreadyPinned: true };
      
      pinToggle.click();
      if (toggle) toggle.click();
      
      return { clicked: true };
    });
    
    await page.waitForTimeout(2000);
    
    console.log('[PIN] ✅ Extension pinned successfully');
    return { success: true, ...pinResult };
    
  } catch (err) {
    const isSessionClosed = err.message?.includes('Target closed') || 
                           err.message?.includes('Session closed') ||
                           err.message?.includes('Protocol error');
    
    if (isSessionClosed) {
      console.log('[PIN] ℹ️  Session closed during pinning');
      return { success: true, sessionClosed: true };
    }
    
    console.error('[PIN] ❌ Pinning failed:', err.message);
    return { success: false, error: err.message };
  } finally {
    // Don't close browser - let session continue
  }
}

const runTest = async (sessionId) => {
  const client = new Hyperbrowser({
    apiKey: process.env.HYPERBROWSER_API_KEY,
  });

  console.log('🧪 Starting BrowserUse test for ${projectName}');
  console.log('⚠️ Using fallback test template due to generation error');

  try {
    // Step 1: Pin the extension to toolbar
    console.log('📌 Pinning extension to toolbar...');
    const pinResult = await pinExtension(sessionId, process.env.HYPERBROWSER_API_KEY);
    
    if (pinResult.success) {
      console.log('✅ Extension pinned successfully');
    } else {
      console.warn('⚠️  Extension pinning had issues, continuing anyway:', pinResult.error);
    }

    // Step 2: Basic functionality test
    const result = await client.agents.browserUse.startAndWait({
      task: "STEP 1: Navigate to https://example.com (a simple CAPTCHA-free test page). STEP 2: Look for the pinned extension icon in the browser toolbar and click it. STEP 3: Interact with the extension interface and verify it loads and responds correctly. STEP 4: Test key features and report results.",
      sessionId: sessionId,
      keepBrowserOpen: true,
    });
    
    console.log('✅ Test completed:', result.data?.finalResult);
    return { success: true, pinResult, results: [result] };
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    return { success: false, error: err.message };
  }
};

// Export for use by test runner
export { runTest };

// Allow standalone execution
if (import.meta.url === 'file://' + process.argv[1]) {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error('Usage: node hyperagent_test_script.js <sessionId>');
    process.exit(1);
  }
  runTest(sessionId).catch(console.error);
}`
  }
}

