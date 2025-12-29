import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import sharp from 'sharp'

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Allowed icon sizes for Chrome extensions
const CHROME_ICON_SIZES = [16, 32, 48, 64, 128, 256, 512]

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/svg+xml': ['svg'],
  'application/json': ['json'],
  'text/plain': ['txt'],
  'text/css': ['css'],
  'text/html': ['html']
}

/**
 * GET - List all assets for a project
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
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Get all assets for this project
    const { data: assets, error: assetsError } = await supabase
      .from("project_assets")
      .select("id, file_path, file_type, mime_type, file_size, created_at, updated_at")
      .eq("project_id", id)
      .order("file_type, file_path")

    if (assetsError) {
      console.error("Error fetching project assets:", assetsError)
      return NextResponse.json({ error: assetsError.message }, { status: 500 })
    }

    return NextResponse.json({ assets: assets || [] })
  } catch (error) {
    console.error("Error fetching project assets:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST - Upload a new asset
 */
export async function POST(request, { params }) {
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
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const body = await request.json()
    const { file_path, content_base64, file_type, mime_type } = body

    // Validate required fields
    if (!file_path || typeof file_path !== 'string') {
      return NextResponse.json({ error: "Missing or invalid file_path" }, { status: 400 })
    }

    if (!content_base64 || typeof content_base64 !== 'string') {
      return NextResponse.json({ error: "Missing or invalid content_base64" }, { status: 400 })
    }

    if (!file_type || typeof file_type !== 'string') {
      return NextResponse.json({ error: "Missing or invalid file_type" }, { status: 400 })
    }

    if (!mime_type || typeof mime_type !== 'string') {
      return NextResponse.json({ error: "Missing or invalid mime_type" }, { status: 400 })
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES[mime_type]) {
      return NextResponse.json({ 
        error: `Unsupported MIME type: ${mime_type}. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}` 
      }, { status: 400 })
    }

    // Decode base64 to get file size
    let fileBuffer
    try {
      fileBuffer = Buffer.from(content_base64, 'base64')
    } catch (e) {
      return NextResponse.json({ error: "Invalid base64 encoding" }, { status: 400 })
    }

    const file_size = fileBuffer.length

    // Check file size
    if (file_size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      }, { status: 400 })
    }

    // Additional validation for icons
    if (file_type === 'icon') {
      if (!mime_type.startsWith('image/')) {
        return NextResponse.json({ error: "Icons must be image files" }, { status: 400 })
      }

      // For PNG icons (recommended for Chrome extensions), validate dimensions
      if (mime_type === 'image/png') {
        try {
          const metadata = await sharp(fileBuffer).metadata()
          const { width, height } = metadata

          // Check if it's a square icon
          if (width !== height) {
            return NextResponse.json({ 
              error: `Icon must be square. Current size: ${width}x${height}px` 
            }, { status: 400 })
          }

          // Log size info (we'll be flexible but inform about Chrome recommendations)
          if (!CHROME_ICON_SIZES.includes(width)) {
            console.warn(`⚠️ Icon size ${width}x${height}px is not a standard Chrome extension size. Recommended: ${CHROME_ICON_SIZES.join(', ')}`)
          }

          console.log(`✅ Icon validation passed: ${width}x${height}px`)
        } catch (e) {
          console.error("Error validating icon dimensions:", e)
          return NextResponse.json({ error: "Failed to validate icon dimensions. Ensure it's a valid PNG file." }, { status: 400 })
        }
      }

      // Ensure icon paths start with 'icons/'
      if (!file_path.startsWith('icons/')) {
        return NextResponse.json({ 
          error: "Icon file paths must start with 'icons/'" 
        }, { status: 400 })
      }
    }

    // Insert or update asset
    const { data: asset, error: upsertError } = await supabase
      .from("project_assets")
      .upsert({
        project_id: id,
        file_path,
        content_base64,
        file_type,
        mime_type,
        file_size,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id,file_path' })
      .select()
      .single()

    if (upsertError) {
      console.error("Error upserting asset:", upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    console.log(`✅ Uploaded asset for project ${id}: ${file_path} (${file_size} bytes, ${mime_type})`)
    return NextResponse.json({ 
      asset: {
        id: asset.id,
        file_path: asset.file_path,
        file_type: asset.file_type,
        mime_type: asset.mime_type,
        file_size: asset.file_size,
        created_at: asset.created_at,
        updated_at: asset.updated_at,
      }
    })
  } catch (error) {
    console.error("Error uploading asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE - Remove an asset
 */
export async function DELETE(request, { params }) {
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
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const body = await request.json()
    const { file_path } = body

    if (!file_path || typeof file_path !== 'string') {
      return NextResponse.json({ error: "Missing or invalid file_path" }, { status: 400 })
    }

    // Delete the asset
    const { error: deleteError } = await supabase
      .from("project_assets")
      .delete()
      .eq("project_id", id)
      .eq("file_path", file_path)

    if (deleteError) {
      console.error("Error deleting asset:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    console.log(`🗑️ Deleted asset for project ${id}: ${file_path}`)
    return NextResponse.json({ success: true, message: "Asset deleted successfully" })
  } catch (error) {
    console.error("Error deleting asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

