import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Hyperbrowser } from "@hyperbrowser/sdk"
import { hyperbrowserService } from "@/lib/hyperbrowser-service"

export async function POST(request, { params }) {
  const supabase = createClient()
  const projectId = params.id

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const sessionId = body?.sessionId

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    const apiKey = process.env.HYPERBROWSER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Hyperbrowser not configured. Missing API key." },
        { status: 500 }
      )
    }

    const hbClient = new Hyperbrowser({ apiKey })

    // Try to fetch live URL for this session (best-effort)
    let liveUrl = null
    try {
      const sessionDetails = await hbClient.sessions.get(sessionId)
      liveUrl =
        sessionDetails.liveViewUrl ||
        sessionDetails.liveUrl ||
        sessionDetails.debuggerUrl ||
        sessionDetails.debuggerFullscreenUrl ||
        null
      console.log(
        "[testing-replays/demo] 🖥️ Extracted live URL:",
        liveUrl ? "Found" : "Not found"
      )
    } catch (liveUrlError) {
      console.warn(
        "[testing-replays/demo] ⚠️ Could not fetch session details before termination:",
        liveUrlError?.message || liveUrlError
      )
    }

    // Terminate the session so Hyperbrowser can finalize the recording more quickly.
    let sessionTerminated = false
    try {
      const ok = await hyperbrowserService.terminateSession(sessionId)
      sessionTerminated = !!ok
      console.log("[testing-replays/demo] 🔚 Session termination requested:", {
        sessionId,
        ok,
      })
    } catch (terminateError) {
      console.warn(
        "[testing-replays/demo] ⚠️ Error terminating session before recording:",
        terminateError?.message || terminateError
      )
    }

    // Poll Hyperbrowser for the video recording URL
    console.log("[testing-replays/demo] 🎥 Fetching demo video recording URL...")
    let videoUrl = null
    let recordingStatus = "unknown"

    try {
      const maxAttempts = 30
      let attempts = 0

      while (attempts < maxAttempts) {
        const recordingResponse = await hbClient.sessions.getVideoRecordingURL(sessionId)
        recordingStatus = recordingResponse.status
        videoUrl = recordingResponse.recordingUrl

        console.log(
          `[testing-replays/demo] 📹 Recording status (attempt ${attempts + 1}/${maxAttempts}):`,
          recordingStatus
        )

        if (recordingStatus === "completed") {
          console.log("[testing-replays/demo] ✅ Video recording ready:", videoUrl)
          break
        } else if (recordingStatus === "failed") {
          console.error(
            "[testing-replays/demo] ❌ Video recording failed:",
            recordingResponse.error
          )
          break
        } else if (recordingStatus === "not_enabled") {
          console.warn(
            "[testing-replays/demo] ⚠️ Video recording not enabled for this session"
          )
          break
        } else if (recordingStatus === "pending" || recordingStatus === "in_progress") {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          attempts++
        } else {
          console.warn(
            "[testing-replays/demo] ⚠️ Unknown recording status:",
            recordingStatus
          )
          break
        }
      }

      if (!videoUrl && recordingStatus !== "completed") {
        console.warn(
          "[testing-replays/demo] ⚠️ Demo recording not ready after polling window"
        )
      }
    } catch (recordingError) {
      console.error(
        "[testing-replays/demo] ❌ Failed to fetch demo recording URL:",
        recordingError?.message || recordingError
      )
      recordingStatus = recordingStatus === "unknown" ? "error" : recordingStatus
    }

    // Save demo replay to session_replays table
    try {
      const { error: replayError } = await supabase.from("session_replays").insert({
        project_id: projectId,
        session_id: sessionId,
        live_url: liveUrl,
        video_url: videoUrl,
        recording_status: recordingStatus,
        test_type: "demo",
        test_result: {
          success: !!videoUrl && recordingStatus === "completed",
          message: videoUrl
            ? "Demo recording saved successfully"
            : "Demo recording requested; video may still be processing.",
          source: "manual_demo",
        },
      })

      if (replayError) {
        console.error(
          "[testing-replays/demo] ⚠️ Failed to save demo replay to database:",
          replayError
        )
      } else {
        console.log("[testing-replays/demo] ✅ Demo replay saved to database")
      }
    } catch (replayError) {
      console.error(
        "[testing-replays/demo] ⚠️ Error inserting demo replay:",
        replayError?.message || replayError
      )
    }

    return NextResponse.json({
      success: true,
      videoUrl,
      recordingStatus,
      sessionTerminated,
    })
  } catch (error) {
    console.error(
      "[testing-replays/demo] ❌ Error creating demo replay:",
      error?.message || error
    )
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

