import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - Get a specific version
export async function GET(request, { params }) {
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
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Get the version
    const { data: version, error: versionError } = await supabase
      .from("project_versions")
      .select("*")
      .eq("id", versionId)
      .eq("project_id", id)
      .single()

    if (versionError || !version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    console.log(`📖 Retrieved version ${version.version_number} for project ${id}`)
    return NextResponse.json({ version })
  } catch (error) {
    console.error("Error fetching version:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete a specific version
export async function DELETE(request, { params }) {
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
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Delete the version
    const { error: deleteError } = await supabase
      .from("project_versions")
      .delete()
      .eq("id", versionId)
      .eq("project_id", id)

    if (deleteError) {
      console.error("Error deleting version:", deleteError)
      return NextResponse.json({ error: "Failed to delete version" }, { status: 500 })
    }

    console.log(`🗑️ Deleted version ${versionId} for project ${id}`)
    return NextResponse.json({ success: true, message: "Version deleted successfully" })
  } catch (error) {
    console.error("Error deleting version:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

