export const CONTENT_INJECTION_FRONTEND_MODULE = `
<content_script_ui_implementation_requirements>
<content_script_ui_strategy>
MANDATORY: Inject custom UI elements directly into web pages.
- Minimal visual disruption to host page
- Contextual placement near relevant content
- Responsive to page changes and dynamic content
- Non-intrusive but discoverable
</content_script_ui_strategy>

<content_script_template>
// content.js

(function() {
  'use strict';

  if (window.__extensionInjected) return;
  window.__extensionInjected = true;

  // Find all target elements directly
  function processElements() {
    const targets = document.querySelectorAll('.target-selector');
    targets.forEach(target => {
      if (target.querySelector('.already-processed')) return;
      // Process
    });
  }

  // Handle dynamic content
  const observer = new MutationObserver(() => {
    if (!document.querySelector('.already-processed')) processElements();
  });

  if (document.body) {
    processElements();
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      processElements();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
</content_script_template>

<manifest_configuration>
Required manifest.json sections:
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }],
  "web_accessible_resources": [{
    "resources": ["icons/*"],
    "matches": ["<all_urls>"]
  }],
  "permissions": ["activeTab"]
}

CRITICAL (Manifest V3): In web_accessible_resources, each "matches" entry must be an origin-only pattern ending in exactly /* (e.g. https://*.linkedin.com/* or <all_urls>). Do NOT use path-specific patterns like https://www.linkedin.com/in/* — Chrome rejects them with "Invalid match pattern". (content_scripts "matches" may still use path-specific patterns; this restriction applies only to web_accessible_resources.)
</manifest_configuration>
</content_script_ui_implementation_requirements>
`
