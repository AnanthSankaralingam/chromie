/**
 * File Saving Utilities
 * Handles saving generated files to the database
 */

import { createClient } from "../supabase/server"
import { randomUUID } from "crypto"
import { formatManifestJson } from "../utils/json-formatter"
import { normalizeGeneratedFileContent } from "./json-extractor"

/**
 * Saves generated files to the database
 * @param {Object} implementationResult - The parsed implementation result
 * @param {string} sessionId - Session/project identifier
 * @param {Object} replacements - Placeholder replacements (for manifest name)
 * @returns {Object} Object containing savedFiles array and errors array
 */
export async function saveFilesToDatabase(implementationResult, sessionId, replacements = {}) {
  if (!implementationResult || typeof implementationResult !== 'object') {
    return { savedFiles: [], errors: [] }
  }

  console.log("🔄 Processing generated code for file saving...")

  const supabase = createClient()

  console.log('[codegen-stream] Skipping per-project icon persistence; will materialize at packaging')
  const allFiles = { ...implementationResult }

  // Remove explanation as it's not a file
  delete allFiles.explanation

  console.log(`💾 Saving ${Object.keys(allFiles).length} files to database for project ${sessionId}`)
  console.log(`📝 Files to save:`, Object.keys(allFiles).join(', '))

  const savedFiles = []
  const errors = []

  for (const [filePath, rawContent] of Object.entries(allFiles)) {
    if (rawContent === null || rawContent === undefined) {
      console.log(`  ⚠️ Skipping ${filePath} - content is null/undefined`)
      continue
    }

    let stringContent = rawContent
    if (typeof rawContent === 'object' && rawContent !== null) {
      stringContent = filePath === 'manifest.json'
        ? formatManifestJson(rawContent)
        : JSON.stringify(rawContent, null, 2)
    }

    const content = normalizeGeneratedFileContent(stringContent)

    if (!content || (typeof content === 'string' && content.trim().length === 0)) {
      console.log(`  ⚠️ Skipping ${filePath} - content is empty after normalization`)
      continue
    }

    console.log(`  → Saving ${filePath} (${content.length} chars)`)
    try {
      const { data: existingFile } = await supabase
        .from("code_files")
        .select("id")
        .eq("project_id", sessionId)
        .eq("file_path", filePath)
        .single()

      if (existingFile) {
        const { error: updateError } = await supabase
          .from("code_files")
          .update({
            content: content,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", existingFile.id)

        if (updateError) {
          console.error(`    ❌ Error updating file ${filePath}:`, updateError)
          errors.push({ filePath, error: updateError })
        } else {
          console.log(`    ✅ Updated ${filePath}`)
          savedFiles.push(filePath)
        }
      } else {
        const fileId = randomUUID()
        const { error: insertError } = await supabase
          .from("code_files")
          .insert({
            id: fileId,
            project_id: sessionId,
            file_path: filePath,
            content: content
          })

        if (insertError) {
          console.error(`    ❌ Error inserting file ${filePath}:`, insertError)
          errors.push({ filePath, error: insertError })
        } else {
          console.log(`    ✅ Inserted ${filePath} (id: ${fileId})`)
          savedFiles.push(filePath)
        }
      }
    } catch (fileError) {
      console.error(`Exception handling file ${filePath}:`, fileError)
      errors.push({ filePath, error: fileError })
    }
  }

  console.log(`✅ Saved ${savedFiles.length} files successfully`)
  if (errors.length > 0) {
    console.error(`❌ ${errors.length} files had errors:`, errors.map(e => e.filePath))
  }

  return { savedFiles, errors }
}

/**
 * Updates project metadata in the database
 * @param {string} sessionId - Session/project identifier
 * @param {Object} allFiles - All generated files (to extract manifest info)
 */
export async function updateProjectMetadata(sessionId, allFiles = {}) {
  const supabase = createClient()

  let projectUpdateData = {
    has_generated_code: true,
    last_used_at: new Date().toISOString()
  }

  if (allFiles['manifest.json']) {
    try {
      const manifestContent = allFiles['manifest.json']
      const manifest = typeof manifestContent === 'string'
        ? JSON.parse(manifestContent)
        : manifestContent

      if (manifest.name && manifest.name.trim()) {
        projectUpdateData.name = manifest.name.trim()
        console.log(`📝 [stream] Updating project name to: ${manifest.name}`)
      }

      if (manifest.description && manifest.description.trim()) {
        projectUpdateData.description = manifest.description.trim()
        console.log(`📝 [stream] Updating project description to: ${manifest.description}`)
      }
    } catch (parseError) {
      console.warn('Could not parse manifest.json for project update in stream:', parseError.message)
    }
  }

  try {
    const { error: updateError } = await supabase
      .from('projects')
      .update(projectUpdateData)
      .eq('id', sessionId)

    if (updateError) {
      console.error('❌ Error updating project:', updateError)
    } else {
      console.log('✅ Project updated successfully with extension info')
    }
  } catch (error) {
    console.error('💥 Exception during project update:', error)
  }
}

