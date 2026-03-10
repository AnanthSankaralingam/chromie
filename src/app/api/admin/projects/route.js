import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { withAdminAuth } from "@/lib/api/admin-auth"

export const GET = withAdminAuth(async ({ request }) => {
  const service = createServiceClient()
  if (!service) {
    return NextResponse.json(
      { error: "Service role not configured" },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 200)
  const offset = parseInt(searchParams.get("offset") || "0", 10)

  try {
    const { data: projectsRaw, error } = await service
      .from("projects")
      .select("id, name, user_id, created_at, last_used_at")
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const projects = (projectsRaw || []).filter((p) => !(p.name || "").startsWith("[eval]"))

    if (error) {
      console.error("Admin projects fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const projectList = projects || []
    if (projectList.length === 0) {
      return NextResponse.json({ projects: [], total: 0 })
    }

    const projectIds = projectList.map((p) => p.id)
    const userIds = [...new Set(projectList.map((p) => p.user_id).filter(Boolean))]

    const [profilesRes, convosRes, filesRes] = await Promise.all([
      service.from("profiles").select("id, name").in("id", userIds),
      service.from("conversations").select("project_id, history").in("project_id", projectIds),
      service.from("code_files").select("project_id").in("project_id", projectIds),
    ])

    const profileMap = Object.fromEntries(
      (profilesRes.data || []).map((p) => [p.id, p.name])
    )
    const convoMap = Object.fromEntries(
      (convosRes.data || []).map((c) => [
        c.project_id,
        Array.isArray(c.history) ? c.history.length : 0,
      ])
    )
    const fileCounts = {}
    for (const row of filesRes.data || []) {
      if (row.project_id) {
        fileCounts[row.project_id] = (fileCounts[row.project_id] || 0) + 1
      }
    }

    const results = projectList.map((p) => ({
      id: p.id,
      name: p.name,
      user_id: p.user_id,
      created_at: p.created_at,
      last_used_at: p.last_used_at,
      author_name: profileMap[p.user_id] || null,
      message_count: convoMap[p.id] || 0,
      file_count: fileCounts[p.id] || 0,
    }))

    return NextResponse.json({ projects: results, total: results.length })
  } catch (err) {
    console.error("Admin projects error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
