import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getAccessibleWorkflowRun } from "@/lib/workflow-run-access"
import { stopWorkflowRun } from "@/lib/workflow-run-stop"

export const POST = withAuth(async ({ supabase, user, params }) => {
  const { id: automationId, runId } = await params
  const run = await getAccessibleWorkflowRun(supabase, user.id, automationId, runId)

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 })
  }

  if (run.status !== "running") {
    return NextResponse.json(
      { error: "Run is not active", status: run.status },
      { status: 400 }
    )
  }

  try {
    const result = await stopWorkflowRun(run)
    return NextResponse.json({
      ok: true,
      run_id: runId,
      message: result.alreadyStopped
        ? "Run was already stopped"
        : "Run stopped. Browser session terminated.",
    })
  } catch (err) {
    console.error("[automations/stop]", err)
    return NextResponse.json(
      { error: err.message || "Failed to stop run" },
      { status: 500 }
    )
  }
})
