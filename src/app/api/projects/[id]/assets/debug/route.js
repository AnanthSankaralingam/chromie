import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET - Debug endpoint to check project assets and manifest icons
 */
export async function GET(request, { params }) {
  const supabase = createClient()
  const { id } = params

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

    // Get manifest.json
    const { data: manifestFile } = await supabase
      .from("code_files")
      .select("content")
      .eq("project_id", id)
      .eq("file_path", "manifest.json")
      .single()

    let manifestIcons = []
    if (manifestFile) {
      try {
        const manifest = JSON.parse(manifestFile.content)
        
        // Collect all icon references
        const iconPaths = new Set()
        if (manifest.icons) {
          Object.values(manifest.icons).forEach(p => {
            if (typeof p === 'string' && p.startsWith('icons/')) iconPaths.add(p)
          })
        }
        if (manifest.action && manifest.action.default_icon) {
          Object.values(manifest.action.default_icon).forEach(p => {
            if (typeof p === 'string' && p.startsWith('icons/')) iconPaths.add(p)
          })
        }
        manifestIcons = Array.from(iconPaths)
      } catch (e) {
        console.error("Error parsing manifest:", e)
      }
    }

    // Get all project assets
    const { data: assets } = await supabase
      .from("project_assets")
      .select("file_path, file_type, mime_type, file_size, created_at")
      .eq("project_id", id)
      .order("file_path")

    // Check which manifest icons are missing
    const assetPaths = new Set((assets || []).map(a => a.file_path))
    const missingIcons = manifestIcons.filter(icon => !assetPaths.has(icon))

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name
      },
      manifest_icons: manifestIcons,
      uploaded_assets: assets || [],
      missing_icons: missingIcons,
      status: missingIcons.length === 0 ? 'OK' : 'MISSING_ICONS',
      message: missingIcons.length === 0 
        ? 'All manifest icons are uploaded' 
        : `${missingIcons.length} icon(s) referenced in manifest but not uploaded. Use the Upload button to add them.`
    })
  } catch (error) {
    console.error("Error in debug endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

