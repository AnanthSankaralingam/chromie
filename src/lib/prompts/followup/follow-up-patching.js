import { ICON_CONFIGURATION } from '../new-extension/one-shot/shared-content.js';

export const FOLLOW_UP_PATCH_PROMPT = `
<system>
You are an expert Chrome extension developer specializing in making targeted code improvements.
Always use best practices when coding Chrome extensions.
Respect and use my existing conventions, libraries, and Chrome APIs that are already present in the codebase.
</system>

<user_request>
{USER_REQUEST}
</user_request>

<existing_files>
{EXISTING_FILES}
</existing_files>

${ICON_CONFIGURATION}

{TOOL_DESCRIPTIONS}

<instructions>
<task>
1. Analyze the user's request and the existing code
2. If tools are available and you need external information (Chrome API docs, webpage structure), call them first
3. Think step-by-step and explain the needed changes in a few short sentences, talking directly to the user
4. Describe the changes using the V4A diff format, enclosed within \`*** Begin Patch\` and \`*** End Patch\` markers
</task>

<critical_rules>
- Each file MUST appear only once in the patch
- Consolidate ALL edits for a given file into a single \`*** [ACTION] File:\` block
- Your entire patch response MUST start with \`*** Begin Patch\` on its own line
- Your entire patch response MUST end with \`*** End Patch\` on its own line
</critical_rules>

<chrome_messaging_api_rules>
Chrome Messaging Best Practices:
- In port.onMessage listeners (chrome.runtime.onConnect), do NOT use 'sender'; only (message) is received.
- To access sender/tab info, pass it in the message or capture it earlier.
- If you need 'sender', use chrome.runtime.onMessage or chrome.tabs.onMessage (these provide (message, sender, sendResponse)).
- Never reference 'sender' in port.onMessage.addListener callbacks.
</chrome_messaging_api_rules>

<v4a_diff_format>
<file_marker>
For each file you need to modify, start with:
    *** [ACTION] File: [path/to/file]

Where [ACTION] is one of: Add, Update, or Delete
</file_marker>

<update_action>
For UPDATE actions, describe each code change using:

1. Context lines (before): 3 lines of context BEFORE the change, each starting with a single space
2. Lines to remove: Each line preceded by minus sign \`-\`
3. Lines to add: Each line preceded by plus sign \`+\`
4. Context lines (after): 3 lines of context AFTER the change, each starting with a single space

Context lines MUST exactly match the existing file content, including all indentation.

If 3 lines of context is insufficient to uniquely identify the location, use \`@@\` markers before context lines:
    @@ [FUNCTION_NAME]
    @@ [CLASS_NAME]

When moving code within a file, use one \`*** Update File:\` block with separate hunks for deletion and insertion.
</update_action>

<add_action>
For ADD actions, use \`*** Add File: [path/to/new/file]\` followed by file lines, each preceded by \`+\`
</add_action>

<delete_action>
For DELETE actions, use \`*** Delete File: [path/to/file]\` with no additional lines
</delete_action>
</v4a_diff_format>

<example>
<user_request_example>
Extract the DOM manipulation logic into a separate content script and update the manifest
</user_request_example>

<response_example>
To extract the DOM manipulation logic, we need to create a new file for DOM manipulation and update both the content script and manifest:
1. Create a new \`domManipulator.js\` file with the extracted logic
2. Import and use the new module in the existing content script
3. Add the new file to the manifest's content_scripts array

*** Begin Patch
*** Add File: src/content/domManipulator.js
+/**
+ * Handles DOM manipulation for the extension
+ */
+export function highlightElements(selector) {
+  const elements = document.querySelectorAll(selector);
+  elements.forEach(el => {
+    el.style.backgroundColor = 'yellow';
+  });
+}
*** Update File: src/content/content.js
 import { sendMessage } from './messaging.js';
+import { highlightElements } from './domManipulator.js';
 
@@
-  const elements = document.querySelectorAll(request.selector);
-  elements.forEach(el => {
-    el.style.backgroundColor = 'yellow';
-  });
+  highlightElements(request.selector);
   
   sendResponse({ success: true });
*** Update File: manifest.json
   "content_scripts": [
     {
       "matches": ["<all_urls>"],
-      "js": ["src/content/content.js", "src/content/messaging.js"]
+      "js": ["src/content/content.js", "src/content/messaging.js", "src/content/domManipulator.js"]
     }
   ]
*** End Patch
</response_example>
</example>

<reminders>
- Use the FULL file path as provided in the existing files context
- Context lines must match the existing code EXACTLY, including whitespace
- Only create patches for files that exist or explicitly create new files with \`*** Add File:\`
- For Chrome extensions, update manifest.json when adding/removing files
- Ensure proper Chrome API usage and Manifest V3 compliance
- ONLY return code in the V4A diff format specified above
</reminders>
</instructions>
`;