import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Allowed extensions for new file creation
const ALLOWED_EXTENSIONS = ['.js', '.html', '.css', '.json', '.md']
// Files that cannot be created or deleted by users
const PROTECTED_FILES = ['manifest.json']

function isProtectedFile(filePath) {
  const fileName = filePath.split('/').pop().toLowerCase()
  return PROTECTED_FILES.includes(fileName)
}

function hasAllowedExtension(filePath) {
  const ext = '.' + filePath.split('.').pop().toLowerCase()
  return ALLOWED_EXTENSIONS.includes(ext)
}

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

    // Get all files for this project
    const { data: files, error: filesError } = await supabase
      .from("code_files")
      .select("*")
      .eq("project_id", id)
      .order("file_path")

    if (filesError) {
      return NextResponse.json({ error: filesError.message }, { status: 500 })
    }

    return NextResponse.json({ files: files || [] })
  } catch (error) {
    console.error("Error fetching project files:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
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
    const filePath = body?.file_path
    const content = body?.content

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: "Missing or invalid file_path" }, { status: 400 })
    }

    if (typeof content !== 'string') {
      return NextResponse.json({ error: "Missing or invalid content" }, { status: 400 })
    }

    // Check if this is a new file (creation) vs update
    const { data: existingFile } = await supabase
      .from("code_files")
      .select("id")
      .eq("project_id", id)
      .eq("file_path", filePath)
      .single()

    const isCreating = !existingFile

    if (isCreating) {
      // Validate extension for new files
      if (!hasAllowedExtension(filePath)) {
        return NextResponse.json({ error: "Only .js, .html, .css, .json files can be created" }, { status: 400 })
      }
      // Block creation of protected files
      if (isProtectedFile(filePath)) {
        return NextResponse.json({ error: "Cannot create protected file" }, { status: 403 })
      }
    }

    // Upsert file content
    const { data: upserted, error: upsertError } = await supabase
      .from("code_files")
      .upsert({
        project_id: id,
        file_path: filePath,
        content: content,
        last_used_at: new Date().toISOString(),
      }, { onConflict: 'project_id,file_path' })
      .select()
      .single()

    if (upsertError) {
      console.error('Error upserting file:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    console.log(`✍️ Saved file for project ${id}: ${filePath} (bytes=${content.length})`)
    return NextResponse.json({ file: upserted })
  } catch (error) {
    console.error("Error saving project file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
    const filePath = body?.file_path

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: "Missing or invalid file_path" }, { status: 400 })
    }

    // Block deletion of protected files
    if (isProtectedFile(filePath)) {
      return NextResponse.json({ error: "Cannot delete protected file" }, { status: 403 })
    }

    // Delete the file
    const { error: deleteError } = await supabase
      .from("code_files")
      .delete()
      .eq("project_id", id)
      .eq("file_path", filePath)

    if (deleteError) {
      console.error('Error deleting file:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    console.log(`🗑️ Deleted file for project ${id}: ${filePath}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting project file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}