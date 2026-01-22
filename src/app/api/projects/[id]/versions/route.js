import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkPaidPlan } from "@/lib/validation"

// GET - List all versions for a project
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

  // Check if user has paid plan
  const { isPaid } = await checkPaidPlan(supabase, user.id)
  if (!isPaid) {
    return NextResponse.json({ 
      error: "Version history is a paid feature. Please upgrade to access this feature." 
    }, { status: 403 })
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

    // Get all versions for the project (ordered by version number descending)
    const { data: versions, error: versionsError } = await supabase
      .from("project_versions")
      .select("id, version_number, version_name, description, created_at, created_by")
      .eq("project_id", id)
      .order("version_number", { ascending: false })

    if (versionsError) {
      console.error("Error fetching versions:", versionsError)
      return NextResponse.json({ 
        error: versionsError.message || "Failed to fetch versions",
        code: versionsError.code 
      }, { status: 500 })
    }

    console.log(`📋 Retrieved ${versions?.length || 0} versions for project ${id}`)
    return NextResponse.json({ versions: versions || [] })
  } catch (error) {
    console.error("Error listing versions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create a new version snapshot
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

  // Check if user has paid plan
  const { isPaid } = await checkPaidPlan(supabase, user.id)
  if (!isPaid) {
    return NextResponse.json({ 
      error: "Version history is a paid feature. Please upgrade to access this feature." 
    }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { version_name, description } = body

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

    // Call the database function to create a version
    const { data: versionId, error: createError } = await supabase
      .rpc("create_project_version", {
        p_project_id: id,
        p_version_name: version_name || null,
        p_description: description || null,
      })

    if (createError) {
      console.error("Error creating version:", createError)
      return NextResponse.json({ 
        error: createError.message || "Failed to create version",
        code: createError.code,
        details: createError.details,
        hint: createError.hint 
      }, { status: 500 })
    }

    // Fetch the created version details
    const { data: version, error: fetchError } = await supabase
      .from("project_versions")
      .select("id, version_number, version_name, description, created_at")
      .eq("id", versionId)
      .single()

    if (fetchError) {
      console.error("Error fetching created version:", fetchError)
      return NextResponse.json({ error: "Version created but failed to fetch details" }, { status: 500 })
    }

    console.log(`✅ Created version ${version.version_number} for project ${project.name}`)
    return NextResponse.json({ version })
  } catch (error) {
    console.error("Error creating version:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

