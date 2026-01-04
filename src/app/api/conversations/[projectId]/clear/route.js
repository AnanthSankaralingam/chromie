import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// DELETE - Clear conversation history for a project (keeps code files intact)
export async function DELETE(request, { params }) {
  const supabase = createClient()
  const { projectId } = params

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
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Delete conversation history (this removes the entire conversation row)
    const { error: deleteError } = await supabase
      .from("conversations")
      .delete()
      .eq("project_id", projectId)

    if (deleteError) {
      console.error("Error clearing conversation:", deleteError)
      return NextResponse.json({ 
        error: deleteError.message || "Failed to clear conversation" 
      }, { status: 500 })
    }

    console.log(`🗑️ Cleared conversation history for project ${project.name} (${projectId})`)
    
    return NextResponse.json({ 
      success: true,
      message: "Conversation history cleared successfully"
    })
  } catch (error) {
    console.error("Error clearing conversation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

