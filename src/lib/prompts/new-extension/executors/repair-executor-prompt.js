/**
 * Repair Executor Prompt
 * Builds a prompt to fix syntax errors in a generated file.
 */

export const REPAIR_EXECUTOR_PROMPT = `You are a Chrome extension expert from chromie.dev. The following generated file has syntax errors. Fix them and return ONLY the corrected file content. No explanations, no markdown fences.

File: {FILE_NAME}

<validation_errors>
{VALIDATION_ERRORS}
</validation_errors>

<broken_file>
{BROKEN_FILE}
</broken_file>
{MANIFEST_JSON}

Return ONLY the corrected file content. No markdown fences, no explanations.`

/**
 * Builds a repair prompt for a file that failed validation.
 * @param {string} fileName - Path of the file to repair
 * @param {string} brokenContent - The generated content with errors
 * @param {Array<{line: number, column: number, message: string}>} validationErrors - ESLint/validation errors
 * @param {string|null} manifestContent - manifest.json content (included for non-manifest files)
 * @returns {string} The full prompt with section replacements
 */
export function buildRepairPrompt(fileName, brokenContent, validationErrors, manifestContent) {
  const errorLines = validationErrors.map(e =>
    `Line ${e.line}, Col ${e.column}: ${e.message}`
  ).join('\n')

  const manifestSection = (manifestContent && fileName !== 'manifest.json')
    ? `\n<manifest_json>\n${manifestContent}\n</manifest_json>\n`
    : ''

  return REPAIR_EXECUTOR_PROMPT
    .replace('{FILE_NAME}', fileName)
    .replace('{VALIDATION_ERRORS}', errorLines)
    .replace('{BROKEN_FILE}', brokenContent)
    .replace('{MANIFEST_JSON}', manifestSection)
}
