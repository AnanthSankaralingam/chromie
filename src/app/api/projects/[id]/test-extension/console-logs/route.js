import { NextResponse } from "next/server"
import { getLogs, clearLogs } from "@/lib/utils/console-log-storage"

/**
 * Get console logs from a test session
 * GET /api/projects/[id]/test-extension/console-logs?sessionId=xxx
 */
export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    const projectId = params.id

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId parameter" },
        { status: 400 }
      )
    }

    console.log(`[CONSOLE-LOGS] Getting logs for session: ${sessionId}`)

    // Return logs from shared storage
    const logs = getLogs(sessionId)
    
    return NextResponse.json({
      success: true,
      logs: logs,
      sessionId: sessionId
    })
  } catch (error) {
    console.error("[CONSOLE-LOGS] Error getting console logs:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to get console logs",
        logs: []
      },
      { status: 500 }
    )
  }
}

// POST endpoint removed - console log capture is now started automatically
// when a test session is created in the main test-extension route

/**
 * Clear console logs for a session
 * DELETE /api/projects/[id]/test-extension/console-logs?sessionId=xxx
 */
export async function DELETE(request, { params }) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId parameter" },
        { status: 400 }
      )
    }

    console.log(`[CONSOLE-LOGS] Clearing logs for session: ${sessionId}`)

    // Clear logs from shared storage
    clearLogs(sessionId)
    
    return NextResponse.json({
      success: true,
      message: "Console logs cleared",
      sessionId: sessionId
    })
  } catch (error) {
    console.error("[CONSOLE-LOGS] Error clearing console logs:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to clear console logs"
      },
      { status: 500 }
    )
  }
}

