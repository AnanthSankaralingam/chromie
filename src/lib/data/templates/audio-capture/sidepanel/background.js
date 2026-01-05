// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
  });
  
  // Handle messages from side panel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'start-capture') {
      handleStartCapture();
      sendResponse({ received: true });
    } else if (message.type === 'recording-complete') {
      // Forward recording data to side panel
      chrome.runtime.sendMessage({ 
        type: 'recording-complete', 
        data: message.data 
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
        throw new Error('Cannot capture this page. Navigate to a regular webpage and reopen side panel.');
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
  
      // Notify UI
      chrome.runtime.sendMessage({ type: 'capture-started' });
  
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
      chrome.runtime.sendMessage({
        type: 'capture-error',
        error: error.message || 'Failed to start recording'
      });
    }
  }