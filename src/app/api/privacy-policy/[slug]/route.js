import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET: Public endpoint to fetch privacy policy by slug
export async function GET(request, { params }) {
  const supabase = createClient()
  const { slug } = params

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 })
  }

  try {
    // Public query - uses RLS policy for public access
    const { data: project, error } = await supabase
      .from("projects")
      .select("name, privacy_policy, privacy_policy_last_updated")
      .eq("privacy_slug", slug)
      .not("privacy_policy", "is", null)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: "Privacy policy not found" }, { status: 404 })
    }

    return NextResponse.json({
      project_name: project.name,
      privacy_policy: project.privacy_policy,
      last_updated: project.privacy_policy_last_updated
    })
  } catch (error) {
    console.error("Error fetching public privacy policy:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
