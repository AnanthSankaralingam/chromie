import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getReplayMetadata, getSessionLiveViewUrl } from "@/lib/browserbase"
import { browserSessionsForRun } from "@/lib/workflow-audit"
import { getOwnedWorkflowRun } from "@/lib/workflow-run-access"

export const GET = withAuth(async ({ supabase, user, request, params }) => {
  const { id: automationId, runId } = await params
  const run = await getOwnedWorkflowRun(supabase, user.id, automationId, runId)

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const requestedSessionId = searchParams.get("session_id")
  const sessions = browserSessionsForRun(run)
  const matchedSession =
    sessions.find((session) => session.browserbase_session_id === requestedSessionId) || sessions[0]
  const sessionId = matchedSession?.browserbase_session_id || run.browserbase_session_id

  if (!sessionId) {
    if (run.status === "running") {
      return NextResponse.json(
        { pending: true, message: "Waiting for Browserbase session…" },
        { status: 202 },
      )
    }
    return NextResponse.json({ error: "No Browserbase session for this run" }, { status: 404 })
  }

  if (run.status === "running") {
    try {
      const url = await getSessionLiveViewUrl(sessionId)
      if (url) {
        return NextResponse.json({ mode: "live", url, status: run.status, sessionId })
      }
    } catch (err) {
      console.error("[session-view/live]", err)
      return NextResponse.json(
        { pending: true, message: err.message || "Live view not ready yet" },
        { status: 202 },
      )
    }
    return NextResponse.json(
      { pending: true, message: "Live view not ready yet" },
      { status: 202 },
    )
  }

  try {
    const meta = await getReplayMetadata(sessionId)
    const pages = meta.pages || []
    if (!pages.length) {
      return NextResponse.json(
        { pending: true, message: "Recording is still processing…" },
        { status: 202 },
      )
    }
    const pageId = String(pages[0].pageId ?? "0")
    const playlistUrl = `/api/automations/${automationId}/runs/${runId}/replay/${pageId}?session_id=${encodeURIComponent(sessionId)}`
    return NextResponse.json({
      mode: "replay",
      status: run.status,
      pageId,
      playlistUrl,
      sessionId,
      pages: pages.map((p) => ({
        pageId: String(p.pageId),
        playlistUrl: `/api/automations/${automationId}/runs/${runId}/replay/${p.pageId}?session_id=${encodeURIComponent(sessionId)}`,
      })),
    })
  } catch (err) {
    console.error("[session-view/replay]", err)
    if (err.status === 404) {
      return NextResponse.json(
        { pending: true, message: "Recording not available yet. Try again in a minute." },
        { status: 202 },
      )
    }
    return NextResponse.json(
      { error: err.message || "Could not load session recording" },
      { status: 502 },
    )
  }
})
