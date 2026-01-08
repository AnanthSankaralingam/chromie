console.log('[CHROMIE:content.js] Content script loaded');

// Listen for messages from sidepanel or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[CHROMIE:content.js] Received message:', message);

  switch (message.action) {
    case 'getPageInfo':
      sendResponse(getPageInfo());
      break;
      
    case 'highlightElement':
      highlightElement(message.selector);
      sendResponse({ success: true });
      break;
      
    case 'clickElement':
      clickElement(message.selector);
      sendResponse({ success: true });
      break;
      
    case 'extractText':
      const text = extractText(message.selector);
      sendResponse({ text });
      break;
      
    default:
      console.log('[CHROMIE:content.js] Unknown action:', message.action);
      sendResponse({ error: 'Unknown action' });
  }
  
  return true; // Keep message channel open for async response
});

// Get page information
function getPageInfo() {
  return {
    title: document.title,
    url: window.location.href,
    html: document.documentElement.outerHTML,
    bodyText: document.body.textContent.trim()
  };
}

// Highlight an element temporarily
function highlightElement(selector) {
  const element = document.querySelector(selector);
  if (!element) return;
  
  const originalOutline = element.style.outline;
  const originalBackground = element.style.backgroundColor;
  
  element.style.outline = '3px solid #6366f1';
  element.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
  
  setTimeout(() => {
    element.style.outline = originalOutline;
    element.style.backgroundColor = originalBackground;
  }, 2000);
}

// Click an element
function clickElement(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.click();
    return true;
  }
  return false;
}

// Extract text from an element
function extractText(selector) {
  const element = document.querySelector(selector);
  return element ? element.textContent.trim() : '';
}

// Observe DOM changes and report to background if needed
const observer = new MutationObserver((mutations) => {
  // Can implement DOM change detection here if needed
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('[CHROMIE:content.js] Content script initialized');

