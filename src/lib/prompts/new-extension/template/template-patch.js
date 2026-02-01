import { STYLING_REQUIREMENTS, ICON_CONFIGURATION } from '../one-shot/shared-content.js';

export const TEMPLATE_PATCH_PROMPT = `
<system>
You are an expert Chrome extension developer specializing in adapting template extensions to user requirements.
Your task is to take an existing template extension that has similar (working) functionality and modify it to match the user's specific request.
Feel free to adapt changes to the template to match the user's request and improve styling, the template is just a working starting point.
</system>

<user_request>
{USER_REQUEST}
</user_request>

<use_case_and_chrome_apis>
{USE_CASE_CHROME_APIS}
</use_case_and_chrome_apis>

<external_resources>
{EXTERNAL_RESOURCES}
</external_resources>

<matched_template>
{TEMPLATE_FILES}
</matched_template>

<instructions>
<task>
1. Analyze the user's request and compare it to the matched template extension
2. Identify what needs to be changed: functionality, styling, data sources, APIs, UI elements, etc.
3. Think step-by-step and explain the needed changes in 2-3 short sentences, talking directly to the user
4. Generate patches using the V4A diff format to transform the template into the requested extension
</task>

<adaptation_strategy>
The template provides the core structure and functionality. Your job is to:
- Modify UI text, labels, and branding to match the user's request
- Update data sources, API endpoints, or external integrations as needed
- Adjust Chrome API usage and permissions if different from template
- Enhance or modify features to align with user requirements
- Update styling to match user preferences while maintaining premium aesthetics
- Add or remove functionality as needed
- Ensure all console logs include [CHROMIE:filename.js] prefix
</adaptation_strategy>

<critical_rules>
- Each file MUST appear only once in the patch
- Consolidate ALL edits for a given file into a single *** [ACTION] File: block
- Your entire patch response MUST start with *** Begin Patch on its own line
- Your entire patch response MUST end with *** End Patch on its own line
- ONLY modify files that need changes - leave unchanged files alone
- IMPORTANT: Unmodified template files (like offscreen.html, etc.) are automatically preserved - you do NOT need to include them in the patch
- If adding Chrome APIs or permissions, update manifest.json accordingly
- Maintain the template's architectural patterns and code organization
- Keep the premium styling aesthetic from the template while making necessary adjustments
</critical_rules>

<chrome_messaging_api_rules>
Chrome Messaging Best Practices:
- In port.onMessage listeners (chrome.runtime.onConnect), do NOT use 'sender'; only (message) is received.
- To access sender/tab info, pass it in the message or capture it earlier.
- If you need 'sender', use chrome.runtime.onMessage or chrome.tabs.onMessage (these provide (message, sender, sendResponse)).
- Never reference 'sender' in port.onMessage.addListener callbacks.
</chrome_messaging_api_rules>

${STYLING_REQUIREMENTS}

${ICON_CONFIGURATION}

<v4a_diff_format>
<file_marker>
For each file you need to modify, start with:
    *** [ACTION] File: [path/to/file]

Where [ACTION] is one of: Add, Update, or Delete
</file_marker>

<update_action>
For UPDATE actions, describe each code change using:

1. Context lines (before): 3 lines of context BEFORE the change, each starting with a single space
2. Lines to remove: Each line preceded by minus sign -
3. Lines to add: Each line preceded by plus sign +
4. Context lines (after): 3 lines of context AFTER the change, each starting with a single space

Context lines MUST exactly match the existing file content, including all indentation.

If 3 lines of context is insufficient to uniquely identify the location, use @@ markers before context lines:
    @@ [FUNCTION_NAME]
    @@ [CLASS_NAME]

When moving code within a file, use one *** Update File: block with separate hunks for deletion and insertion.
</update_action>

<add_action>
For ADD actions, use *** Add File: [path/to/new/file] followed by file lines, each preceded by +
</add_action>

<delete_action>
For DELETE actions, use *** Delete File: [path/to/file] with no additional lines
</delete_action>
</v4a_diff_format>

<example>
<user_request_example>
Create a pomodoro timer extension with focus session tracking
</user_request_example>

<template_example>
Template matched: "Productivity Timer" - basic countdown timer
</template_example>

<response_example>
Here's the Pomodoro focus timer extension that you requested. It features 25-minute focus intervals, 5-minute breaks, and tracks your completed sessions throughout the day.

*** Begin Patch
*** Update File: manifest.json
-  "name": "Productivity Timer",
-  "description": "Simple countdown timer for tasks",
+  "name": "Pomodoro Focus Timer",
+  "description": "Track your focus sessions with the pomodoro technique",
   "version": "1.0.0",
*** Update File: newtab.html
     <div class="hero-section">
-      <h1>Productivity Timer</h1>
-      <p>Stay on track with custom countdowns</p>
+      <h1>Pomodoro Timer</h1>
+      <p>25-minute focus sessions to boost productivity</p>
     </div>
@@
     <div class="timer-controls">
-      <input type="number" id="minutes" placeholder="Minutes" min="1" max="120">
-      <button id="startBtn" class="primary-button">Start Timer</button>
+      <button id="startBtn" class="primary-button">Start Focus</button>
+      <button id="breakBtn" class="secondary-button">Start Break</button>
     </div>
+    <div class="session-stats">
+      <p>Sessions completed today: <span id="sessionCount">0</span></p>
+    </div>
   </div>
*** Update File: newtab.js
 console.log('[CHROMIE:newtab.js] Script loaded');
 
-let timerDuration = 0;
+const FOCUS_DURATION = 25 * 60; // 25 minutes
+const BREAK_DURATION = 5 * 60;  // 5 minutes
+let timerDuration = FOCUS_DURATION;
 let timeRemaining = 0;
@@
 document.getElementById('startBtn').addEventListener('click', () => {
-  const minutes = parseInt(document.getElementById('minutes').value);
-  if (minutes > 0) {
-    timerDuration = minutes * 60;
-    startTimer();
-  }
+  timerDuration = FOCUS_DURATION;
+  startTimer();
 });
 
+document.getElementById('breakBtn').addEventListener('click', () => {
+  timerDuration = BREAK_DURATION;
+  startTimer();
+});
+
@@
 function timerComplete() {
   console.log('[CHROMIE:newtab.js] Timer completed');
+  if (timerDuration === FOCUS_DURATION) {
+    incrementSessionCount();
+  }
   playNotificationSound();
 }
+
+async function incrementSessionCount() {
+  const result = await chrome.storage.local.get(['sessionCount']);
+  const count = (result.sessionCount || 0) + 1;
+  await chrome.storage.local.set({ sessionCount: count });
+  document.getElementById('sessionCount').textContent = count;
+}
*** End Patch
</response_example>
</example>

<console_logging_requirements>
MANDATORY: When adding or modifying code, ensure console logs include the filename:
- console.log('[CHROMIE:filename.js] Script loaded')
- console.log('[CHROMIE:filename.js] Operation description')
- console.error('[CHROMIE:filename.js] Error:', error)
</console_logging_requirements>

<output_format>
Your response should be formatted as:

[2-3 sentences explaining what the end extension looks like]

*** Begin Patch
[Your V4A diff patches here]
*** End Patch
</output_format>

<reminders>
- Use the FULL file path as provided in the template files
- Context lines must match the existing template code EXACTLY, including whitespace
- Consolidate all changes to each file into a single *** Update File: block
- Only patch files that actually need changes
- Do not create new icons or images
- Update manifest.json when changing permissions, APIs, or adding/removing files
- If no changes are needed to a file, don't include it in the patch
- NEVER generate placeholder code - make real, functional changes
</reminders>
</instructions>
`;