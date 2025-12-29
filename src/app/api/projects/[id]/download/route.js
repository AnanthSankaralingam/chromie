import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import JSZip from "jszip"

export async function GET(request, { params }) {
  const supabase = createClient()
  const { id: projectId } = params

  try {
    // Verify user authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Get project files
    const { data: files, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", projectId)
      .order("file_path")

    if (filesError) {
      return NextResponse.json({ error: "Failed to fetch project files" }, { status: 500 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files found for this project" }, { status: 404 })
    }

    // Create zip
    const zip = new JSZip()

    // Add all non-icon files
    for (const file of files) {
      if (file.file_path.startsWith('icons/')) continue
      zip.file(file.file_path, file.content)
    }

    // Parse manifest for required icon paths
    const manifestFile = files.find(f => f.file_path === 'manifest.json')
    if (!manifestFile) {
      return NextResponse.json({ error: "Manifest file not found" }, { status: 400 })
    }

    let manifest
    try {
      manifest = JSON.parse(manifestFile.content)
    } catch (e) {
      return NextResponse.json({ error: "Invalid manifest.json content" }, { status: 400 })
    }

    // Ensure canonical icon mappings
    // Ensure icons is an object, not a string
    if (!manifest.icons || typeof manifest.icons !== 'object' || Array.isArray(manifest.icons)) {
      manifest.icons = {}
    }
    if (!manifest.icons["16"]) manifest.icons["16"] = "icons/icon16.png"
    if (!manifest.icons["48"]) manifest.icons["48"] = "icons/icon48.png"
    if (!manifest.icons["128"]) manifest.icons["128"] = "icons/icon128.png"

    if (manifest.action) {
      // Ensure default_icon is an object, not a string
      if (!manifest.action.default_icon || typeof manifest.action.default_icon !== 'object' || Array.isArray(manifest.action.default_icon)) {
        manifest.action.default_icon = {}
      }
      if (!manifest.action.default_icon["16"]) manifest.action.default_icon["16"] = "icons/icon16.png"
      if (!manifest.action.default_icon["48"]) manifest.action.default_icon["48"] = "icons/icon48.png"
      if (!manifest.action.default_icon["128"]) manifest.action.default_icon["128"] = "icons/icon128.png"
    }

    // Update manifest in zip
    zip.file('manifest.json', JSON.stringify(manifest, null, 2))

    // Collect required icon paths from manifest and source files
    const requiredIconPaths = new Set()
    // From manifest
    for (const p of Object.values(manifest.icons || {})) {
      if (typeof p === 'string' && p.startsWith('icons/')) requiredIconPaths.add(p)
    }
    if (manifest.action && manifest.action.default_icon) {
      for (const p of Object.values(manifest.action.default_icon)) {
        if (typeof p === 'string' && p.startsWith('icons/')) requiredIconPaths.add(p)
      }
    }
    // From code files: scan for any 'icons/*.png' references, including chrome.runtime.getURL('icons/...')
    const iconRefRegex = /icons\/[A-Za-z0-9-_]+\.png/gi
    for (const f of files) {
      if (typeof f.content !== 'string') continue
      if (f.file_path.startsWith('icons/')) continue
      const matches = f.content.match(iconRefRegex)
      if (matches) {
        for (const m of matches) {
          // Normalize casing in set usage
          const p = m.startsWith('icons/') ? m : `icons/${m}`
          requiredIconPaths.add(p)
        }
      }
    }

    const iconPaths = Array.from(requiredIconPaths)
    console.log('[download] required icon paths', iconPaths)

    // First, fetch custom assets from project_assets (including custom icons)
    const { data: projectAssets, error: assetsError } = await supabase
      .from("project_assets")
      .select("file_path, content_base64")
      .eq("project_id", projectId)

    if (assetsError) {
      console.error('[download] Failed to fetch project assets:', assetsError)
      // Don't fail - continue without custom assets
    }

    // Add all project assets to zip (including custom icons and other files)
    const customAssetPaths = new Set()
    if (projectAssets && projectAssets.length > 0) {
      for (const asset of projectAssets) {
        try {
          const binary = Buffer.from(asset.content_base64, 'base64')
          zip.file(asset.file_path, binary)
          customAssetPaths.add(asset.file_path)
          console.log(`[download] Added custom asset: ${asset.file_path}`)
        } catch (e) {
          console.error(`[download] Failed to decode asset ${asset.file_path}:`, e.message)
        }
      }
    }

    // Filter icon paths to only fetch from shared_icons those not already in custom assets
    const iconsToFetchFromShared = iconPaths.filter(p => !customAssetPaths.has(p))
    console.log('[download] icons to fetch from shared_icons', iconsToFetchFromShared)

    // Fetch remaining icons from shared_icons
    if (iconsToFetchFromShared.length > 0) {
      const SUPABASE_URL = process.env.SUPABASE_URL
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: "Server configuration error: missing Supabase credentials" }, { status: 500 })
      }

      const serviceSupabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
      })

      const { data: iconRows, error: iconError } = await serviceSupabase
        .from('shared_icons')
        .select('path_hint, content_base64')
        .in('path_hint', iconsToFetchFromShared)
        .eq('visibility', 'global')

      if (iconError) {
        console.error('[download] Failed to fetch shared icons:', iconError)
        return NextResponse.json({ error: "Failed to fetch icons from shared store" }, { status: 500 })
      }

      const iconMap = new Map((iconRows || []).map(r => [r.path_hint, r]))
      const missing = iconsToFetchFromShared.filter(p => !iconMap.has(p))

      if (missing.length > 0) {
        console.error('[download] Missing required icons:', missing)
        return NextResponse.json({ 
          error: `Missing required icons: ${missing.join(', ')}. Please contact support.` 
        }, { status: 400 })
      }

      // Add shared icons to zip
      for (const iconPath of iconsToFetchFromShared) {
        const iconRow = iconMap.get(iconPath)
        if (iconRow) {
          try {
            const binary = Buffer.from(iconRow.content_base64, 'base64')
            zip.file(iconPath, binary)
            console.log(`[download] Added shared icon: ${iconPath}`)
          } catch (e) {
            console.error(`[download] Failed to decode icon ${iconPath}:`, e.message)
            return NextResponse.json({ error: `Failed to process icon ${iconPath}` }, { status: 500 })
          }
        }
      }
    }

    // Generate zip buffer
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

    // Create safe filename
    const safeProjectName = project.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
    const filename = `chromie-ext-${safeProjectName}.zip`

    // Return zip file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error("Error creating download zip:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
