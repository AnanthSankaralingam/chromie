import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getReplayPlaylist } from "@/lib/browserbase"
import { getOwnedWorkflowRun } from "@/lib/workflow-run-access"

export const GET = withAuth(async ({ supabase, user, params }) => {
  const { id: automationId, runId, pageId } = await params
  const run = await getOwnedWorkflowRun(supabase, user.id, automationId, runId)

  if (!run?.browserbase_session_id) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 })
  }

  try {
    const body = await getReplayPlaylist(run.browserbase_session_id, pageId)
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
