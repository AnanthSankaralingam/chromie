import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { buildExtension } from "@/lib/build/esbuild-service.js"

/**
 * POST /api/projects/:id/build
 *
 * Bundle a project's extension files using esbuild.
 * Does NOT save built files back to database — this is a stateless transform.
 *
 * Request body (optional):
 *   { planPackages?: Array<{ name: string }> }
 *
 * Response:
 *   { success, files, resolvedPackages, rejectedPackages, errors, warnings, fallback }
 */
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  // Auth check
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

    // Parse optional request body
    let planPackages = []
    try {
      const body = await request.json()
      planPackages = body?.planPackages || []
    } catch {
      // No body or invalid JSON — that's fine, planPackages stays empty
    }

    // Load project files (exclude test and internal files)
    const { data: codeFiles, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", id)

    if (filesError) {
      return NextResponse.json({ error: filesError.message }, { status: 500 })
    }

    if (!codeFiles || codeFiles.length === 0) {
      return NextResponse.json({ error: "No files found for this project" }, { status: 404 })
    }

    // Build file map, excluding tests and internal files
    const fileMap = {}
    for (const file of codeFiles) {
      if (file.file_path.startsWith('tests/') || file.file_path.startsWith('.chromie/')) {
        continue
      }
      fileMap[file.file_path] = file.content
    }

    if (Object.keys(fileMap).length === 0) {
      return NextResponse.json({ error: "No buildable files found" }, { status: 404 })
    }

    const result = await buildExtension({ files: fileMap, planPackages })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error building project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
