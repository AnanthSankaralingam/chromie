import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request, { params }) {
  const supabase = createClient()
  const projectId = params.id

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
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Fetch testing replays for this project, ordered by most recent first
    const { data: replays, error: replaysError } = await supabase
      .from("testing_replays")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (replaysError) {
      console.error("❌ Error fetching testing replays:", replaysError)
      return NextResponse.json({ error: "Failed to fetch testing replays" }, { status: 500 })
    }

    return NextResponse.json({ replays: replays || [] }, { status: 200 })

  } catch (error) {
    console.error("❌ Error fetching testing replays:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
