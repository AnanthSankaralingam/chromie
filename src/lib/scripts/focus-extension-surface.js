import { getPlaywrightSessionContext } from "@/lib/utils/browser-actions";

// Puppeteer script for: ensuring Chrome window focus so extension UI paints correctly
// This runs immediately after the extension has been pinned (or confirmed pinned)

const runFocusExtensionSurface = async (sessionId) => {
  console.log("[FOCUS-EXTENSION] 🚀 runFocusExtensionSurface called");
  console.log("[FOCUS-EXTENSION] Session ID:", sessionId);

  const apiKey = process.env.HYPERBROWSER_API_KEY;
  console.log("[FOCUS-EXTENSION] API key exists:", !!apiKey);

  if (!apiKey) {
    console.error("[FOCUS-EXTENSION] ❌ Missing HYPERBROWSER_API_KEY");
    throw new Error("Missing HYPERBROWSER_API_KEY");
  }

  let browser = null;
  let primaryPage = null;

  try {
    console.log("[FOCUS-EXTENSION] 🔌 Connecting to browser session...");
    const context = await getPlaywrightSessionContext(sessionId, apiKey);
    browser = context.browser;
    primaryPage = context.page;

    console.log("[FOCUS-EXTENSION] ✅ Browser connected:", !!browser);
    console.log("[FOCUS-EXTENSION] ✅ Primary page available:", !!primaryPage);

    const pages = browser ? await browser.pages() : [];
    const targetPages = pages.length > 0 ? pages : (primaryPage ? [primaryPage] : []);

    console.log("[FOCUS-EXTENSION] Pages detected:", targetPages.length);

    if (targetPages.length === 0) {
      console.warn("[FOCUS-EXTENSION] ⚠️ No pages available to focus");
      return { success: false, reason: "no_pages" };
    }

    let focusedPages = 0;

    for (const targetPage of targetPages) {
      try {
        console.log("[FOCUS-EXTENSION] 🎯 Bringing page to front...");
        await targetPage.bringToFront();

        console.log("[FOCUS-EXTENSION] ✨ Dispatching window focus events...");
        await targetPage.evaluate(() => {
          try {
            const timestamp = new Date().toISOString();
            console.log(`[chromie] Focus refresh triggered at ${timestamp}`);

            window.focus();
            window.dispatchEvent(new Event("focus"));

            if (document.hidden) {
              document.dispatchEvent(new Event("visibilitychange"));
            }

            if (document.body && typeof document.body.focus === "function") {
              document.body.focus();
            }

            const activeElement = document.activeElement;
            if (activeElement && activeElement !== document.body && typeof activeElement.blur === "function") {
              activeElement.blur();
            }

            console.log(`[chromie] Focus refresh completed at ${new Date().toISOString()}`);
          } catch (focusError) {
            console.error("Focus script error:", focusError);
          }
        });

        // Small delay to ensure compositor paints
        if (typeof targetPage.waitForTimeout === "function") {
          await targetPage.waitForTimeout(300);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        focusedPages += 1;
        console.log("[FOCUS-EXTENSION] ✅ Focus refresh complete for page");
      } catch (pageError) {
        console.error("[FOCUS-EXTENSION] ❌ Failed to focus page:", pageError.message);
      }
    }

    const success = focusedPages > 0;
    console.log(`[FOCUS-EXTENSION] 📝 Summary: ${focusedPages}/${targetPages.length} pages focused`);

    return { success, focusedPages, totalPages: targetPages.length };
  } catch (error) {
    console.error("[FOCUS-EXTENSION] ❌ Focus action failed:", error.message);
    console.error("[FOCUS-EXTENSION] Error stack:", error.stack);
    return { success: false, error: error.message };
  } finally {
    console.log("[FOCUS-EXTENSION] 🏁 Focus extension flow complete");
    // Do not close browser; session lifecycle is managed elsewhere
  }
};

export { runFocusExtensionSurface };

// Allow standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error("Usage: node focus-extension-surface.js <sessionId>");
    process.exit(1);
  }
  runFocusExtensionSurface(sessionId).catch(console.error);
}


