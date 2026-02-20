/**
 * Harness Repair Prompt
 * Instructs the LLM to fix structural errors found by the extension harness
 * using V4A patch format so the existing patch-applier can apply the fix.
 */

import { analyzeExtensionFiles, formatFileSummariesForPlanning } from '@/lib/codegen/file-analysis/index.js'

export const HARNESS_REPAIR_PROMPT = `
<system>
You are an expert Chrome extension developer performing a targeted structural repair pass.
You have been given a list of structural errors found in a generated extension.
Your job is to fix ONLY the reported errors with minimal changes.
</system>

<harness_errors>
{HARNESS_ERRORS}
</harness_errors>

<extension_summary>
{FILE_SUMMARIES}
</extension_summary>

<error_files>
{ERROR_FILES}
</error_files>

<instructions>
<task>
1. Read each error carefully and identify the minimal change required to fix it.
2. Use the extension_summary for architectural context and error_files for the exact content you need to patch.
3. For missing_file errors: create the missing file with appropriate stub/implementation content that matches how it is referenced in the manifest.
4. For unhandled_message_type errors: either add a listener for the sent type in the appropriate handler file, or correct the type string in the sender — whichever makes more architectural sense given the existing code.
5. For unmatched_listener errors: either add a matching sendMessage call or remove the dead listener branch — whichever makes more sense given the existing code.
6. Write a brief explanation (2–3 sentences) describing what you fixed, then produce the patch.
</task>

<critical_rules>
- Fix ONLY what the errors indicate — do not refactor or improve unrelated code
- Each file MUST appear only once in the patch
- Consolidate ALL edits for a given file into a single *** [ACTION] File: block
- Your patch MUST start with *** Begin Patch on its own line
- Your patch MUST end with *** End Patch on its own line
- Ensure all new console logs include [CHROMIE:filename.js] prefix
</critical_rules>

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
</update_action>

<add_action>
For ADD actions, use *** Add File: [path/to/new/file] followed by file lines, each preceded by +
</add_action>
</v4a_diff_format>

<output_format>
[2–3 sentences explaining what was fixed]

*** Begin Patch
[Your V4A diff patches here]
*** End Patch
</output_format>
</instructions>
`

/**
 * Builds a repair prompt from completedFiles and harness errors.
 *
 * Full file content is included only for files directly involved in errors
 * (referencedBy + manifest.json). All other files are represented as compact
 * summaries via formatFileSummariesForPlanning to save tokens.
 *
 * @param {Map<string,string>} completedFiles
 * @param {import('../../../codegen/extension-harness.js').HarnessError[]} errors
 * @returns {string}
 */
export function buildHarnessRepairPrompt(completedFiles, errors) {
  const errorList = errors
    .map((e, i) => `${i + 1}. [${e.type}] "${e.referencedFile}" — referenced by ${e.referencedBy} via ${e.field}`)
    .join('\n')

  // Collect the files the LLM actually needs to read/patch in full
  const errorFilePaths = new Set(['manifest.json'])
  for (const e of errors) {
    if (e.referencedBy) errorFilePaths.add(e.referencedBy)
  }

  // Full XML content for error-involved files
  const errorFilesXml = Array.from(errorFilePaths)
    .filter(p => completedFiles.has(p))
    .map(p => `<file path="${p}">\n${completedFiles.get(p)}\n</file>`)
    .join('\n\n')

  // Compact summary of all files for architectural context
  const filesObj = Object.fromEntries(completedFiles)
  const analysis = analyzeExtensionFiles(filesObj)
  const fileSummaries = formatFileSummariesForPlanning(analysis)

  return HARNESS_REPAIR_PROMPT
    .replace('{HARNESS_ERRORS}', errorList)
    .replace('{FILE_SUMMARIES}', fileSummaries)
    .replace('{ERROR_FILES}', errorFilesXml)
}
