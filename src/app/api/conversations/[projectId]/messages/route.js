import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Fetch conversation messages for a project
export async function GET(request, { params }) {
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
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Fetch conversation history
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("history")
      .eq("project_id", projectId)
      .single()

    if (conversationError) {
      if (conversationError.code === 'PGRST116') {
        // No conversation found - return empty messages
        return NextResponse.json({ messages: [] })
      }
      console.error("Error fetching conversation:", conversationError)
      return NextResponse.json({ 
        error: conversationError.message || "Failed to fetch messages" 
      }, { status: 500 })
    }

    const messages = conversation?.history || []
    console.log(`📬 Retrieved ${messages.length} messages for project ${projectId}`)
    
    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Error fetching conversation messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

