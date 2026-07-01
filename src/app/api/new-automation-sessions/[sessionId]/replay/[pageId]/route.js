import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { getReplayPlaylist } from "@/lib/browserbase"

export const GET = withAuth(async ({ params }) => {
  const { sessionId, pageId } = await params

  try {
    const playlist = await getReplayPlaylist(sessionId, pageId)
    return new NextResponse(playlist, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (err) {
    console.error("[new-automation-sessions/replay-page]", err)
    return NextResponse.json(
      { error: err.message || "Replay is not available yet." },
      { status: err.status === 404 ? 404 : 502 },
    )
  }
})
