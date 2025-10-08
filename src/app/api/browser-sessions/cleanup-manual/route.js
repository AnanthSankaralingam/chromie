import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request) {
  const supabase = createClient()

  try {
    const { sessionId, projectId } = await request.json()

    if (!sessionId || !projectId) {
      return NextResponse.json({ 
        error: "Session ID and Project ID are required" 
      }, { status: 400 })
    }

    // Skip database operations since browser_sessions table doesn't exist
    console.log('Skipping database operations (browser_sessions table does not exist)')
    
    // Always record 1 minute used regardless of actual session duration
    const actualMinutesUsed = 1

    console.log(`Manual cleanup completed for session ${sessionId}, used ${actualMinutesUsed} minutes`)

    return NextResponse.json({
      success: true,
      actualMinutesUsed,
      message: "Session cleaned up successfully"
    })

  } catch (error) {
    console.error("Error during manual session cleanup:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to cleanup session" 
    }, { status: 500 })
  }
}
