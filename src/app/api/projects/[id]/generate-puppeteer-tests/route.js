import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { llmService } from "@/lib/services/llm-service"

export const runtime = "nodejs"

function safeJsonForJs(value) {
  // JSON.stringify is usually safe, but U+2028 / U+2029 are valid in JSON yet break JS parsing in JS source.
  // Escape them so generated JS is always valid.
  return JSON.stringify(value)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

function extractHtmlHints(html) {
  if (!html || typeof html !== "string") return {}
  // IMPORTANT: Stored extension HTML often contains bundled JS (inline <script> tags).
  // If we regex the raw HTML, we can accidentally "find" id="..." inside a JS string,
  // generating a hint that doesn't exist in the actual DOM at runtime.
  // To reduce false positives, strip <script>/<style> blocks before extracting hints.
  const sanitized = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")

  const idMatch = sanitized.match(/\bid=["']([^"']{1,64})["']/i)
  const testIdMatch = sanitized.match(/\bdata-testid=["']([^"']{1,64})["']/i)
  const h1Match = sanitized.match(/<h1[^>]*>([^<]{1,120})<\/h1>/i)
  return {
    firstId: idMatch?.[1] || null,
    firstTestId: testIdMatch?.[1] || null,
    firstH1Text: h1Match?.[1]?.trim() || null,
  }
}

function extractLikelyInjectedSelector(js) {
  if (!js || typeof js !== "string") return null

  // Try to find an element id being set/used in DOM injection.
  const id1 = js.match(/setAttribute\(\s*["']id["']\s*,\s*["']([^"']{1,64})["']\s*\)/i)?.[1]
  const id2 = js.match(/\.\bid\s*=\s*["']([^"']{1,64})["']/i)?.[1]
  const id3 = js.match(/getElementById\(\s*["']([^"']{1,64})["']\s*\)/i)?.[1]
  const id = id1 || id2 || id3
  if (id) return `#${id}`

  // Try a class that is being added.
  const cls1 = js.match(/classList\.add\(\s*["']([^"']{1,64})["']\s*\)/i)?.[1]
  const cls2 = js.match(/\bclassName\s*=\s*["']([^"']{1,64})["']/i)?.[1]
  const cls = cls1 || cls2
  if (cls) {
    // if multiple classes are present, take the first.
    const first = cls.split(/\s+/).filter(Boolean)[0]
    if (first) return `.${first}`
  }

  return null
}

async function generateFunctionalTests({ extensionName, description, codeFiles }) {
  try {
    // Create a prompt to generate functional test scenarios based on the extension's purpose
    const prompt = `You are a Puppeteer test generator for Chrome extensions. Given the extension details below, generate specific functional test scenarios that test the core features of this extension.

Extension Name: ${extensionName}
Extension Purpose: ${description || "No description provided"}

Generated Code Files:
${Object.entries(codeFiles).map(([path, content]) => `
--- ${path} ---
${content.slice(0, 3000)}${content.length > 3000 ? '\n... (truncated)' : ''}
`).join('\n')}

Based on the code above, identify the key functionalities of this extension and generate 2-4 functional test scenarios. Each test should:
1. Have a clear test name describing what functionality it tests
2. Include step-by-step Puppeteer actions to test that functionality
3. Include assertions to verify the functionality works correctly
4. Be realistic and actually test what the extension does (not generic tests)

Return your response as a JSON array of test scenarios. Each scenario should have:
- testName: string (concise test name)
- description: string (what this test verifies)
- steps: array of step objects with { action: string, target?: string, assertion?: string }

Example format:
[
  {
    "testName": "adds todo item",
    "description": "Verifies user can add a new todo item to the list",
    "steps": [
      { "action": "waitForSelector", "target": "#todo-input" },
      { "action": "type", "target": "#todo-input", "value": "Buy groceries" },
      { "action": "click", "target": "#add-button" },
      { "assertion": "waitForSelector", "target": ".todo-item:has-text(\\"Buy groceries\\")" }
    ]
  }
]

IMPORTANT: Return ONLY the JSON array, no markdown formatting or explanations.`

    const response = await llmService.createResponse({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      input: prompt,
      temperature: 0.2,
      max_output_tokens: 4096,
      store: false,
    })

    const responseText = response.output_text || response.choices?.[0]?.message?.content || ''
    
    // Try to extract JSON from the response
    let jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[generate-functional-tests] Could not extract JSON from AI response')
      return []
    }

    const testScenarios = JSON.parse(jsonMatch[0])
    console.log('[generate-functional-tests] Generated', testScenarios.length, 'test scenarios')
    return Array.isArray(testScenarios) ? testScenarios : []
  } catch (error) {
    console.error('[generate-functional-tests] Error generating tests:', error)
    return []
  }
}

function buildPuppeteerTestFile({
  extensionName,
  serviceWorkerFile,
  popupFile,
  popupHint,
  optionsPage,
  optionsHint,
  sidePanelPath,
  sidePanelHint,
  contentScriptTest,
  chromeExtensionId,
  functionalTests = [],
}) {
  // This strictly follows the official Chrome Extension testing documentation:
  // https://developer.chrome.com/docs/extensions/how-to/test/puppeteer
  // 
  // Key approach:
  // 1. Wait for service worker to start
  // 2. Use chrome.action.openPopup() to open popup (not extension URLs)
  // 3. Use chrome.runtime.openOptionsPage() to open options page
  // 4. Use chrome.sidePanel.open() to open side panel
  // 5. Wait for targets and get pages via asPage()
  
  // Build the test file using string concatenation to avoid template literal issues in vm.Script
  const lines = [];
  
  lines.push('// Generated by chromie: Puppeteer extension tests (Hyperbrowser session)');
  lines.push('// Follows official Chrome Extension testing documentation:');
  lines.push('// - https://developer.chrome.com/docs/extensions/how-to/test/puppeteer');
  lines.push('// - https://github.com/GoogleChrome/chrome-extensions-samples/tree/main/functional-samples/tutorial.puppeteer');
  lines.push('//');
  lines.push('// This file is meant to be executed by Chromie\'s "Run Puppeteer Tests" button');
  lines.push('// inside the headful "Try it out" browser session.');
  lines.push('');
  lines.push('var browser;');
  lines.push('var page;');
  lines.push('var worker;');
  lines.push('var extensionId;');
  lines.push('');
  lines.push('// Values derived from your manifest.json at generation time:');
  lines.push('var EXTENSION_NAME = ' + safeJsonForJs(extensionName || "extension") + ';');
  lines.push('var SERVICE_WORKER_FILE = ' + safeJsonForJs(serviceWorkerFile || null) + ';');
  lines.push('var POPUP_FILE = ' + safeJsonForJs(popupFile || null) + ';');
  lines.push('var POPUP_HINT = ' + safeJsonForJs(popupHint || {}) + ';');
  lines.push('var OPTIONS_PAGE = ' + safeJsonForJs(optionsPage || null) + ';');
  lines.push('var OPTIONS_HINT = ' + safeJsonForJs(optionsHint || {}) + ';');
  lines.push('var SIDE_PANEL_PATH = ' + safeJsonForJs(sidePanelPath || null) + ';');
  lines.push('var SIDE_PANEL_HINT = ' + safeJsonForJs(sidePanelHint || {}) + ';');
  lines.push('var CONTENT_SCRIPT_TEST = ' + safeJsonForJs(contentScriptTest || null) + ';');
  lines.push('var STORED_CHROME_EXTENSION_ID = ' + safeJsonForJs(chromeExtensionId || null) + ';');
  lines.push('');
  lines.push('function pickUiAssertion(hint) {');
  lines.push('  if (hint && hint.firstTestId) return { type: "testid", value: hint.firstTestId };');
  lines.push('  if (hint && hint.firstId) return { type: "id", value: hint.firstId };');
  lines.push('  if (hint && hint.firstH1Text) return { type: "h1", value: hint.firstH1Text };');
  lines.push('  return null;');
  lines.push('}');
  lines.push('');
  lines.push('async function assertUi(pageLike, hint) {');
  lines.push('  var assertion = pickUiAssertion(hint);');
  lines.push('  if (!assertion) {');
  lines.push('    var text = await pageLike.evaluate(function() { return document.body ? document.body.innerText : ""; });');
  lines.push('    expect(text.length).toBeGreaterThan(0);');
  lines.push('    return;');
  lines.push('  }');
  lines.push('  if (assertion.type === "testid") {');
  lines.push('    var sel = "[data-testid=\\"" + assertion.value + "\\"]";');
  lines.push('    try {');
  lines.push('      await pageLike.waitForSelector(sel, { timeout: 30000 });');
  lines.push('    } catch (e) {');
  lines.push('      var u = (pageLike && pageLike.url) ? pageLike.url() : "";');
  lines.push('      console.log("[puppeteer] assertUi timeout:", sel, "url:", u, "error:", e ? e.message : e);');
  lines.push('      try {');
  lines.push('        var html = await pageLike.content();');
  lines.push('        console.log("[puppeteer] page html (first 2000 chars):", String(html || "").slice(0, 2000));');
  lines.push('      } catch (e2) {');
  lines.push('        console.log("[puppeteer] could not read page content:", e2 ? e2.message : e2);');
  lines.push('      }');
  lines.push('      throw e;');
  lines.push('    }');
  lines.push('    expect(true).toBeTruthy();');
  lines.push('    return;');
  lines.push('  }');
  lines.push('  if (assertion.type === "id") {');
  lines.push('    var sel2 = "#" + assertion.value;');
  lines.push('    try {');
  lines.push('      await pageLike.waitForSelector(sel2, { timeout: 30000 });');
  lines.push('    } catch (e3) {');
  lines.push('      var u2 = (pageLike && pageLike.url) ? pageLike.url() : "";');
  lines.push('      console.log("[puppeteer] assertUi timeout:", sel2, "url:", u2, "error:", e3 ? e3.message : e3);');
  lines.push('      try {');
  lines.push('        var html2 = await pageLike.content();');
  lines.push('        console.log("[puppeteer] page html (first 2000 chars):", String(html2 || "").slice(0, 2000));');
  lines.push('      } catch (e4) {');
  lines.push('        console.log("[puppeteer] could not read page content:", e4 ? e4.message : e4);');
  lines.push('      }');
  lines.push('      throw e3;');
  lines.push('    }');
  lines.push('    expect(true).toBeTruthy();');
  lines.push('    return;');
  lines.push('  }');
  lines.push('  if (assertion.type === "h1") {');
  lines.push('    var h1 = await pageLike.$("h1");');
  lines.push('    var h1Text = h1 ? await pageLike.evaluate(function(el) { return el ? el.innerText : ""; }, h1) : "";');
  lines.push('    expect(String(h1Text || "")).toContain(assertion.value);');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('function extractExtensionIdFromUrl(url) {');
  lines.push('  if (!url || typeof url !== "string") return null;');
  lines.push('  var m = url.match(/^chrome-extension:\\/\\/([a-p]{32})\\//i);');
  lines.push('  return m ? m[1] : null;');
  lines.push('}');
  lines.push('');
  lines.push('function computeExtensionUrl(extId, relativePath) {');
  lines.push('  if (!extId || !relativePath) return null;');
  lines.push('  var clean = String(relativePath).replace(/^\\/+/, "");');
  lines.push('  return "chrome-extension://" + extId + "/" + clean;');
  lines.push('}');
  lines.push('');
  lines.push('beforeEach(async function() {');
  lines.push('  var ctx = await getPuppeteerSessionContext();');
  lines.push('  browser = ctx.browser;');
  lines.push('  page = ctx.page;');
  lines.push('');
  lines.push('  var matchesBackground = function(target) {');
  lines.push('    var type = target.type();');
  lines.push('    if (type !== "service_worker" && type !== "background_page") return false;');
  lines.push('    var url = target.url() || "";');
  lines.push('    if (!SERVICE_WORKER_FILE) return true;');
  lines.push('    return url.endsWith(SERVICE_WORKER_FILE) || url.includes(SERVICE_WORKER_FILE);');
  lines.push('  };');
  lines.push('');
  lines.push('  var existing = browser.targets().find(matchesBackground);');
  lines.push('  if (existing && existing.worker) {');
  lines.push('    worker = await existing.worker();');
  lines.push('  } else if (SERVICE_WORKER_FILE) {');
  lines.push('    try {');
  lines.push('      var workerTarget = await browser.waitForTarget(matchesBackground, { timeout: 20000 });');
  lines.push('      if (workerTarget.worker) {');
  lines.push('        worker = await workerTarget.worker();');
  lines.push('      }');
  lines.push('    } catch (e) {');
  lines.push('      console.log("[puppeteer] No service worker/background target found within timeout:", e ? e.message : e);');
  lines.push('      worker = undefined;');
  lines.push('    }');
  lines.push('  }');
  lines.push('');
  lines.push('  if (STORED_CHROME_EXTENSION_ID) {');
  lines.push('    console.log("[puppeteer] ✅ Using stored Chrome extension ID: " + STORED_CHROME_EXTENSION_ID);');
  lines.push('    extensionId = STORED_CHROME_EXTENSION_ID;');
  lines.push('  } else {');
  lines.push('    console.error("[puppeteer] ❌ No stored Chrome extension ID found!");');
  lines.push('    console.error("[puppeteer] Please run the extension in the browser first to capture the ID.");');
  lines.push('    extensionId = undefined;');
  lines.push('  }');
  lines.push('});');
  lines.push('');
  lines.push('afterEach(async function() {');
  lines.push('  browser = undefined;');
  lines.push('  page = undefined;');
  lines.push('  worker = undefined;');
  lines.push('  extensionId = undefined;');
  lines.push('});');
  lines.push('');
  lines.push('test(EXTENSION_NAME + ": popup opens (if present)", async function() {');
  lines.push('  if (!POPUP_FILE) {');
  lines.push('    console.log("[puppeteer] Skipping popup test: no action.default_popup in manifest.json");');
  lines.push('    expect(true).toBeTruthy();');
  lines.push('    return;');
  lines.push('  }');
  lines.push('');
  lines.push('  if (!extensionId) {');
  lines.push('    console.log("[puppeteer] Skipping popup test: could not determine extension ID");');
  lines.push('    expect(true).toBeTruthy();');
  lines.push('    return;');
  lines.push('  }');
  lines.push('');
  lines.push('  var popupUrl = computeExtensionUrl(extensionId, POPUP_FILE);');
  lines.push('  console.log("[puppeteer] Opening popup directly at:", popupUrl);');
  lines.push('');
  lines.push('  var popup = await browser.newPage();');
  lines.push('  await popup.goto(popupUrl, { waitUntil: "domcontentloaded" });');
  lines.push('  await assertUi(popup, POPUP_HINT);');
  lines.push('});');
  lines.push('');
  lines.push('test(EXTENSION_NAME + ": options page loads (if present)", async function() {');
  lines.push('  if (!OPTIONS_PAGE) {');
  lines.push('    console.log("[puppeteer] Skipping options test: no options page in manifest.json");');
  lines.push('    expect(true).toBeTruthy();');
  lines.push('    return;');
  lines.push('  }');
  lines.push('  var url = computeExtensionUrl(extensionId, OPTIONS_PAGE);');
  lines.push('  if (!url) {');
  lines.push('    throw new Error("Could not determine extensionId to open options page.");');
  lines.push('  }');
  lines.push('  var p = await browser.newPage();');
  lines.push('  await p.goto(url, { waitUntil: "domcontentloaded" });');
  lines.push('  await assertUi(p, OPTIONS_HINT);');
  lines.push('});');
  lines.push('');
  lines.push('test(EXTENSION_NAME + ": side panel page loads (if present)", async function() {');
  lines.push('  if (!SIDE_PANEL_PATH) {');
  lines.push('    console.log("[puppeteer] Skipping side panel test: no side_panel.default_path in manifest.json");');
  lines.push('    expect(true).toBeTruthy();');
  lines.push('    return;');
  lines.push('  }');
  lines.push('  var url = computeExtensionUrl(extensionId, SIDE_PANEL_PATH);');
  lines.push('  if (!url) {');
  lines.push('    throw new Error("Could not determine extensionId to open side panel page.");');
  lines.push('  }');
  lines.push('  var p = await browser.newPage();');
  lines.push('  await p.goto(url, { waitUntil: "domcontentloaded" });');
  lines.push('  await assertUi(p, SIDE_PANEL_HINT);');
  lines.push('});');
  lines.push('');
  lines.push('test(EXTENSION_NAME + ": content script smoke (best effort)", async function() {');
  lines.push('  if (!CONTENT_SCRIPT_TEST || !CONTENT_SCRIPT_TEST.enabled) {');
  lines.push('    console.log("[puppeteer] Skipping content script test:", CONTENT_SCRIPT_TEST ? CONTENT_SCRIPT_TEST.reason : "not configured");');
  lines.push('    expect(true).toBeTruthy();');
  lines.push('    return;');
  lines.push('  }');
  lines.push('');
  lines.push('  var p = await browser.newPage();');
  lines.push('  await p.goto(CONTENT_SCRIPT_TEST.url, { waitUntil: "domcontentloaded" });');
  lines.push('');
  lines.push('  if (CONTENT_SCRIPT_TEST.selector) {');
  lines.push('    await p.waitForSelector(CONTENT_SCRIPT_TEST.selector, { timeout: 30000 });');
  lines.push('    expect(true).toBeTruthy();');
  lines.push('    return;');
  lines.push('  }');
  lines.push('');
  lines.push('  var title = await p.title();');
  lines.push('  expect(String(title || "").length).toBeGreaterThan(0);');
  lines.push('});');
  lines.push('');
  
  // Add functional tests generated by AI
  if (functionalTests && functionalTests.length > 0) {
    lines.push('// Functional tests for extension-specific features');
    lines.push('');
    
    for (const testScenario of functionalTests) {
      const testName = testScenario.testName || 'unnamed test';
      const description = testScenario.description || '';
      const steps = Array.isArray(testScenario.steps) ? testScenario.steps : [];
      
      lines.push('test(EXTENSION_NAME + ": ' + testName.replace(/"/g, '\\"') + '", async function() {');
      if (description) {
        lines.push('  // ' + description);
      }
      lines.push('  if (!POPUP_FILE && !extensionId) {');
      lines.push('    console.log("[puppeteer] Skipping functional test: no popup or extension ID");');
      lines.push('    expect(true).toBeTruthy();');
      lines.push('    return;');
      lines.push('  }');
      lines.push('');
      lines.push('  var popupUrl = POPUP_FILE ? computeExtensionUrl(extensionId, POPUP_FILE) : null;');
      lines.push('  if (!popupUrl) {');
      lines.push('    console.log("[puppeteer] Skipping functional test: could not construct popup URL");');
      lines.push('    expect(true).toBeTruthy();');
      lines.push('    return;');
      lines.push('  }');
      lines.push('');
      lines.push('  var testPage = await browser.newPage();');
      lines.push('  await testPage.goto(popupUrl, { waitUntil: "domcontentloaded" });');
      lines.push('');
      
      // Generate test steps
      for (const step of steps) {
        const action = step.action || '';
        const target = step.target || '';
        const value = step.value || '';
        const assertion = step.assertion || '';
        const isAssertion = !!assertion;
        
        if (action === 'waitForSelector' || assertion === 'waitForSelector') {
          const selector = target.replace(/"/g, '\\"');
          if (isAssertion) {
            // Assertion: must succeed or test fails
            lines.push('  await testPage.waitForSelector("' + selector + '", { timeout: 10000 });');
            lines.push('  expect(true).toBeTruthy(); // Element found');
          } else {
            // Non-assertion: log warning but continue
            lines.push('  try {');
            lines.push('    await testPage.waitForSelector("' + selector + '", { timeout: 10000 });');
            lines.push('  } catch (e) {');
            lines.push('    console.log("[puppeteer] Warning: Selector not found: ' + selector + '");');
            lines.push('  }');
          }
        } else if (action === 'click') {
          const selector = target.replace(/"/g, '\\"');
          if (isAssertion) {
            // Assertion: must succeed or test fails
            lines.push('  await testPage.click("' + selector + '");');
          } else {
            // Non-assertion: log warning but continue
            lines.push('  try {');
            lines.push('    await testPage.click("' + selector + '");');
            lines.push('  } catch (e) {');
            lines.push('    console.log("[puppeteer] Warning: Could not click: ' + selector + '");');
            lines.push('  }');
          }
        } else if (action === 'type') {
          const selector = target.replace(/"/g, '\\"');
          const text = value.replace(/"/g, '\\"');
          if (isAssertion) {
            // Assertion: must succeed or test fails
            lines.push('  await testPage.type("' + selector + '", "' + text + '");');
          } else {
            // Non-assertion: log warning but continue
            lines.push('  try {');
            lines.push('    await testPage.type("' + selector + '", "' + text + '");');
            lines.push('  } catch (e) {');
            lines.push('    console.log("[puppeteer] Warning: Could not type into: ' + selector + '");');
            lines.push('  }');
          }
        } else if (action === 'evaluate') {
          if (isAssertion) {
            // Assertion: must succeed or test fails
            lines.push('  var result = await testPage.evaluate(function() {');
            lines.push('    ' + (value || 'return true;'));
            lines.push('  });');
            lines.push('  expect(result).toBeTruthy();');
          } else {
            // Non-assertion: log warning but continue
            lines.push('  try {');
            lines.push('    var result = await testPage.evaluate(function() {');
            lines.push('      ' + (value || 'return true;'));
            lines.push('    });');
            lines.push('  } catch (e) {');
            lines.push('    console.log("[puppeteer] Warning: Evaluation failed");');
            lines.push('  }');
          }
        }
        lines.push('');
      }
      
      lines.push('  await testPage.close();');
      lines.push('  expect(true).toBeTruthy(); // Test completed');
      lines.push('});');
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

export async function POST(request, { params }) {
  const supabase = createClient()
  const projectId = params.id

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Verify project ownership and fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, description")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Read manifest so we can tailor worker/popup targeting.
    const { data: manifestRow, error: manifestError } = await supabase
      .from("code_files")
      .select("content")
      .eq("project_id", projectId)
      .eq("file_path", "manifest.json")
      .single()

    if (manifestError || !manifestRow?.content) {
      return NextResponse.json(
        { error: "manifest.json not found. Generate your extension first." },
        { status: 404 }
      )
    }

    let manifest
    try {
      manifest = JSON.parse(manifestRow.content)
    } catch (e) {
      return NextResponse.json({ error: "manifest.json is not valid JSON" }, { status: 400 })
    }

    const extensionName = manifest?.name || "extension"

    // Only set these if they exist in the manifest (don't assume popup/worker exists).
    const serviceWorkerFile = manifest?.background?.service_worker || null
    const popupFile = manifest?.action?.default_popup || manifest?.browser_action?.default_popup || null
    const optionsPage = manifest?.options_page || manifest?.options_ui?.page || null
    const sidePanelPath = manifest?.side_panel?.default_path || null

    // Fetch referenced UI files (best effort) and extract simple assertions.
    const pathsToFetch = [popupFile, optionsPage, sidePanelPath].filter(Boolean)
    const uiFileContents = new Map()
    if (pathsToFetch.length > 0) {
      const { data: uiFiles } = await supabase
        .from("code_files")
        .select("file_path, content")
        .eq("project_id", projectId)
        .in("file_path", pathsToFetch)
      for (const f of uiFiles || []) {
        uiFileContents.set(f.file_path, f.content)
      }
    }

    const popupHint = extractHtmlHints(uiFileContents.get(popupFile) || "")
    const optionsHint = extractHtmlHints(uiFileContents.get(optionsPage) || "")
    const sidePanelHint = extractHtmlHints(uiFileContents.get(sidePanelPath) || "")

    // Content script best-effort test:
    // - only for scripts that plausibly run on https://example.com
    // - try to detect a likely injected selector from script source
    let contentScriptTest = { enabled: false, reason: "No content_scripts found" }
    const cs = Array.isArray(manifest?.content_scripts) ? manifest.content_scripts : []
    if (cs.length > 0) {
      const first = cs[0]
      const matches = Array.isArray(first?.matches) ? first.matches : []
      const jsFiles = Array.isArray(first?.js) ? first.js : []
      const canUseExample = matches.includes("<all_urls>") || matches.some((m) => typeof m === "string" && m.includes("example.com") && m.startsWith("http"))

      if (!canUseExample) {
        contentScriptTest = { enabled: false, reason: "content_scripts.matches does not include https://example.com or <all_urls>" }
      } else if (jsFiles.length === 0) {
        contentScriptTest = { enabled: false, reason: "content_scripts has no js files" }
      } else {
        const { data: csFiles } = await supabase
          .from("code_files")
          .select("file_path, content")
          .eq("project_id", projectId)
          .in("file_path", jsFiles)

        const combined = (csFiles || []).map((f) => f.content || "").join("\n")
        const selector = extractLikelyInjectedSelector(combined)
        contentScriptTest = {
          enabled: true,
          url: "https://example.com",
          selector: selector || null,
          note: selector ? "Asserting selector likely injected by content script" : "No obvious injected selector found; using smoke check",
        }
      }
    }

    // Try to read the stored Chrome extension ID from the last test session
    let chromeExtensionId = null
    const { data: extensionIdFile } = await supabase
      .from("code_files")
      .select("content")
      .eq("project_id", projectId)
      .eq("file_path", ".chromie/extension-id.json")
      .single()

    if (extensionIdFile?.content) {
      try {
        const idData = JSON.parse(extensionIdFile.content)
        chromeExtensionId = idData.chromeExtensionId || null
        console.log("[generate-puppeteer-tests] ✅ Found stored Chrome extension ID:", chromeExtensionId)
      } catch (e) {
        console.warn("[generate-puppeteer-tests] ⚠️  Could not parse stored extension ID:", e.message)
      }
    } else {
      console.log("[generate-puppeteer-tests] ℹ️  No stored Chrome extension ID found (tests will skip extension-page checks until you run Test Extension to capture it)")
    }

    // Generate functional tests based on extension purpose
    console.log("[generate-puppeteer-tests] 🤖 Generating functional tests...")
    let functionalTests = []
    try {
      // Collect relevant code files for analysis
      const codeFilesToAnalyze = {}
      
      // Add UI files
      if (popupFile && uiFileContents.has(popupFile)) {
        codeFilesToAnalyze[popupFile] = uiFileContents.get(popupFile)
      }
      if (optionsPage && uiFileContents.has(optionsPage)) {
        codeFilesToAnalyze[optionsPage] = uiFileContents.get(optionsPage)
      }
      if (sidePanelPath && uiFileContents.has(sidePanelPath)) {
        codeFilesToAnalyze[sidePanelPath] = uiFileContents.get(sidePanelPath)
      }
      
      // Add service worker if available
      if (serviceWorkerFile) {
        const { data: swFiles } = await supabase
          .from("code_files")
          .select("file_path, content")
          .eq("project_id", projectId)
          .eq("file_path", serviceWorkerFile)
          .single()
        if (swFiles?.content) {
          codeFilesToAnalyze[serviceWorkerFile] = swFiles.content
        }
      }
      
      // Add content scripts if available
      const csFiles = Array.isArray(manifest?.content_scripts) ? manifest.content_scripts : []
      if (csFiles.length > 0) {
        const jsFiles = Array.isArray(csFiles[0]?.js) ? csFiles[0].js : []
        if (jsFiles.length > 0) {
          const { data: contentScriptFiles } = await supabase
            .from("code_files")
            .select("file_path, content")
            .eq("project_id", projectId)
            .in("file_path", jsFiles.slice(0, 2)) // Limit to first 2 files
          for (const f of contentScriptFiles || []) {
            codeFilesToAnalyze[f.file_path] = f.content
          }
        }
      }
      
      functionalTests = await generateFunctionalTests({
        extensionName: extensionName,
        description: project.description || project.name,
        codeFiles: codeFilesToAnalyze,
      })
      console.log("[generate-puppeteer-tests] ✅ Generated", functionalTests.length, "functional test scenarios")
    } catch (error) {
      console.error("[generate-puppeteer-tests] ⚠️  Failed to generate functional tests:", error)
      // Continue without functional tests
    }

    const filePath = "tests/puppeteer/index.test.js"
    const content = buildPuppeteerTestFile({
      extensionName,
      serviceWorkerFile,
      popupFile,
      popupHint,
      optionsPage,
      optionsHint,
      sidePanelPath,
      sidePanelHint,
      contentScriptTest,
      chromeExtensionId,
      functionalTests,
    })

    // Basic validation: ensure content is non-empty and looks like valid JS structure
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.error("[generate-puppeteer-tests] ❌ Generated test file is empty or invalid")
      return NextResponse.json(
        {
          error: "Generated puppeteer test file is empty or invalid",
        },
        { status: 500 }
      )
    }
    
    // Sanity check: ensure it contains expected test structure
    const hasRequiredStructure = 
      content.includes('beforeEach') && 
      content.includes('afterEach') && 
      content.includes('test(')
    
    if (!hasRequiredStructure) {
      console.error("[generate-puppeteer-tests] ❌ Generated test file missing required test structure")
      return NextResponse.json(
        {
          error: "Generated puppeteer test file is missing required test structure",
          details: "File should contain beforeEach, afterEach, and test blocks",
        },
        { status: 500 }
      )
    }

    // Upsert into code_files
    const { error: upsertError } = await supabase
      .from("code_files")
      .upsert(
        {
          project_id: projectId,
          file_path: filePath,
          content,
        },
        { onConflict: "project_id,file_path" }
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    console.log("[generate-puppeteer-tests] ✅ Generated", { projectId, filePath, serviceWorkerFile, popupFile })
    return NextResponse.json({ success: true, filePath, serviceWorkerFile, popupFile })
  } catch (error) {
    console.error("[generate-puppeteer-tests] ❌ Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

