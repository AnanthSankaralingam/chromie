import { captureExtensionId } from "@/lib/utils/browser-actions";

// No-UI pin flow: resolve extension runtime ID via CDP targets only.
// We intentionally avoid chrome://extensions navigation and shadow DOM interactions
// to keep post-session setup low-latency and resilient.

const runPinExtension = async (sessionId) => {
  console.log('[PIN-EXTENSION] 🚀 runPinExtension called');
  
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  
  if (!apiKey) {
    console.error('[PIN-EXTENSION] ❌ Missing HYPERBROWSER_API_KEY');
    throw new Error("Missing HYPERBROWSER_API_KEY");
  }

  let capturedExtensionId = null;

  try {
    capturedExtensionId = await captureExtensionId(sessionId, apiKey, [], {
      maxAttempts: 12,
      delayMs: 350,
    });

    if (!capturedExtensionId) {
      console.warn("[PIN-EXTENSION] ⚠️ Could not resolve Chrome extension ID from targets");
      return {
        success: true,
        noUiFlow: true,
        chromeExtensionId: null,
        warning: "Extension ID not yet discoverable via targets",
      };
    }

    console.log("[PIN-EXTENSION] ✅ Resolved Chrome extension ID via CDP targets:", capturedExtensionId);
    return {
      success: true,
      noUiFlow: true,
      chromeExtensionId: capturedExtensionId,
    };

  } catch (err) {
    // Check if error is due to session/target being closed
    // Need to check the entire error chain since it's nested deeply
    const checkErrorChain = (error) => {
      if (!error) return false;
      const message = error.message || '';
      const name = error.name || '';
      if (message.includes('Target closed') ||
          message.includes('Session closed') ||
          message.includes('Browser has been closed') ||
          name === 'TargetCloseError') {
        return true;
      }
      // Check cause recursively
      if (error.cause) {
        return checkErrorChain(error.cause);
      }
      return false;
    };

    const isSessionClosed = checkErrorChain(err);

    if (isSessionClosed) {
      console.log('[PIN-EXTENSION] ℹ️  Session was closed during pinning operation');
      console.log('[PIN-EXTENSION] This is expected if the user stopped the session quickly');
      // Return success since this isn't a real failure - session was just closed
      return { success: true, sessionClosed: true, message: 'Session closed during operation', chromeExtensionId: capturedExtensionId };
    }

    // Real error - log it
    console.error('[PIN-EXTENSION] ❌ Extension no-UI resolution failed');
    console.error('[PIN-EXTENSION] Error message:', err.message);
    console.error('[PIN-EXTENSION] Error stack:', err.stack);
    console.error('[PIN-EXTENSION] Error details:', err);
    return { success: false, error: err.message, stack: err.stack, chromeExtensionId: null };
  } finally {
    console.log('[PIN-EXTENSION] 🏁 Pin extension flow complete');
    // No browser page work is performed in no-UI mode.
  }
};

// Export for use by route
export { runPinExtension };

// Allow standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error('Usage: node pin-extension.js <sessionId>');
    process.exit(1);
  }
  runPinExtension(sessionId).catch(console.error);
}

