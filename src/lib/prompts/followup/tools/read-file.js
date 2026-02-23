export const READ_FILE_TOOL = `
<read_file>
Use this tool when you need to see a file that was not included in your context. The planning agent may have missed files. Request by path to add it to your context.

To call this tool, output JSON:
{
  "tool": "read_file",
  "file_path": "path/to/file.js"
}

Tool results will provide the file content before you generate patches.
</read_file>
`;
