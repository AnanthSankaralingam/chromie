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

    // Get session info to calculate actual minutes used
    const { data: sessionInfo, error: sessionError } = await supabase
      .from('browser_sessions')
      .select('created_at, expires_at, remaining_minutes, status, user_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !sessionInfo) {
      return NextResponse.json({ 
        error: "Session not found" 
      }, { status: 404 })
    }

    // Always record 1 minute used regardless of actual session duration
    const actualMinutesUsed = 1

    // Update browser usage with actual minutes used
    if (actualMinutesUsed > 0) {
      try {
        const { error: usageError } = await supabase.rpc('update_browser_usage', {
          user_id: sessionInfo.user_id,
          minutes_used: actualMinutesUsed
        })

        if (usageError) {
          console.error('Error updating browser usage:', usageError)
        } else {
          console.log(`Updated browser usage: +${actualMinutesUsed} minutes for user ${sessionInfo.user_id}`)
        }
      } catch (updateError) {
        console.error('Error calling update_browser_usage function:', updateError)
      }
    }

    // Mark session as manually terminated in database
    const { error: updateError } = await supabase
      .from('browser_sessions')
      .update({ 
        status: 'manually_terminated',
        terminated_at: new Date().toISOString(),
        actual_minutes_used: actualMinutesUsed
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error updating session status:', updateError)
      return NextResponse.json({ 
        error: "Failed to update session status" 
      }, { status: 500 })
    }

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
