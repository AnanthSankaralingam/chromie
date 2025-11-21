import { Hyperbrowser } from "@hyperbrowser/sdk";
import { getPlaywrightSessionContext } from "@/lib/utils/browser-actions";

// BrowserUse script for: focus browser window to trigger rendering lifecycle
// Extension type: utility

const runFocusStage = async (sessionId) => {
  console.log('[FOCUS-STAGE] 🚀 runFocusStage called');
  console.log('[FOCUS-STAGE] Session ID:', sessionId);
  console.log('[FOCUS-STAGE] Environment:', process.env.VERCEL ? 'Vercel' : 'Local');
  console.log('[FOCUS-STAGE] Node version:', process.version);
  
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  console.log('[FOCUS-STAGE] API key exists:', !!apiKey);
  
  if (!apiKey) {
    console.error('[FOCUS-STAGE] ❌ Missing HYPERBROWSER_API_KEY');
    throw new Error("Missing HYPERBROWSER_API_KEY");
  }

  console.log('[FOCUS-STAGE] ✅ API key found, length:', apiKey.length);
  console.log('[FOCUS-STAGE] 🎯 Starting focus stage with BrowserUse');

  let browser = null;
  let page = null;

  try {
    // Initialize HyperBrowser client
    const client = new Hyperbrowser({
      apiKey: apiKey,
    });

    // Add browser console logs before BrowserUse task
    console.log('[FOCUS-STAGE] 📝 Adding browser console logs...');
    try {
      const context = await getPlaywrightSessionContext(sessionId, apiKey);
      browser = context.browser;
      page = context.page;

      // Navigate to a visible page if needed (chrome://newtab or about:blank won't show logs well)
      const currentUrl = page.url();
      console.log('[FOCUS-STAGE] Current page URL:', currentUrl);
      
      // If on chrome:// or about: page, navigate to a regular page for better console visibility
      if (currentUrl.startsWith('chrome://') || currentUrl === 'about:blank' || !currentUrl.startsWith('http')) {
        console.log('[FOCUS-STAGE] Navigating to chrome://newtab for console visibility...');
        await page.goto('chrome://newtab', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {
          // If chrome://newtab fails, try about:blank
          return page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 10000 });
        });
      }

      // Inject console logs into browser - these will appear in the live view console
      await page.evaluate(() => {
        console.log('%c[FOCUS-STAGE] 🎯 Starting focus stage - bringing browser window to front', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
        console.log('[FOCUS-STAGE] 📅 Timestamp:', new Date().toISOString());
        console.log('[FOCUS-STAGE] 🌐 Current URL:', window.location.href);
        console.log('[FOCUS-STAGE] 📊 Window dimensions:', {
          width: window.innerWidth,
          height: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight
        });
        console.log('[FOCUS-STAGE] 💡 Tip: These logs appear in the test session browser console (open DevTools in the live view)');
      });
      console.log('[FOCUS-STAGE] ✅ Browser console logs injected');
    } catch (logError) {
      console.warn('[FOCUS-STAGE] ⚠️  Failed to inject browser console logs (non-critical):', logError.message);
      // Continue anyway - this is a best-effort logging
    }

    // Use BrowserUse to focus the browser window
    // This ensures Chrome fully paints/renders the extension UI before pinning
    console.log('[FOCUS-STAGE] 🎯 Focusing browser window to trigger rendering...');
    
    const result = await client.agents.browserUse.startAndWait({
      task: "Focus the browser window by bringing it to the front and ensuring it is active. This will trigger the rendering lifecycle for any Chrome extensions.",
      sessionId: sessionId,
      keepBrowserOpen: true, // Keep session open for subsequent operations
    });

    console.log('[FOCUS-STAGE] ✅ Focus stage completed');
    console.log('[FOCUS-STAGE] BrowserUse result:', result.data?.finalResult || 'Success');

    // Add browser console logs after BrowserUse task
    if (page) {
      try {
        await page.evaluate(() => {
          console.log('%c[FOCUS-STAGE] ✅ Focus stage completed successfully', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
          console.log('[FOCUS-STAGE] 📅 Completion timestamp:', new Date().toISOString());
          console.log('[FOCUS-STAGE] ✅ Window is now focused and active');
          console.log('[FOCUS-STAGE] 🎨 Extension rendering lifecycle should be triggered');
          console.log('[FOCUS-STAGE] 🔄 Next: Pin extension flow will run');
        });
        console.log('[FOCUS-STAGE] ✅ Post-focus browser console logs added');
      } catch (logError) {
        console.warn('[FOCUS-STAGE] ⚠️  Failed to add post-focus browser console logs (non-critical):', logError.message);
      }
    }
    
    // Small delay to allow focus event to propagate and rendering to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('[FOCUS-STAGE] ✅ Focus event processed');

    return { success: true, result: result.data?.finalResult || 'Window focused successfully' };
  } catch (err) {
    console.error('[FOCUS-STAGE] ❌ Focus stage failed');
    console.error('[FOCUS-STAGE] Error message:', err.message);
    console.error('[FOCUS-STAGE] Error stack:', err.stack);
    console.error('[FOCUS-STAGE] Error details:', err);
    
    // Add error logs to browser console if page is available
    if (page) {
      try {
        await page.evaluate((errorMsg) => {
          console.error('%c[FOCUS-STAGE] ❌ Focus stage failed', 'color: #f44336; font-weight: bold; font-size: 14px;');
          console.error('[FOCUS-STAGE] Error:', errorMsg);
          console.error('[FOCUS-STAGE] 📅 Error timestamp:', new Date().toISOString());
        }, err.message);
      } catch (logError) {
        // Ignore logging errors
      }
    }
    
    return { success: false, error: err.message, stack: err.stack };
  } finally {
    console.log('[FOCUS-STAGE] 🏁 Focus stage flow complete');
    // Don't close the browser - let the session continue
    // The browser/page will be cleaned up when the session ends
  }
};

// Export for use by route
export { runFocusStage };

// Allow standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error('Usage: node focus-stage.js <sessionId>');
    process.exit(1);
  }
  runFocusStage(sessionId).catch(console.error);
}

