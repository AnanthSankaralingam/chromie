import { createServiceClient } from '@/lib/supabase/service'

/**
 * Load template files from Supabase database
 * @param {string} templateName - Name of the template (must match title in all_templates.json)
 * @param {string} frontendType - Frontend type (popup, sidepanel, overlay, new_tab, content_script_ui)
 * @param {Object} supabase - Supabase client (authenticated client from API route, preferred)
 * @returns {Promise<Object>} Map of file paths to content, or empty object if template not found
 */
export async function loadTemplateFiles(templateName, frontendType, supabase = null) {
  try {
    console.log(`📂 [Template Loader] Loading template: ${templateName}/${frontendType}`)

    // Use provided authenticated client (preferred) or fallback to service client
    // Service client bypasses RLS, so authenticated client is preferred for security
    if (!supabase) {
      supabase = createServiceClient()
      if (!supabase) {
        console.error(`❌ [Template Loader] Supabase client not available - check environment variables`)
        return {}
      }
      console.warn(`⚠️ [Template Loader] Using service client (fallback) - authenticated client preferred`)
    }

    // Query all files for this template and frontend type
    const { data, error } = await supabase
      .from('extension_templates')
      .select('file_path, content')
      .eq('template_name', templateName)
      .eq('frontend_type', frontendType)

    if (error) {
      console.error(`❌ [Template Loader] Error querying template files:`, error.message)
      return {}
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️ [Template Loader] Template not found: ${templateName}/${frontendType}`)
      return {}
    }

    // Convert array of {file_path, content} to {file_path: content} map
    const templateFiles = {}
    for (const file of data) {
      templateFiles[file.file_path] = file.content
      console.log(`✅ [Template Loader] Loaded: ${file.file_path}`)
    }

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
