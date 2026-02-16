/**
 * Agent File Operations Handler
 * Manages file operations (delete, create, update) initiated by AI agents
 */

import { canAgentDelete } from '@/lib/file-safety/protection-rules'

/**
 * Handle agent-initiated file deletion
 * @param {Object} params
 * @param {string} params.projectId - Project ID
 * @param {string} params.filePath - Path of file to delete
 * @param {string} params.reason - Reason for deletion
 * @param {Object} params.supabase - Supabase client
 * @param {Function} params.onConfirmationRequired - Callback for user confirmation
 * @returns {Promise<Object>} { success: boolean, filePath?: string, error?: string }
 */
export async function handleAgentFileDelete({ 
  projectId, 
  filePath, 
  reason, 
  supabase,
  onConfirmationRequired 
}) {
  try {
    console.log(`🤖 Agent requesting deletion: ${filePath} (reason: ${reason})`)
    
    // Get total file count for this project
    const { data: files, error: countError } = await supabase
      .from("code_files")
      .select("id", { count: 'exact' })
      .eq("project_id", projectId)
    
    if (countError) {
      console.error('Error counting files:', countError)
      return { success: false, error: 'Failed to verify project files' }
    }
    
    const totalFiles = files?.length || 0
    
    // Check protection rules
    const safety = canAgentDelete(filePath, totalFiles)
    
    if (!safety.allowed) {
      console.log(`❌ Deletion blocked: ${safety.reason}`)
      return {
        success: false,
        error: `Cannot delete ${filePath}: ${safety.reason}`,
        blocked: true
      }
    }
    
    // If requires confirmation, ask user
    if (safety.requiresConfirmation) {
      console.log(`⚠️ Deletion requires confirmation: ${safety.reason}`)
      
      const confirmed = await onConfirmationRequired({
        filePath,
        reason,
        safetyReason: safety.reason,
        message: `Agent wants to delete ${filePath}. Allow?`
      })
      
      if (!confirmed) {
        console.log(`🚫 User declined deletion of ${filePath}`)
        return {
          success: false,
          error: 'User declined file deletion',
          declined: true
        }
      }
      
      console.log(`✅ User approved deletion of ${filePath}`)
    }
    
    // Verify file exists before deletion
    const { data: existingFile } = await supabase
      .from("code_files")
      .select("id")
      .eq("project_id", projectId)
      .eq("file_path", filePath)
      .single()
    
    if (!existingFile) {
      console.log(`⚠️ File not found: ${filePath}`)
      return {
        success: false,
        error: `File ${filePath} does not exist`,
        notFound: true
      }
    }
    
    // Perform deletion
    const { error: deleteError } = await supabase
      .from("code_files")
      .delete()
      .eq("project_id", projectId)
      .eq("file_path", filePath)
    
    if (deleteError) {
      console.error('Agent file deletion failed:', deleteError)
      return { success: false, error: deleteError.message }
    }
    
    // Log the operation (optional - for audit trail)
    await logFileOperation({
      projectId,
      operationType: 'delete',
      filePath,
      reason,
      userConfirmed: safety.requiresConfirmation,
      supabase
    })
    
    console.log(`🗑️ Agent successfully deleted file: ${filePath}`)
    return { success: true, filePath }
    
  } catch (error) {
    console.error('Error in handleAgentFileDelete:', error)
    return { 
      success: false, 
      error: error.message || 'Unknown error during file deletion' 
    }
  }
}

/**
 * Log file operation to database (for audit trail)
 * @param {Object} params
 */
async function logFileOperation({ 
  projectId, 
  operationType, 
  filePath, 
  reason, 
  userConfirmed,
  supabase 
}) {
  try {
    // Use service role to bypass RLS for logging
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      console.log('⚠️ Service role not configured - skipping audit log')
      return
    }
    
    const { createClient } = await import('@supabase/supabase-js')
    const serviceClient = createClient(supabaseUrl, serviceKey)
    
    const { error } = await serviceClient
      .from('agent_file_operations')
      .insert({
        project_id: projectId,
        operation_type: operationType,
        file_path: filePath,
        reason: reason || null,
        user_confirmed: userConfirmed
      })
    
    if (error) {
      console.error('Failed to log file operation:', error)
    } else {
      console.log(`📝 Logged ${operationType} operation for ${filePath}`)
    }
  } catch (error) {
    console.error('Error logging file operation:', error)
  }
}

/**
 * Batch delete multiple files (for cleanup operations)
 * @param {Object} params
 * @returns {Promise<Object>} Results for each file
 */
export async function handleAgentBatchDelete({
  projectId,
  fileDeletes, // Array of { filePath, reason }
  supabase,
  onConfirmationRequired
}) {
  const results = []
  
  for (const fileDelete of fileDeletes) {
    const result = await handleAgentFileDelete({
      projectId,
      filePath: fileDelete.filePath,
      reason: fileDelete.reason,
      supabase,
      onConfirmationRequired
    })
    
    results.push({
      filePath: fileDelete.filePath,
      ...result
    })
    
    // If one deletion fails critically, stop the batch
    if (!result.success && result.blocked) {
      console.log(`⚠️ Stopping batch delete due to blocked file: ${fileDelete.filePath}`)
      break
    }
  }
  
  return {
    success: results.every(r => r.success),
    results
  }
}
