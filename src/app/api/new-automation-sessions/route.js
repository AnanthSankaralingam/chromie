import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import {
  buildConnectUrl,
  createBrowserbaseSession,
  getSessionLiveViewUrl,
  resolveIdentitySessionPinning,
} from "@/lib/browserbase"
import { startSessionRecording } from "@/lib/new-automation/session-recorder"
import { ensureProfileBrowserbaseContextId } from "@/lib/new-automation/recording-context"
import { createServiceClient } from "@/lib/supabase/service"

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

    // Attach the identity-level persisted context (frozen on the profile): the
    // company's shared context if corporate, else the user's own. A failure here
    // must not block recording — fall back to a fresh, non-persisted cookie jar.
    let browserbaseContextId = null
    let companyId = null
    try {
      const service = createServiceClient()
      if (service) {
        const resolved = await ensureProfileBrowserbaseContextId(service, user)
        browserbaseContextId = resolved.contextId
        companyId = resolved.companyId
      } else {
        console.warn("[new-automation-sessions/create] service client unavailable; no persisted context")
      }
    } catch (contextErr) {
      console.warn("[new-automation-sessions/create] context resolve failed", contextErr)
    }

    // Pin egress (region + proxy + viewport) so the login cookies captured here
    // are minted under the same identity the runner reuses for scheduled runs.
    const pinning = resolveIdentitySessionPinning()

    const session = await createBrowserbaseSession({
      contextId: browserbaseContextId,
      persist: true,
      region: pinning.region,
      proxies: pinning.proxies,
      viewport: pinning.viewport,
      // This is a human-driven login (like scripts/eviivo_login.py): keep the
      // captcha solver OFF so the person solves any real login challenge; a
      // scheduled recorded run later leaves solveCaptchas at its default (on).
      solveCaptchas: false,
      userMetadata: {
        source: "chromie-new-automation",
        userId: user.id,
        ...(companyId ? { companyId } : {}),
        ...(browserbaseContextId ? { browserbaseContextId } : {}),
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
      browserbaseContextId,
      companyId,
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
