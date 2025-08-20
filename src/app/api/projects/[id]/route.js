import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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
    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, description, created_at, last_used_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Error fetching project:", error)
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
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Delete all code files associated with the project
    const { error: filesDeleteError } = await supabase
      .from("code_files")
      .delete()
      .eq("project_id", id)

    if (filesDeleteError) {
      console.error("Error deleting project files:", filesDeleteError)
      return NextResponse.json({ error: "Failed to delete project files" }, { status: 500 })
    }

    // Delete the project
    const { error: projectDeleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (projectDeleteError) {
      console.error("Error deleting project:", projectDeleteError)
      return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
    }

    console.log(`Project ${id} deleted successfully by user ${user.id}`)
    return NextResponse.json({ success: true, message: "Project deleted successfully" })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}