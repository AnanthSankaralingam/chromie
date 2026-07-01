import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { buildConnectUrl, createBrowserbaseSession, getSessionLiveViewUrl } from "@/lib/browserbase"
import { startSessionRecording } from "@/lib/new-automation/session-recorder"

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForLiveUrl(sessionId) {
  let lastMessage = "Live browser is starting."

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const liveUrl = await getSessionLiveViewUrl(sessionId)
      if (liveUrl) return { liveUrl }
    } catch (err) {
      lastMessage = err.message || lastMessage
    }
    await sleep(700)
  }

  return { liveUrl: null, message: lastMessage }
}

export const POST = withAuth(async ({ user, request }) => {
  try {
    const body = await request.json().catch(() => ({}))
    const description = String(body.description || "").trim().slice(0, 2000)
    const session = await createBrowserbaseSession({
      userMetadata: {
        source: "chromie-new-automation",
        userId: user.id,
        ...(description ? { description } : {}),
      },
    })
    // Attach a passive CDP observer for the life of the session so we can build
    // a structured action history. `/logs` is unreliable, so this is the
    // primary source of "pages navigated" data. Fire-and-forget on purpose.
    const connectUrl = buildConnectUrl(session)
    if (connectUrl) {
      startSessionRecording({ sessionId: session.id, connectUrl })
    } else {
      console.warn("[new-automation-sessions/create] no connectUrl; action recorder disabled")
    }

    const { liveUrl, message } = await waitForLiveUrl(session.id)

    return NextResponse.json({
      sessionId: session.id,
      liveUrl,
      expiresAt: session.expiresAt,
      status: session.status,
      message,
    })
  } catch (err) {
    console.error("[new-automation-sessions/create]", err)
    return NextResponse.json(
      { error: err.message || "Failed to start browser session" },
      { status: 500 },
    )
  }
})
