import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST - Revert project to a specific version
export async function POST(request, { params }) {
  const supabase = createClient()
  const { id, versionId } = params

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Get the version to revert to
    const { data: version, error: versionError } = await supabase
      .from("project_versions")
      .select("snapshot_data, version_number, version_name")
      .eq("id", versionId)
      .eq("project_id", id)
      .single()

    if (versionError || !version) {
      console.error("Error fetching version:", versionError)
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    const snapshot = version.snapshot_data

    console.log(`🔄 Starting revert to version ${version.version_number} for project ${project.name}`)

    // Create a backup version of current state before reverting
    const { error: backupError } = await supabase
      .rpc("create_project_version", {
        p_project_id: id,
        p_version_name: "Auto-backup before revert",
        p_description: `Automatic backup created before reverting to version ${version.version_number}`,
      })

    if (backupError) {
      console.error("Error creating backup version:", backupError)
      // Continue with revert even if backup fails
    }

    // Step 1: Delete all current code files
    const { error: deleteFilesError } = await supabase
      .from("code_files")
      .delete()
      .eq("project_id", id)

    if (deleteFilesError) {
      console.error("Error deleting current files:", deleteFilesError)
      return NextResponse.json({ error: "Failed to clear current files" }, { status: 500 })
    }

    // Step 2: Restore code files from snapshot
    if (snapshot.code_files && snapshot.code_files.length > 0) {
      const filesToInsert = snapshot.code_files.map(file => ({
        project_id: id,
        file_path: file.file_path,
        content: file.content,
        last_used_at: new Date().toISOString(),
      }))

      const { error: insertFilesError } = await supabase
        .from("code_files")
        .insert(filesToInsert)

      if (insertFilesError) {
        console.error("Error restoring code files:", insertFilesError)
        return NextResponse.json({ error: "Failed to restore code files" }, { status: 500 })
      }

      console.log(`✅ Restored ${filesToInsert.length} code files`)
    }

    // Step 3: Delete all current assets
    const { error: deleteAssetsError } = await supabase
      .from("project_assets")
      .delete()
      .eq("project_id", id)

    if (deleteAssetsError) {
      console.error("Error deleting current assets:", deleteAssetsError)
      return NextResponse.json({ error: "Failed to clear current assets" }, { status: 500 })
    }

    // Step 4: Restore assets from snapshot
    if (snapshot.assets && snapshot.assets.length > 0) {
      const assetsToInsert = snapshot.assets.map(asset => ({
        project_id: id,
        file_path: asset.file_path,
        content_base64: asset.content_base64,
        file_type: asset.file_type,
        mime_type: asset.mime_type,
        file_size: asset.file_size,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { error: insertAssetsError } = await supabase
        .from("project_assets")
        .insert(assetsToInsert)

      if (insertAssetsError) {
        console.error("Error restoring assets:", insertAssetsError)
        return NextResponse.json({ error: "Failed to restore assets" }, { status: 500 })
      }

      console.log(`✅ Restored ${assetsToInsert.length} assets`)
    }

    // Step 5: Update project metadata
    const { error: updateProjectError } = await supabase
      .from("projects")
      .update({
        name: snapshot.project.name,
        description: snapshot.project.description,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateProjectError) {
      console.error("Error updating project metadata:", updateProjectError)
      // Don't fail the revert if just metadata update fails
    }

    console.log(`✅ Successfully reverted project ${project.name} to version ${version.version_number}`)

    return NextResponse.json({
      success: true,
      message: `Project reverted to version ${version.version_number}`,
      version: {
        version_number: version.version_number,
        version_name: version.version_name,
      },
      stats: {
        files_restored: snapshot.code_files?.length || 0,
        assets_restored: snapshot.assets?.length || 0,
      },
    })
  } catch (error) {
    console.error("Error reverting to version:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

