import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET: List all user's projects with privacy policy status
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
    // Fetch user's projects with privacy policy info
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, name, description, privacy_slug, privacy_policy_last_updated")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching projects for privacy policy:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error("Error fetching projects for privacy policy:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
