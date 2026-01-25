export const METRICS_INTEGRATION_PROMPT = `
<system>
You are a Chrome extension developer integrating the @chromieee/metrics SDK into vanilla JS extensions.
Use ESM imports and modern Chrome extension patterns.
</system>

<user_request>
Integrate @chromieee/metrics SDK for analytics tracking.
API Key: {API_KEY}
</user_request>

<existing_files>
{EXISTING_FILES}
</existing_files>

<metrics_sdk_guide>
# @chromieee/metrics Integration

## ESM Files (Pre-added to Extension, assume they exist)
- \`chromie-metrics.esm.js\` - Background script SDK
- \`content.esm.js\` - Content script client
- \`popup.esm.js\` - Popup/options client

## Required Manifest Structure
Background must be a module:
\`\`\`json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "permissions": ["storage"]
}
\`\`\`

## Integration Patterns

### Background Script (REQUIRED)
\`\`\`javascript
import { ChromieMetrics } from './chromie-metrics.esm.js';

const metrics = ChromieMetrics.init({
  apiKey: '{API_KEY}',
  debug: false
});

// Track events (synchronous)
metrics.trackEvent('extension_loaded', { version: '1.0' });
metrics.trackButtonClick('icon', { context: 'toolbar' });

// Common patterns
chrome.action.onClicked.addListener((tab) => {
  metrics.trackButtonClick('extension_icon', { tabUrl: tab.url });
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  metrics.trackEvent('message_received', { type: msg.type });
});
\`\`\`

### Content Script (OPTIONAL)
\`\`\`javascript
import { ChromieMetricsClient } from './content.esm.js';

const metrics = ChromieMetricsClient.init();

// Auto-captures URL and title
await metrics.trackPageView();
await metrics.trackButtonClick('save_btn', { context: 'page' });
await metrics.trackEvent('custom:feature_used', { feature: 'highlighter' });

// Error tracking
window.addEventListener('error', async (e) => {
  await metrics.trackError(e.error, { message: e.message });
});
\`\`\`

### Popup/Options (OPTIONAL)
HTML:
\`\`\`html
<script type="module" src="popup.js"></script>
\`\`\`

JavaScript:
\`\`\`javascript
import { ChromieMetricsClient } from './popup.esm.js';

const metrics = ChromieMetricsClient.init();

await metrics.trackPageView('popup_opened');

document.getElementById('btn').addEventListener('click', async () => {
  await metrics.trackButtonClick('settings_save');
  await metrics.trackEvent('settings_changed', { theme: 'dark' });
});
\`\`\`

## Common Events
\`\`\`javascript
// UI interactions
metrics.trackButtonClick(buttonId, metadata);
metrics.trackPageView(viewName);

// Features
metrics.trackEvent('custom:feature_used', { feature: 'export' });

// API calls
metrics.trackEvent('api_call', { endpoint: '/sync', status: 200 });

// Errors
metrics.trackError(error, { context: 'sync_failed' });
\`\`\`
</metrics_sdk_guide>

<instructions>
1. Identify background script, content scripts, and popup/options files
2. Add ESM imports for metrics SDK in each context
3. Initialize SDK with API key in background script
4. Add tracking for key user interactions and events
5. Update manifest.json:
   - Ensure background.type = "module"
   - Add "storage" permission if missing
   - Update content_scripts to load content.esm.js before content script
6. Update HTML files to use type="module" for scripts
7. Explain changes briefly, then provide V4A diff patch

<critical_rules>
- Each file appears ONLY ONCE in the patch
- Patch MUST start with \`*** Begin Patch\`
- Patch MUST end with \`*** End Patch\`
- Use ESM imports: \`import { ChromieMetrics } from './chromie-metrics.esm.js'\`
- Background methods are sync, content/popup methods are async
- Always add "storage" permission
- Background must have "type": "module"
- HTML scripts must have type="module"
</critical_rules>

<v4a_diff_format>
File marker: \`*** [ACTION] File: path/to/file\` where ACTION = Add, Update, or Delete

Update format:
- 3 context lines before (space prefix)
- Lines to remove (- prefix)
- Lines to add (+ prefix)
- 3 context lines after (space prefix)

Use @@ markers if context is insufficient:
\`\`\`
@@ functionName
 context line
-old line
+new line
 context line
\`\`\`
</v4a_diff_format>

<example>
*** Begin Patch
*** Update File: background.js
+import { ChromieMetrics } from './chromie-metrics.esm.js';
+
+const metrics = ChromieMetrics.init({
+  apiKey: '{API_KEY}',
+  debug: false
+});
+
 chrome.action.onClicked.addListener((tab) => {
+  metrics.trackButtonClick('extension_icon', { tabUrl: tab.url });
   console.log('Clicked');
 });
*** Update File: popup.html
 <head>
-  <script src="popup.js"></script>
+  <script type="module" src="popup.js"></script>
 </head>
*** Update File: popup.js
+import { ChromieMetricsClient } from './popup.esm.js';
+
+const metrics = ChromieMetricsClient.init();
+await metrics.trackPageView('popup_opened');
+
 document.getElementById('btn').addEventListener('click', async () => {
+  await metrics.trackButtonClick('action_btn');
   // existing code
 });
*** Update File: manifest.json
   "background": {
-    "service_worker": "background.js"
+    "service_worker": "background.js",
+    "type": "module"
   },
   "permissions": [
-    "tabs"
+    "tabs",
+    "storage"
   ]
*** End Patch
</example>

<reminders>
- ESM files are pre-added by the system (don't create them)
- Track meaningful interactions, not every event
- Content/popup clients use await, background doesn't
- Manifest must have background.type = "module" and storage permission
- Context lines must match existing code exactly
</reminders>
</instructions>
`;