import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Load template files from the template directory structure
 * @param {string} templateName - Name of the template (must match title in all_templates.json)
 * @param {string} frontendType - Frontend type (popup, sidepanel, overlay, new_tab, content_script_ui)
 * @returns {Promise<Object>} Map of file paths to content, or empty object if template not found
 */
export async function loadTemplateFiles(templateName, frontendType) {
  try {
    // Construct path to template directory
    // From: src/lib/codegen/planning-handlers/template-loader.js
    // To: src/lib/data/templates/{templateName}/{frontendType}/
    const templatesBasePath = path.join(
      __dirname,
      '../../data/templates',
      templateName,
      frontendType
    ) //TODO move to supabase

    console.log(`📂 [Template Loader] Loading template: ${templateName}/${frontendType}`)
    console.log(`📂 [Template Loader] Path: ${templatesBasePath}`)

    // Check if directory exists
    if (!fs.existsSync(templatesBasePath)) {
      console.warn(`⚠️ [Template Loader] Template directory not found: ${templatesBasePath}`)
      return {}
    }

    // Recursively read all files from the template directory
    const templateFiles = {}
    
    function readDirectory(dirPath, relativePath = '') {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        const fileRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name
        
        if (entry.isDirectory()) {
          // Recursively read subdirectories
          readDirectory(fullPath, fileRelativePath)
        } else if (entry.isFile()) {
          // Read file content
          try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            templateFiles[fileRelativePath] = content
            console.log(`✅ [Template Loader] Loaded: ${fileRelativePath}`)
          } catch (error) {
            console.error(`❌ [Template Loader] Error reading file ${fileRelativePath}:`, error.message)
          }
        }
      }
    }

    readDirectory(templatesBasePath)

    console.log(`✅ [Template Loader] Loaded ${Object.keys(templateFiles).length} files from template`)
    return templateFiles

  } catch (error) {
    console.error(`❌ [Template Loader] Error loading template files:`, error)
    return {}
  }
}

/**
 * Format template files as XML for use in prompts
 * Reuses the same format as formatFilesAsXml from requirements-helpers
 * @param {Object} templateFiles - Map of file paths to contents
 * @returns {string} Formatted XML string with file tags
 */
export function formatTemplateFilesAsXml(templateFiles) {
  if (!templateFiles || typeof templateFiles !== 'object' || Object.keys(templateFiles).length === 0) {
    return ''
  }

  return Object.entries(templateFiles)
    .map(([filePath, content]) => `<file path="${filePath}">\n${content}\n</file>`)
    .join('\n\n')
}
