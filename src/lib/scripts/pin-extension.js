import { getPuppeteerSessionContext } from "@/lib/utils/browser-actions";

// Puppeteer script for: automatically pin extension to toolbar
// Extension type: utility

const runPinExtension = async (sessionId) => {
  console.log('[PIN-EXTENSION] 🚀 runPinExtension called');
  
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  
  if (!apiKey) {
    console.error('[PIN-EXTENSION] ❌ Missing HYPERBROWSER_API_KEY');
    throw new Error("Missing HYPERBROWSER_API_KEY");
  }

  let browser = null;
  let page = null;
  let capturedExtensionId = null; // Declare at function scope so it's available in catch block

  try {
    // Connect to the browser session
    const context = await getPuppeteerSessionContext(sessionId, apiKey);
    
    browser = context.browser;
    page = context.page;
    console.log('[PIN-EXTENSION] Browser connected:', !!browser);
    console.log('[PIN-EXTENSION] Page available:', !!page);

    // Navigate to chrome://extensions if not already there
    let currentUrl = page.url();
    console.log('[PIN-EXTENSION] 🌐 Current URL:', currentUrl);
    
    // Try to capture extension ID from URL if already on details page
    const urlMatch = currentUrl.match(/[?&]id=([a-p]{32})/i);
    if (urlMatch) {
      capturedExtensionId = urlMatch[1];
      console.log('[PIN-EXTENSION] ✅ Captured Chrome extension ID from initial URL:', capturedExtensionId);
    }
    
    if (!currentUrl.includes('chrome://extensions')) {
      console.log('[PIN-EXTENSION] 🚀 Navigating to chrome://extensions...');
      await page.goto('chrome://extensions', { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('[PIN-EXTENSION] ✅ Navigation complete');
      
      // Check URL again after navigation
      currentUrl = page.url();
      if (!capturedExtensionId) {
        const urlMatch2 = currentUrl.match(/[?&]id=([a-p]{32})/i);
        if (urlMatch2) {
          capturedExtensionId = urlMatch2[1];
          console.log('[PIN-EXTENSION] ✅ Captured Chrome extension ID from URL after navigation:', capturedExtensionId);
        }
      }
    } else {
      console.log('[PIN-EXTENSION] ✅ Already on chrome://extensions page');
    }

    // Wait for the extensions page to load and shadow DOM to be ready
    console.log('[PIN-EXTENSION] ⏳ Waiting for extensions-manager element...');
    await page.waitForSelector('extensions-manager', { timeout: 10000 });
    console.log('[PIN-EXTENSION] ✅ extensions-manager element found');
    
    // Wait for shadow DOM to be accessible
    console.log('[PIN-EXTENSION] ⏳ Waiting for shadow DOM to be accessible...');
    await page.waitForFunction(() => {
      const manager = document.querySelector('extensions-manager');
      return manager && manager.shadowRoot !== null;
    }, { timeout: 10000 });
    console.log('[PIN-EXTENSION] ✅ Shadow DOM is accessible');

    // Wait for extensions to load
    console.log('[PIN-EXTENSION] ⏳ Waiting 3 seconds for extensions to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('[PIN-EXTENSION] ✅ Wait complete');

    // If we're already on a details page, we might not need to click Details
    // Check if we're on a details view
    const onDetailsPage = currentUrl.includes('?id=');
    console.log('[PIN-EXTENSION] On details page:', onDetailsPage);
    
    if (!onDetailsPage) {
      // Navigate through shadow DOM to find and click Details button, and capture the extension ID
      console.log('[PIN-EXTENSION] 🔍 Finding extension card and Details button in shadow DOM...');
      
      const evalResult = await page.evaluate(() => {
        console.log('[PIN-EXTENSION-EVAL] Starting browser-side evaluation');
        const manager = document.querySelector('extensions-manager');
        console.log('[PIN-EXTENSION-EVAL] extensions-manager element:', !!manager);
        console.log('[PIN-EXTENSION-EVAL] Has shadow root:', !!(manager && manager.shadowRoot));
        
        if (!manager || !manager.shadowRoot) {
          throw new Error('extensions-manager shadow root not found');
        }

      // Find extension items in shadow DOM - try multiple selectors
      console.log('[PIN-EXTENSION-EVAL] Searching for extensions-item elements...');
      let items = manager.shadowRoot.querySelectorAll('extensions-item');
      console.log('[PIN-EXTENSION-EVAL] Direct search found:', items.length, 'items');
      
      // If not found, try looking inside extensions-item-list
      if (items.length === 0) {
        console.log('[PIN-EXTENSION-EVAL] Trying extensions-item-list approach...');
        const itemList = manager.shadowRoot.querySelector('extensions-item-list');
        console.log('[PIN-EXTENSION-EVAL] extensions-item-list found:', !!itemList);
        
        if (itemList) {
          // Check if itemList has shadow root
          if (itemList.shadowRoot) {
            console.log('[PIN-EXTENSION-EVAL] Searching in itemList shadow root...');
            items = itemList.shadowRoot.querySelectorAll('extensions-item');
            console.log('[PIN-EXTENSION-EVAL] Found in shadow root:', items.length);
          }
          // Also check direct children
          if (items.length === 0) {
            console.log('[PIN-EXTENSION-EVAL] Searching direct children of itemList...');
            items = itemList.querySelectorAll('extensions-item');
            console.log('[PIN-EXTENSION-EVAL] Found as direct children:', items.length);
          }
          // Try nested selectors
          if (items.length === 0) {
            console.log('[PIN-EXTENSION-EVAL] Trying nested selectors...');
            items = itemList.querySelectorAll('* > extensions-item, extensions-item');
            console.log('[PIN-EXTENSION-EVAL] Found with nested selectors:', items.length);
          }
        }
      }
      
      // If still not found, try alternative selectors
      if (items.length === 0) {
        // Try different possible selectors in the manager shadow root
        items = manager.shadowRoot.querySelectorAll('extensions-item-list > extensions-item');
      }
      if (items.length === 0) {
        items = manager.shadowRoot.querySelectorAll('[role="listitem"]');
      }
      if (items.length === 0) {
        // Try to find any cards or items
        items = manager.shadowRoot.querySelectorAll('extensions-card, .extension-card, [class*="extension"]');
      }
      
      // Last resort: look for any clickable elements that might be extension cards
      if (items.length === 0) {
        const itemList = manager.shadowRoot.querySelector('extensions-item-list');
        if (itemList) {
          // Log what's inside the list for debugging
          const searchScope = itemList.shadowRoot || itemList;
          const allChildren = Array.from(searchScope.querySelectorAll('*'));
          const directChildren = Array.from(itemList.children || []);
          
          console.log(`extensions-item-list found with ${allChildren.length} total children, ${directChildren.length} direct children`);
          
          if (directChildren.length > 0) {
            console.log('Direct children tags:', directChildren.map(el => el.tagName.toLowerCase()));
          }
          
          // Filter for elements that look like extension cards (have buttons, have text, etc.)
          items = allChildren.filter(el => {
            const hasButtons = el.querySelector('button, a');
            const hasText = el.textContent && el.textContent.trim().length > 0;
            const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
            return hasButtons && hasText && isVisible;
          });
          
          // If still nothing, just use the first direct child that's not a text node
          if (items.length === 0 && directChildren.length > 0) {
            const firstChild = directChildren.find(el => el.nodeType === 1); // Element node
            if (firstChild) {
              console.log('Using first direct child as extension item:', firstChild.tagName);
              items = [firstChild];
            }
          }
        }
      }
      
      // Log what we found for debugging
      console.log('[PIN-EXTENSION-EVAL] Final item count:', items.length, 'extension items found');
      
      if (items.length === 0) {
        console.log('[PIN-EXTENSION-EVAL] ⚠️  No extension items found, gathering diagnostic info...');
        // Get detailed diagnostic info
        const allElements = Array.from(manager.shadowRoot.querySelectorAll('*'));
        console.log('[PIN-EXTENSION-EVAL] Total elements in manager shadow root:', allElements.length);
        
        const elementTypes = {};
        const elementDetails = [];
        
        allElements.forEach(el => {
          const tag = el.tagName.toLowerCase();
          elementTypes[tag] = (elementTypes[tag] || 0) + 1;
          
          // Capture important details
          if (tag.includes('extension') || tag.includes('item') || tag.includes('card') || tag.includes('list')) {
            elementDetails.push({
              tag: tag,
              id: el.id || '',
              class: el.className || '',
              text: (el.textContent || '').substring(0, 50)
            });
          }
        });
        
        console.log('[PIN-EXTENSION-EVAL] Element types distribution:', elementTypes);
        console.log('[PIN-EXTENSION-EVAL] Extension-related elements:', elementDetails);
        
        console.log('Available elements in shadow DOM:', elementTypes);
        console.log('Extension-related elements:', elementDetails);
        
        // Try to find the extensions list view
        const listView = manager.shadowRoot.querySelector('extensions-item-list, #items-list, [role="list"]');
        if (listView) {
          console.log('Found list view element:', listView.tagName);
          const listItems = listView.querySelectorAll('*');
          console.log(`List view has ${listItems.length} child elements`);
        }
        
        throw new Error(`No extension items found. Found ${allElements.length} total elements. Available element types: ${Object.keys(elementTypes).join(', ')}`);
      }

        // Use the first extension item (most recently added should be first)
        console.log('[PIN-EXTENSION-EVAL] 🎯 Selecting first extension item...');
        const firstItem = items[0];
        console.log(`[PIN-EXTENSION-EVAL] ✅ Using first extension item (${items.length} total found)`);
        console.log(`[PIN-EXTENSION-EVAL] First item tag:`, firstItem.tagName);
        console.log(`[PIN-EXTENSION-EVAL] Has shadow root:`, !!firstItem.shadowRoot);
        
        // Capture the extension ID from the first item
        let extensionId = null;
        try {
          extensionId = firstItem.getAttribute('id');
          if (!extensionId && firstItem.shadowRoot) {
            // Try to find extension ID in the shadow root
            const idElement = firstItem.shadowRoot.querySelector('[data-extension-id]');
            if (idElement) {
              extensionId = idElement.getAttribute('data-extension-id');
            }
          }
          console.log('[PIN-EXTENSION-EVAL] Captured extension ID:', extensionId);
        } catch (e) {
          console.log('[PIN-EXTENSION-EVAL] Could not capture extension ID from item:', e.message);
        }

      // Find the Details button - try multiple methods
      console.log('[PIN-EXTENSION-EVAL] 🔍 Searching for Details button...');
      let detailsButton = null;

      // Method 1: Check if extension-item has shadow root (look for cr-button#detailsButton)
      if (firstItem.shadowRoot) {
        console.log('[PIN-EXTENSION-EVAL] Method 1: Checking extension-item shadow root...');
        detailsButton = firstItem.shadowRoot.querySelector('#detailsButton');
        console.log('[PIN-EXTENSION-EVAL]   - Selector #detailsButton:', !!detailsButton);
        
        if (!detailsButton) {
          // Try other selectors
          console.log('[PIN-EXTENSION-EVAL]   - Trying alternative selectors...');
          detailsButton = firstItem.shadowRoot.querySelector('cr-button#detailsButton, cr-button[id="detailsButton"]');
          console.log('[PIN-EXTENSION-EVAL]   - Alternative selectors:', !!detailsButton);
        }
        if (!detailsButton) {
          // Try looking for any cr-button with Details text
          console.log('[PIN-EXTENSION-EVAL]   - Searching by button text...');
          const allButtons = firstItem.shadowRoot.querySelectorAll('cr-button');
          console.log('[PIN-EXTENSION-EVAL]   - Found cr-buttons:', allButtons.length);
          
          for (const btn of allButtons) {
            const text = btn.textContent?.trim() || '';
            console.log('[PIN-EXTENSION-EVAL]     - Button text:', text.substring(0, 20));
            if (text.toLowerCase().includes('details')) {
              detailsButton = btn;
              console.log('[PIN-EXTENSION-EVAL] ✅ Found Details button by text in shadow root');
              break;
            }
          }
        }
      }

      // Method 2: Direct children (look for cr-button) - if not in shadow root
      if (!detailsButton) {
        console.log('[PIN-EXTENSION-EVAL] Method 2: Checking direct children...');
        detailsButton = firstItem.querySelector('#detailsButton, cr-button#detailsButton');
        console.log('[PIN-EXTENSION-EVAL]   - Direct query result:', !!detailsButton);
        
        if (!detailsButton) {
          const directButtons = firstItem.querySelectorAll('cr-button');
          console.log('[PIN-EXTENSION-EVAL]   - Direct cr-buttons found:', directButtons.length);
          
          for (const btn of directButtons) {
            if (btn.id === 'detailsButton') {
              detailsButton = btn;
              console.log('[PIN-EXTENSION-EVAL] ✅ Found detailsButton by ID');
              break;
            }
          }
        }
      }

      // Method 3: Find by text content (include cr-button in search)
      if (!detailsButton) {
        console.log('[PIN-EXTENSION-EVAL] Method 3: Searching by text content...');
        const searchScope = firstItem.shadowRoot || firstItem;
        const buttons = searchScope.querySelectorAll('cr-button, button, a');
        
        console.log(`[PIN-EXTENSION-EVAL]   - Searching ${buttons.length} buttons...`);
        for (const btn of buttons) {
          const text = btn.textContent?.trim() || btn.getAttribute('aria-label') || '';
          console.log(`[PIN-EXTENSION-EVAL]     - Checking:`, text.substring(0, 30));
          if (text.toLowerCase().includes('details')) {
            detailsButton = btn;
            console.log('[PIN-EXTENSION-EVAL] ✅ Found Details button by text content');
            break;
          }
        }
      }
      
      // Method 4: If still not found, try searching in all children recursively
      if (!detailsButton) {
        console.log('[PIN-EXTENSION-EVAL] Method 4: Recursive search...');
        const searchScope = firstItem.shadowRoot || firstItem;
        const allElements = searchScope.querySelectorAll('*');
        console.log(`[PIN-EXTENSION-EVAL]   - Searching ${allElements.length} elements recursively...`);
        for (const el of allElements) {
          const tagName = el.tagName?.toUpperCase();
          if ((tagName === 'CR-BUTTON' || tagName === 'BUTTON' || tagName === 'A') && 
              (el.id === 'detailsButton' || el.textContent?.trim().toLowerCase().includes('details'))) {
            detailsButton = el;
            console.log(`Found Details button: ${tagName} with id=${el.id}`);
            break;
          }
        }
      }

      if (!detailsButton) {
        throw new Error('Details button not found in extension card');
      }

        // Click the Details button
        detailsButton.click();
        return { success: true, extensionId: extensionId };
      });

      if (!evalResult || !evalResult.success) {
        throw new Error('Failed to click Details button');
      }

      if (evalResult.extensionId && !capturedExtensionId) {
        capturedExtensionId = evalResult.extensionId;
        console.log('✅ Captured Chrome extension ID from element:', capturedExtensionId);
      }
      
      console.log('✅ Clicked Details button');
      
      // Wait for navigation to details page
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to capture extension ID from URL if not already captured
      if (!capturedExtensionId) {
        try {
          currentUrl = page.url();
          console.log('[PIN-EXTENSION] Current URL after clicking Details:', currentUrl);
          // chrome://extensions/?id=<extension-id>
          const urlMatch = currentUrl.match(/[?&]id=([a-p]{32})/i);
          if (urlMatch) {
            capturedExtensionId = urlMatch[1];
            console.log('[PIN-EXTENSION] ✅ Captured Chrome extension ID from URL:', capturedExtensionId);
          } else {
            console.log('[PIN-EXTENSION] ⚠️  Could not find extension ID in URL:', currentUrl);
          }
        } catch (urlErr) {
          console.log('[PIN-EXTENSION] ⚠️  Error getting URL:', urlErr.message);
        }
      }
    } else {
      console.log('[PIN-EXTENSION] ✅ Already on details page, skipping Details button click');
    }

    // Log final captured extension ID
    if (capturedExtensionId) {
      console.log('[PIN-EXTENSION] ✅ Extension ID confirmed:', capturedExtensionId);
    } else {
      console.log('[PIN-EXTENSION] ⚠️  No extension ID captured yet');
    }
    
    // Look for "Pin to Toolbar" toggle in shadow DOM
    console.log('🔍 Looking for "Pin to Toolbar" toggle in shadow DOM...');
    
    // Wait for the extension details page to load
    await page.waitForFunction(() => {
      const manager = document.querySelector('extensions-manager');
      if (!manager || !manager.shadowRoot) return false;
      const detailView = manager.shadowRoot.querySelector('extensions-detail-view');
      return detailView !== null;
    }, { timeout: 10000 }).catch(() => {
      console.log('⚠️ extensions-detail-view not found, continuing anyway...');
    });

    // Wait a bit for the details view to fully render
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find and toggle Pin to Toolbar through shadow DOM
    const pinResult = await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      if (!manager || !manager.shadowRoot) {
        throw new Error('extensions-manager shadow root not found');
      }

      // Find the detail view
      const detailView = manager.shadowRoot.querySelector('extensions-detail-view');
      if (!detailView) {
        throw new Error('extensions-detail-view not found');
      }

      // Find Pin to Toolbar toggle - try multiple methods
      let pinToggle = null;

      // Method 1: Look for extensions-toggle-row with id="pin-to-toolbar"
      if (detailView.shadowRoot) {
        pinToggle = detailView.shadowRoot.querySelector('#pin-to-toolbar, extensions-toggle-row#pin-to-toolbar');
      }

      // Method 2: Direct children
      if (!pinToggle) {
        pinToggle = detailView.querySelector('#pin-to-toolbar, extensions-toggle-row#pin-to-toolbar');
      }

      // Method 3: Find by text content (look for extensions-toggle-row with "Pin to toolbar" text)
      if (!pinToggle) {
        const searchScope = detailView.shadowRoot || detailView;
        const toggleRows = searchScope.querySelectorAll('extensions-toggle-row');
        
        for (const row of toggleRows) {
          const text = row.textContent?.trim() || '';
          if (text.toLowerCase().includes('pin') && text.toLowerCase().includes('toolbar')) {
            pinToggle = row;
            break;
          }
        }
      }

      // Method 4: Fallback to old selectors
      if (!pinToggle) {
        const searchScope = detailView.shadowRoot || detailView;
        pinToggle = searchScope.querySelector('#pinToToolbar, cr-toggle#pinToToolbar, button[aria-label*="Pin"]');
      }

      if (!pinToggle) {
        throw new Error('Pin to Toolbar toggle not found');
      }

      // Check if already pinned
      let isPinned = false;
      const tagName = pinToggle.tagName?.toUpperCase();
      
      if (tagName === 'EXTENSIONS-TOGGLE-ROW') {
        // Check if the toggle row has a checked state
        const toggle = pinToggle.shadowRoot?.querySelector('cr-toggle');
        if (toggle) {
          isPinned = toggle.checked || toggle.hasAttribute('checked');
        } else {
          // Check if it has a checked attribute or class
          isPinned = pinToggle.hasAttribute('checked') || pinToggle.classList.contains('checked');
        }
      } else if (tagName === 'CR-TOGGLE') {
        isPinned = pinToggle.checked || pinToggle.hasAttribute('checked');
      } else if (tagName === 'INPUT') {
        isPinned = pinToggle.checked;
      } else if (tagName === 'BUTTON') {
        isPinned = pinToggle.classList.contains('checked') || 
                   pinToggle.getAttribute('aria-pressed') === 'true';
      }

      if (isPinned) {
        return { alreadyPinned: true };
      }

      // Click the toggle to pin the extension to the toolbar
      console.log('Clicking pin toggle...');
      pinToggle.click();
      
      // For extensions-toggle-row, we might need to click the cr-toggle inside
      const toggleTagName = pinToggle.tagName?.toUpperCase();
      if (toggleTagName === 'EXTENSIONS-TOGGLE-ROW') {
        const innerToggle = pinToggle.shadowRoot?.querySelector('cr-toggle');
        if (innerToggle) {
          console.log('Found inner cr-toggle, clicking it as well...');
          innerToggle.click();
        }
      }
      
      return { clicked: true };
    });

    if (pinResult.alreadyPinned) {
      console.log('[PIN-EXTENSION] ✅ Extension is already pinned to toolbar');
      return { success: true, alreadyPinned: true, chromeExtensionId: capturedExtensionId };
    }

    console.log('[PIN-EXTENSION] ✅ Toggle clicked, waiting for state to update...');
    console.log('[PIN-EXTENSION] Pin result:', pinResult);
    // Wait longer for the action to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify it's now pinned
    console.log('[PIN-EXTENSION] 🔍 Verifying pin state...');
    const verifyResult = await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      if (!manager || !manager.shadowRoot) {
        console.log('No manager or shadow root');
        return { pinned: false, reason: 'no_manager' };
      }

      const detailView = manager.shadowRoot.querySelector('extensions-detail-view');
      if (!detailView) {
        console.log('No detail view');
        return { pinned: false, reason: 'no_detail_view' };
      }

      let pinToggle = null;
      if (detailView.shadowRoot) {
        pinToggle = detailView.shadowRoot.querySelector('#pin-to-toolbar, extensions-toggle-row#pin-to-toolbar');
      }
      if (!pinToggle) {
        pinToggle = detailView.querySelector('#pin-to-toolbar, extensions-toggle-row#pin-to-toolbar');
      }

      if (!pinToggle) {
        console.log('Pin toggle not found');
        return { pinned: false, reason: 'toggle_not_found' };
      }

      const tagName = pinToggle.tagName?.toUpperCase();
      console.log(`Found toggle with tag: ${tagName}`);
      
      let isPinned = false;
      if (tagName === 'EXTENSIONS-TOGGLE-ROW') {
        const toggle = pinToggle.shadowRoot?.querySelector('cr-toggle');
        if (toggle) {
          isPinned = toggle.checked || toggle.hasAttribute('checked');
          console.log(`Inner toggle checked: ${isPinned}`);
        } else {
          isPinned = pinToggle.hasAttribute('checked') || pinToggle.classList.contains('checked');
          console.log(`Toggle row checked (no inner toggle): ${isPinned}`);
        }
      } else if (tagName === 'CR-TOGGLE') {
        isPinned = pinToggle.checked || pinToggle.hasAttribute('checked');
        console.log(`cr-toggle checked: ${isPinned}`);
      } else if (tagName === 'INPUT') {
        isPinned = pinToggle.checked;
        console.log(`input checked: ${isPinned}`);
      } else if (tagName === 'BUTTON') {
        isPinned = pinToggle.classList.contains('checked') || 
                   pinToggle.getAttribute('aria-pressed') === 'true';
        console.log(`button checked: ${isPinned}`);
      }
      
      return { pinned: isPinned, tagName };
    });
    
    console.log('[PIN-EXTENSION] Verification result received:', verifyResult);
    const isPinned = verifyResult.pinned || verifyResult === true;
    console.log('[PIN-EXTENSION] Is pinned:', isPinned);

    if (isPinned) {
      console.log('[PIN-EXTENSION] ✅ Extension successfully pinned to toolbar');
      return { success: true, pinned: true, chromeExtensionId: capturedExtensionId };
    } else {
      console.log('[PIN-EXTENSION] ⚠️  Pin toggle clicked but state not verified as pinned');
      console.log('[PIN-EXTENSION] Verification result:', JSON.stringify(verifyResult, null, 2));
      // Still return success since we clicked it - the state might update later
      return { success: true, pinned: false, warning: 'State verification failed', verifyResult, chromeExtensionId: capturedExtensionId };
    }

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
    console.error('[PIN-EXTENSION] ❌ Extension pinning failed');
    console.error('[PIN-EXTENSION] Error message:', err.message);
    console.error('[PIN-EXTENSION] Error stack:', err.stack);
    console.error('[PIN-EXTENSION] Error details:', err);
    return { success: false, error: err.message, stack: err.stack, chromeExtensionId: null };
  } finally {
    console.log('[PIN-EXTENSION] 🏁 Pin extension flow complete');
    // Don't close the browser - let the session continue
    // The browser/page will be cleaned up when the session ends
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

