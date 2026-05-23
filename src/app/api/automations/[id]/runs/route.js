import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"

export const GET = withAuth(async ({ supabase, user, params }) => {
  const { id } = await params

  const { data: automation } = await supabase
    .from("automations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!automation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data: runs, error } = await supabase
    .from("workflow_runs")
    .select(
      "id, status, success, started_at, finished_at, duration_ms, browserbase_debug_url, error_message"
    )
    .eq("automation_id", id)
    .order("started_at", { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ runs: runs || [] })
})
