import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { sanitizeRunForClient } from "@/lib/workflow-audit"

export const GET = withAuth(async ({ supabase, user, params }) => {
  const { id } = await params

  const { data: automation } = await supabase
    .from("automations")
    .select("id, scenario_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!automation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data: runs, error } = await supabase
    .from("workflow_runs")
    .select(
      "id, scenario_id, status, success, started_at, finished_at, duration_ms, browserbase_session_id, browserbase_debug_url, error_message, evaluation"
    )
    .eq("automation_id", id)
    .order("started_at", { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    runs: (runs || []).map((run) =>
      sanitizeRunForClient(
        {
          ...run,
          scenario_id: run.scenario_id || automation.scenario_id || null,
        },
        { log: true },
      ),
    ),
  })
})
