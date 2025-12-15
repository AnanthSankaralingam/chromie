import { llmService } from "../services/llm-service"
import { DEFAULT_MODEL } from "../constants"

export async function generatePlaywrightTestScript({ projectId, projectName, userPrompt, extensionFiles }) {
  console.log("🤖 Generating Puppeteer test script (Service Worker with API Check)...")

  // 1. Prepare Context
  const filesContext = extensionFiles.map(file => {
    const content = file.content.length > 5000 ? file.content.substring(0, 5000) + "...(truncated)" : file.content;
    return `File: ${file.file_path}\n\`\`\`\n${content}\n\`\`\``
  }).join("\n\n")

  // 2. Identify Side Panel HTML
  const sidePanelFile = extensionFiles.find(f => 
    f.file_path.includes("sidepanel") && f.file_path.endsWith(".html")
  )?.file_path || "sidepanel.html";

  // 3. Construct Prompt
  const prompt = `TASK: Write the raw JavaScript body of an async Puppeteer test function.

CONTEXT:
- Extension: ${projectName}
- Type: Side Panel Extension
- Target HTML: ${sidePanelFile}
- Goal: ${userPrompt}

FILES:
${filesContext}

ENVIRONMENT:
- You are writing the INSIDE of a function: async ({ page, extensionId }) => { ... }
- 'page' is provided. 
- You can access 'browser' via \`page.browser()\`.

STRATEGY (STRICT SERVICE WORKER):
1. **Access Browser**: Get the browser instance.
2. **Get Window ID**: We need the \`windowId\` of the opened page to pass to the side panel API.
3. **Get Service Worker**: Find the background worker target.
4. **Programmatic Open**: Evaluate \`chrome.sidePanel.open()\` inside the worker.
   - ⚠️ **SAFETY CHECK**: You MUST check if \`chrome.sidePanel\` is defined inside the worker. If not, throw an error instructing the user to check their 'manifest.json'.
5. **Catch Target**: Wait for the side panel page to load.

CODE SKELETON:
    const browser = page.browser();

    // 1. Ensure we have a valid window ID from the main page
    // (Navigating to a URL ensures a window exists)
    await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
    const windowId = await page.evaluate(() => window.chrome.windows ? window.chrome.windows.getCurrent().then(w => w.id) : null) || 
                     await page.evaluate(() => window.outerHeight > 0 ? 1 : 0); // Fallback ID

    // 2. Get Service Worker Handle
    const workerTarget = await browser.waitForTarget(t => t.type() === 'service_worker');
    const worker = await workerTarget.worker();

    // 3. Open Panel (Inside Worker)
    await worker.evaluate(async (wId) => {
        if (!chrome.sidePanel) {
            throw new Error("❌ chrome.sidePanel API is missing in Service Worker. Please ensure 'sidePanel' is in your manifest.json permissions.");
        }
        
        // We need the correct window ID. If the passed one is null, try getting it here.
        const targetWindowId = wId || (await chrome.windows.getCurrent()).id;
        
        console.log("Attempting to open side panel for window:", targetWindowId);
        await chrome.sidePanel.open({ windowId: targetWindowId });
    }, windowId);

    // 4. Catch the Side Panel Target
    const panelTarget = await browser.waitForTarget(
        t => t.url().includes('${sidePanelFile}')
    );
    const panelPage = await panelTarget.page();

    if (!panelPage) throw new Error("Could not capture Side Panel page handle.");

    // 5. Run User Logic on 'panelPage'
    // ... [Insert test logic here] ...

INSTRUCTIONS:
1. Use 'panelPage' for all UI interactions.
2. Return ONLY the JavaScript code.
`

  try {
    const response = await llmService.createResponse({
      provider: 'gemini',
      model: DEFAULT_MODEL,
      input: prompt,
      store: false,
      temperature: 0.2,
      max_output_tokens: 8192,
      session_id: projectId
    })

    let script = response?.output_text || ''
    script = script.replace(/```javascript/g, '').replace(/```/g, '').trim();
    script = script.split('\n').filter(line => !line.trim().startsWith('import ') && !line.trim().startsWith('export ')).join('\n');

    return script;

  } catch (error) {
    console.error("❌ Error generating script:", error);
    return `
      console.log("⚠️ Generation failed. Fallback.");
      const browser = page.browser();
    `;
  }
}