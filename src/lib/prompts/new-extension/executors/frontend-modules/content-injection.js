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

<page_context_and_csp>
When the user wants APIs on the page main world (e.g. window.getProfileData, "page context", same JS realm as the host site):

FORBIDDEN on strict-CSP sites (LinkedIn, X/Twitter, many SPAs):
- Do NOT append a &lt;script&gt; and set .textContent / .innerHTML / .innerText to executable JS — that is inline script and triggers "Executing inline script violates Content Security Policy".
- Do NOT use eval() or new Function() in the page document for this.

ALLOWED patterns (pick one):
1) Service worker calls chrome.scripting.executeScript({ target: { tabId }, files: ["page-bridge.js"], world: "MAIN" }) where page-bridge.js assigns window.yourFn = ... Include "scripting" in permissions and host_permissions for the site. (Injected files do not need web_accessible_resources.) If the entry point is a content script, message the background to run executeScript — content scripts cannot use chrome.scripting directly.
2) From a content script: inject &lt;script src={chrome.runtime.getURL("page-bridge.js")}&gt;&lt;/script&gt; — load from the extension origin, not inline code. List page-bridge.js under web_accessible_resources.resources with origin-only matches.

Note: Assigning to window inside an isolated content script does NOT expose properties to the page; use MAIN world or an extension-URL script tag as above. If the task only needs DOM text/DOM scraping, keep code in the isolated content script and skip MAIN world.
</page_context_and_csp>
</content_script_ui_implementation_requirements>
`
