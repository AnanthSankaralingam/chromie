/**
 * AI Agent File Operation Tools
 * Tool definitions for file operations that can be performed by AI agents
 */

export const fileOperationTools = [
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Safely delete a file from the Chrome extension project. Use this when refactoring code, removing obsolete files, or cleaning up duplicate functionality. Cannot delete critical files like manifest.json. Important: Provide a clear reason for deletion.",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "The path of the file to delete (e.g., 'scripts/old-feature.js', 'styles/deprecated.css')"
          },
          reason: {
            type: "string",
            description: "Clear explanation of why this file should be deleted (e.g., 'Functionality moved to background.js', 'Duplicate of popup.css', 'Feature no longer needed per user request')"
          }
        },
        required: ["file_path", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_multiple_files",
      description: "Safely delete multiple files at once. Use this for cleanup operations, removing a set of related obsolete files, or refactoring that requires removing several files. Provide individual reasons for each file.",
      parameters: {
        type: "object",
        properties: {
          files: {
            type: "array",
            description: "Array of files to delete, each with path and reason",
            items: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "Path of the file to delete"
                },
                reason: {
                  type: "string",
                  description: "Reason for deleting this specific file"
                }
              },
              required: ["file_path", "reason"]
            }
          }
        },
        required: ["files"]
      }
    }
  }
]

/**
 * Get all agent tools including file operations
 * Can be merged with other tool sets
 */
export function getAgentFileTools() {
  return fileOperationTools
}
