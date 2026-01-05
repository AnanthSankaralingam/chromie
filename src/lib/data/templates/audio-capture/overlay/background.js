// Toggle overlay when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  // Send message to content script to toggle overlay
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'toggle-overlay' });
  } catch (error) {
    console.error('Error toggling overlay:', error);
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'start-capture') {
    handleStartCapture();
    sendResponse({ received: true });
  } else if (message.type === 'recording-complete') {
    // Forward recording data to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'recording-complete',
          data: message.data
        });
      }
    });
    sendResponse({ received: true });
  }
  return true; // Keep message channel open for async responses
});

async function handleStartCapture() {
  try {
    // Get current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      throw new Error('No active tab found');
    }

    const tab = tabs[0];

    // Validate tab URL
    if (!tab.url || !tab.url.startsWith('http')) {
      throw new Error('Cannot capture this page. Navigate to a regular webpage.');
    }

    // Get stream ID for tab capture
    const streamId = await chrome.tabCapture.getMediaStreamId({ 
      targetTabId: tab.id 
    });

    // Create offscreen document if needed
    const hasDoc = await chrome.offscreen.hasDocument();
    if (!hasDoc) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Recording audio from tab'
      });
    }

    // Send streamId to offscreen document
    chrome.runtime.sendMessage({
      type: 'start-recording',
      streamId
    });

    // Notify content script
    chrome.tabs.sendMessage(tab.id, { type: 'capture-started' });

    // Auto-stop after 4 seconds
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'stop-recording' });
      
      // Close offscreen document after delay
      setTimeout(async () => {
        const stillHasDoc = await chrome.offscreen.hasDocument();
        if (stillHasDoc) {
          await chrome.offscreen.closeDocument();
        }
      }, 1000);
    }, 4000);

  } catch (error) {
    console.error('CHROMIE: Capture error:', error);
    // Send error to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'capture-error',
          error: error.message || 'Failed to start recording'
        });
      }
    });
  }
}
