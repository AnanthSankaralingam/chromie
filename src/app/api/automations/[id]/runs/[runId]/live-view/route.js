import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getSessionLiveViewUrl, isBrowserbaseDashboardUrl } from "@/lib/browserbase"
import { getAccessibleWorkflowRun } from "@/lib/workflow-run-access"

/** @deprecated Prefer GET .../session-view — this route never returns dashboard URLs. */
export const GET = withAuth(async ({ supabase, user, params }) => {
  const { id: automationId, runId } = await params
  const run = await getAccessibleWorkflowRun(supabase, user.id, automationId, runId)

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 })
  }

  if (
    run.browserbase_debug_url &&
    !isBrowserbaseDashboardUrl(run.browserbase_debug_url)
  ) {
    return NextResponse.json({
      url: run.browserbase_debug_url,
      status: run.status,
    })
  }

  if (run.browserbase_session_id) {
    if (run.status !== "running") {
      return NextResponse.json(
        {
          error: "Run finished — use session-view for HLS replay",
          useSessionView: true,
        },
        { status: 400 }
      )
    }
    try {
      const url = await getSessionLiveViewUrl(run.browserbase_session_id)
      if (url) {
        return NextResponse.json({ url, status: run.status })
      }
    } catch (err) {
      console.error("[live-view]", err)
      return NextResponse.json(
        { pending: true, message: err.message || "Live view not ready yet" },
        { status: 202 }
      )
    }
  }

  if (run.status === "running") {
    return NextResponse.json(
      { pending: true, message: "Waiting for Browserbase session…" },
      { status: 202 }
    )
  }

  return NextResponse.json(
    { error: "No Browserbase session for this run" },
    { status: 404 }
  )
})
