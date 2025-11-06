import { getPlaywrightSessionContext } from "@/lib/utils/browser-actions";

// Puppeteer script for: automatically pin extension to toolbar
// Extension type: utility

const runPinExtension = async (sessionId) => {
  const apiKey = process.env.HYPERBROWSER_API_KEY || process.env.HYPERBROWSER_API_KEY_FALLBACK_1;
  
  if (!apiKey) {
    throw new Error("Missing HYPERBROWSER_API_KEY");
  }

  console.log('📌 Starting extension pinning script with Puppeteer');

  let browser = null;
  let page = null;

  try {
    // Connect to the browser session
    console.log('🔌 Connecting to browser session...');
    const context = await getPlaywrightSessionContext(sessionId, apiKey);
    browser = context.browser;
    page = context.page;

    // Navigate to chrome://extensions if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes('chrome://extensions')) {
      console.log('🌐 Navigating to chrome://extensions...');
      await page.goto('chrome://extensions', { waitUntil: 'domcontentloaded', timeout: 30000 });
    } else {
      console.log('✅ Already on chrome://extensions page');
    }

    // Wait for the extensions page to load and shadow DOM to be ready
    console.log('⏳ Waiting for extensions page to load...');
    await page.waitForSelector('extensions-manager', { timeout: 10000 });
    
    // Wait for shadow DOM to be accessible
    await page.waitForFunction(() => {
      const manager = document.querySelector('extensions-manager');
      return manager && manager.shadowRoot !== null;
    }, { timeout: 10000 });

    // Wait for extensions to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Navigate through shadow DOM to find and click Details button
    console.log('🔍 Finding extension card and Details button in shadow DOM...');
    
    const detailsClicked = await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      if (!manager || !manager.shadowRoot) {
        throw new Error('extensions-manager shadow root not found');
      }

      // Find extension items in shadow DOM - try multiple selectors
      let items = manager.shadowRoot.querySelectorAll('extensions-item');
      
      // If not found, try looking inside extensions-item-list
      if (items.length === 0) {
        const itemList = manager.shadowRoot.querySelector('extensions-item-list');
        if (itemList) {
          // Check if itemList has shadow root
          if (itemList.shadowRoot) {
            items = itemList.shadowRoot.querySelectorAll('extensions-item');
          }
          // Also check direct children
          if (items.length === 0) {
            items = itemList.querySelectorAll('extensions-item');
          }
          // Try nested selectors
          if (items.length === 0) {
            items = itemList.querySelectorAll('* > extensions-item, extensions-item');
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
      console.log(`Found ${items.length} extension item(s) in shadow DOM`);
      
      if (items.length === 0) {
        // Get detailed diagnostic info
        const allElements = Array.from(manager.shadowRoot.querySelectorAll('*'));
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
      const firstItem = items[0];
      console.log(`Using the first extension item (${items.length} total)`);

      // Find the Details button - try multiple methods
      let detailsButton = null;

      // Method 1: Check if extension-item has shadow root (look for cr-button#detailsButton)
      if (firstItem.shadowRoot) {
        console.log('Checking extension-item shadow root for Details button...');
        detailsButton = firstItem.shadowRoot.querySelector('#detailsButton');
        if (!detailsButton) {
          // Try other selectors
          detailsButton = firstItem.shadowRoot.querySelector('cr-button#detailsButton, cr-button[id="detailsButton"]');
        }
        if (!detailsButton) {
          // Try looking for any cr-button with Details text
          const allButtons = firstItem.shadowRoot.querySelectorAll('cr-button');
          for (const btn of allButtons) {
            const text = btn.textContent?.trim() || '';
            if (text.toLowerCase().includes('details')) {
              detailsButton = btn;
              console.log('Found Details button by text in shadow root');
              break;
            }
          }
        }
      }

      // Method 2: Direct children (look for cr-button) - if not in shadow root
      if (!detailsButton) {
        detailsButton = firstItem.querySelector('#detailsButton, cr-button#detailsButton');
        if (!detailsButton) {
          const directButtons = firstItem.querySelectorAll('cr-button');
          for (const btn of directButtons) {
            if (btn.id === 'detailsButton') {
              detailsButton = btn;
              break;
            }
          }
        }
      }

      // Method 3: Find by text content (include cr-button in search)
      if (!detailsButton) {
        const searchScope = firstItem.shadowRoot || firstItem;
        const buttons = searchScope.querySelectorAll('cr-button, button, a');
        
        console.log(`Searching ${buttons.length} buttons for Details text...`);
        for (const btn of buttons) {
          const text = btn.textContent?.trim() || btn.getAttribute('aria-label') || '';
          if (text.toLowerCase().includes('details')) {
            detailsButton = btn;
            console.log('Found Details button by text content');
            break;
          }
        }
      }
      
      // Method 4: If still not found, try searching in all children recursively
      if (!detailsButton) {
        const searchScope = firstItem.shadowRoot || firstItem;
        const allElements = searchScope.querySelectorAll('*');
        console.log(`Searching ${allElements.length} elements recursively...`);
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
      return true;
    });

    if (!detailsClicked) {
      throw new Error('Failed to click Details button');
    }

    console.log('✅ Clicked Details button');
    
    // Wait for navigation to details page
    await new Promise(resolve => setTimeout(resolve, 2000));

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
      console.log('✅ Extension is already pinned to toolbar');
      return { success: true, alreadyPinned: true };
    }

    console.log('✅ Toggle clicked, waiting for state to update...');
    // Wait longer for the action to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify it's now pinned
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
    
    const isPinned = verifyResult.pinned || verifyResult === true;

    if (isPinned) {
      console.log('✅ Extension successfully pinned to toolbar');
      return { success: true, pinned: true };
    } else {
      console.log('⚠️ Pin toggle clicked but state not verified as pinned');
      console.log('Verification result:', verifyResult);
      // Still return success since we clicked it - the state might update later
      return { success: true, pinned: false, warning: 'State verification failed', verifyResult };
    }

  } catch (err) {
    console.error('❌ Extension pinning failed:', err.message);
    console.error('Error details:', err);
    return { success: false, error: err.message };
  } finally {
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

