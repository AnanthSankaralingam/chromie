import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getReplayPlaylist } from "@/lib/browserbase"
import { resolveBrowserSessionId } from "@/lib/workflow/workflow-audit"
import { getAccessibleWorkflowRun } from "@/lib/workflow/workflow-run-access"

export const GET = withAuth(async ({ supabase, user, request, params }) => {
  const { id: automationId, runId, pageId } = await params
  const run = await getAccessibleWorkflowRun(supabase, user.id, automationId, runId)

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const requestedSessionId = searchParams.get("session_id")
  const sessionId = resolveBrowserSessionId(run, requestedSessionId)

  if (!sessionId) {
    return NextResponse.json({ error: "No Browserbase session for this run" }, { status: 404 })
  }

  try {
    const body = await getReplayPlaylist(sessionId, pageId)
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (err) {
    console.error("[replay/playlist]", err)
    return NextResponse.json(
      { error: err.message || "Replay not available" },
      { status: err.status === 404 ? 404 : 502 }
    )
  }
})
