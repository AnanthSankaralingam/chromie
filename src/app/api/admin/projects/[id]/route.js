import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { withAdminAuth } from "@/lib/api/admin-auth"

export const GET = withAdminAuth(async ({ params }) => {
  const { id } = await params
  const service = createServiceClient()
  if (!service) {
    return NextResponse.json(
      { error: "Service role not configured" },
      { status: 500 }
    )
  }

  try {
    const { data: project, error } = await service
      .from("projects")
      .select("id, name, description, created_at, last_used_at, user_id, github_repo_full_name, github_repo_url")
      .eq("id", id)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (err) {
    console.error("Admin project fetch error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
