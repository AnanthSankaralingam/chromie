import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getSessionLiveViewUrl, terminateBrowserbaseSession } from "@/lib/browserbase"
import { loadSessionTranscript } from "@/lib/new-automation/new-automation-session-transcript"

function wantsTranscript(searchParams) {
  return ["logs", "replay", "transcript"].some((key) => searchParams.get(key) === "1")
}

export const GET = withAuth(async ({ request, params }) => {
  const { sessionId } = await params
  const { searchParams } = new URL(request.url)

  if (wantsTranscript(searchParams)) {
    try {
      const result = await loadSessionTranscript(sessionId)
      return NextResponse.json({
        sessionId,
        ...result,
        message: result.activityMessage || null,
      })
    } catch (err) {
      console.error("[new-automation-sessions/get-logs]", err)
      return NextResponse.json(
        { sessionId, logs: [], message: err.message || "Session logs are not available yet." },
        { status: 202 },
      )
    }
  }

  try {
    const liveUrl = await getSessionLiveViewUrl(sessionId)
    return NextResponse.json({ sessionId, liveUrl })
  } catch (err) {
    return NextResponse.json(
      { sessionId, liveUrl: null, message: err.message || "Live view not ready yet" },
      { status: 202 },
    )
  }
})

export const DELETE = withAuth(async ({ params }) => {
  const { sessionId } = await params

  try {
    let stopMessage = "Browser session ended."
    try {
      await terminateBrowserbaseSession(sessionId)
    } catch (err) {
      stopMessage = err.message || "Browser session may have already ended."
      console.error("[new-automation-sessions/terminate]", err)
    }

    let transcriptPayload = {
      logs: [],
      activity: [],
      pagesVisited: [],
      rawCount: 0,
    }
    let logsMessage = null
    try {
      transcriptPayload = await loadSessionTranscript(sessionId, { stopRecorder: true })
      logsMessage = transcriptPayload.activityMessage || null
    } catch (err) {
      logsMessage = err.message || "Session action transcript is not available yet."
      console.error("[new-automation-sessions/logs]", err)
    }

    return NextResponse.json({
      ok: true,
      sessionId,
      message: stopMessage,
      ...transcriptPayload,
      logsMessage,
      finishedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[new-automation-sessions/delete]", err)
    return NextResponse.json(
      { error: err.message || "Failed to finish browser session" },
      { status: 500 },
    )
  }
})
