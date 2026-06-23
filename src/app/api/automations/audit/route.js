import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { normalizeAuditRun } from "@/lib/workflow-audit"

export const GET = withAuth(async ({ supabase, request }) => {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") || 40), 100)

  const { data: runs, error } = await supabase
    .from("workflow_runs")
    .select(
      `
      id,
      automation_id,
      scenario_id,
      status,
      success,
      started_at,
      finished_at,
      duration_ms,
      error_message,
      evaluation,
      browserbase_session_id,
      browserbase_debug_url,
      automations(name)
    `,
    )
    .not("automation_id", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    runs: (runs || []).map(normalizeAuditRun),
  })
})
