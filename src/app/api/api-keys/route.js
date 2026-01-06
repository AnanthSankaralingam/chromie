import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - Get all API keys for the current user (across all projects)
export async function GET(request) {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get all projects with API keys for this user
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name, api_key_prefix, api_key_last_used_at, created_at")
      .eq("user_id", user.id)
      .not("api_key_hash", "is", null)
      .order("created_at", { ascending: false })

    if (projectsError) {
      console.error("Error fetching API keys:", projectsError)
      return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 })
    }

    // Format the response
    const apiKeys = projects.map(project => ({
      id: project.id,
      name: project.name,
      key: project.api_key_prefix, // Display prefix only
      created: project.created_at,
      lastUsed: project.api_key_last_used_at
    }))

    return NextResponse.json({
      apiKeys,
      count: apiKeys.length
    })
  } catch (error) {
    console.error("Error fetching API keys:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
