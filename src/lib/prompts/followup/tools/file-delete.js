export const FILE_DELETE_TOOL = `
<file_deletion>
Use this tool to safely delete obsolete, redundant, or unnecessary files from the project during refactoring or cleanup operations.

To call this tool, output JSON:
{
  "tool": "delete_file",
  "file_path": "path/to/file.js",
  "reason": "Clear explanation of why this file should be deleted"
}

Safety notes:
- Critical files like manifest.json cannot be deleted
- Sensitive files (background.js, content.js, popup.html) will require user confirmation
- You must provide a clear reason for each deletion

Tool results will be provided before you generate patches
</file_deletion>
`;
