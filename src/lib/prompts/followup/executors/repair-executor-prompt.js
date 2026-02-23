/**
 * Repair Executor Prompt (Follow-up workflow)
 * Builds a prompt to fix patches that failed to apply.
 * Output is a corrected V4A patch, not raw file content.
 */

export const REPAIR_EXECUTOR_FOLLOWUP_PROMPT = `You are a Chrome extension expert from chromie.dev. A patch failed to apply. Fix it and return a corrected patch in V4A format.

<patch_application_errors>
{PATCH_APPLICATION_ERRORS}
</patch_application_errors>

<original_patch>
{ORIGINAL_PATCH}
</original_patch>

<current_file path="{FILE_NAME}">
{CURRENT_FILE_CONTENT}
</current_file>
{MANIFEST_JSON}

<instructions>
The patch could not be applied because context lines did not match the file, or the target location was not found. Produce a corrected patch that will apply successfully:
1. Use context lines that EXACTLY match the current file content (including whitespace and indentation)
2. Ensure the \`*** [ACTION] File:\` path matches the file above
3. Output ONLY the patch, enclosed within \`*** Begin Patch\` and \`*** End Patch\` markers
4. No explanations before or after the patch
</instructions>

<v4a_format_reminder>
- Context lines: 3 lines before/after each change, each starting with a single space, must match the file exactly
- Removals: lines prefixed with \`-\`
- Additions: lines prefixed with \`+\`
- Use \`@@ [FUNCTION_NAME]\` if context is ambiguous
</v4a_format_reminder>

Return ONLY the corrected patch. No markdown fences, no explanations outside the patch.`

/**
 * Builds a repair prompt for a patch that failed to apply.
 * @param {string} fileName - Path of the file the patch targets
 * @param {string} originalPatch - The patch text that failed to apply
 * @param {Array<string|{path?: string, message: string}>} patchApplicationErrors - Errors from patch application (e.g. context mismatch, file not found)
 * @param {string} currentFileContent - Current content of the target file (so context can be aligned)
 * @param {string|null} manifestContent - manifest.json content (optional, for cross-file context)
 * @returns {string} The full prompt with section replacements
 */
export function buildRepairFollowupPrompt(fileName, originalPatch, patchApplicationErrors, currentFileContent, manifestContent = null) {
  const errorLines = patchApplicationErrors.map(e =>
    typeof e === 'string' ? e : (e.path ? `${e.path}: ${e.message}` : e.message)
  ).join('\n')

  const manifestSection = (manifestContent && fileName !== 'manifest.json')
    ? `\n<manifest_json>\n${manifestContent}\n</manifest_json>\n`
    : ''

  return REPAIR_EXECUTOR_FOLLOWUP_PROMPT
    .replace('{FILE_NAME}', fileName)
    .replace('{PATCH_APPLICATION_ERRORS}', errorLines)
    .replace('{ORIGINAL_PATCH}', originalPatch)
    .replace('{CURRENT_FILE_CONTENT}', currentFileContent)
    .replace('{MANIFEST_JSON}', manifestSection)
}
