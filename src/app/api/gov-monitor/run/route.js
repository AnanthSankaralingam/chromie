import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getGovProfileForUser } from "@/lib/gov/gov-profiles"
import { bootstrapGovMonitor } from "@/lib/gov/gov-monitor-bootstrap"
import { GOV_PROFILE_DAILY_RUN_LIMIT } from "@/lib/gov/gov-workflow-access"
import { createServiceClient } from "@/lib/supabase/service"
import { canonicalGovScenarioId, PRIMARY_GOV_SCENARIO_ID } from "@/lib/workflow/workflow-automations"

export const POST = withAuth(async ({ supabase, user }) => {
  let govProfile = null
  try {
    govProfile = await getGovProfileForUser(supabase, user.id)
  } catch (err) {
    console.error("[gov-monitor/run] gov profile lookup failed:", err)
  }

  if (!govProfile) {
    return NextResponse.json({ error: "No gov profile linked" }, { status: 403 })
  }

  const service = createServiceClient()
  if (!service) {
    return NextResponse.json(
      { error: "Server is missing Supabase service credentials." },
      { status: 500 },
    )
  }

  try {
    const result = await bootstrapGovMonitor({
      supabase,
      service,
      user,
      govProfile,
      mode: "manual",
    })

    if (!result.invoked && result.skipped_reason === "daily_run_limit_reached") {
      return NextResponse.json({
        ok: true,
        skipped: true,
        skipped_reason: result.skipped_reason,
        automations: result.automations,
        ensureFailures: result.ensureFailures,
        next_run_at: result.next_run_at,
        message: `This company profile has reached the daily limit of ${GOV_PROFILE_DAILY_RUN_LIMIT} contract searches.`,
      })
    }

    if (!result.invoked && result.skipped_reason === "aws_not_configured") {
      return NextResponse.json(
        {
          error: "Workflow AWS credentials are not configured.",
          skipped_reason: result.skipped_reason,
        },
        { status: 503 },
      )
    }

    return NextResponse.json({
      ok: true,
      automations: result.automations,
      ensureFailures: result.ensureFailures,
      invocation: result.invocation
        ? {
            automation_id: result.scheduleAutomation?.id || result.automations.find(
              (item) => canonicalGovScenarioId(item.scenario_id) === PRIMARY_GOV_SCENARIO_ID,
            )?.id,
            gov_dual_source: true,
            ...result.invocation,
          }
        : null,
      next_run_at: result.next_run_at,
      skipped_reason: result.skipped_reason,
      message: result.invoked
        ? "Government contract monitor started on Lambda (SAM.gov + SBIR in one run). Runs usually take 1-5 minutes."
        : "Contract search monitor is ready.",
    })
  } catch (err) {
    console.error("[gov-monitor/run]", err)
    return NextResponse.json(
      { error: err.message || "Failed to start government monitor workflow" },
      { status: 500 },
    )
  }
})
