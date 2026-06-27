import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import {
  AUDIT_RUN_SELECT,
  getUserGovProfileId,
  loadGovOrgAuditRuns,
  mergeAuditRuns,
} from "@/lib/gov-workflow-access"
import { createServiceClient } from "@/lib/supabase/service"
import { normalizeAuditRun } from "@/lib/workflow-audit"

export const GET = withAuth(async ({ supabase, user, request }) => {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") || 40), 100)

  const { data: runs, error } = await supabase
    .from("workflow_runs")
    .select(AUDIT_RUN_SELECT)
    .not("automation_id", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let mergedRuns = runs || []

  try {
    const govProfileId = await getUserGovProfileId(supabase, user.id)
    const service = govProfileId ? createServiceClient() : null

    if (govProfileId && service) {
      const orgRuns = await loadGovOrgAuditRuns(service, govProfileId, limit)
      mergedRuns = mergeAuditRuns(mergedRuns, orgRuns, limit)
    }
  } catch (err) {
    console.error("[automations/audit] gov org merge failed", err)
  }

  return NextResponse.json({
    runs: mergedRuns.map((row) => normalizeAuditRun(row, { log: true })),
  })
})
