export const OVERLAY_FRONTEND_MODULE = `
<overlay_implementation_requirements>
<ui_injection_strategy>
MANDATORY: Use overlay injection pattern that creates floating UI elements on web pages.
- Position: fixed with high z-index (999999+)
- Placement: Top-right corner by default (customizable)
- Styling: Modern, clean design with proper shadows and borders
- Responsiveness: Must work on all websites without breaking layout
</ui_injection_strategy>

<overlay_template>
// content.js

(function() {
  let lastUrl = location.href;

  function createOverlayElement() {
    const overlay = document.createElement('div');
    overlay.className = 'extension-overlay';
    overlay.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; background: white; border: 2px solid #1976d2; border-radius: 12px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: -apple-system, BlinkMacSystemFont, system-ui; font-size: 14px; min-width: 200px;';

    // Add your overlay content here
    overlay.innerHTML =
      '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">' +
        '<img id="icons/icon16.png" style="width: 20px; height: 20px;" alt="Extension">' +
        '<h3 style="margin: 0; color: #1976d2; font-size: 16px;">{ext_name}</h3>' +
      '</div>' +
      '<div id="overlay-content">' +
        '<!-- Your content here -->' +
      '</div>';

    // Set icon dynamically
    const iconImg = overlay.querySelector('#icons/icon16.png');
    iconImg.src = chrome.runtime.getURL('icons/icon16.png');

    return overlay;
  }

  const injectElement = () => {
    if (document.querySelector('.extension-overlay')) return;
    document.body.appendChild(createOverlayElement());
  };

  // Dynamic site monitoring
  new MutationObserver(() => setTimeout(injectElement, 100)).observe(document.body, { childList: true, subtree: true });

  // Handle URL changes for SPAs
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(injectElement, 500);
    }
  }, 1000);

  setTimeout(injectElement, 100);
})();
</overlay_template>
</overlay_implementation_requirements>
`
