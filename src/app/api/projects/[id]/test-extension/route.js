import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hyperbrowserService } from "@/lib/hyperbrowser-service"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"
import { BROWSER_SESSION_CONFIG } from "@/lib/constants"

export async function POST(request, { params }) {
  const supabase = createClient()
  const { id } = params

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check browser minute limit using new limit checker
    const sessionMinutes = BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES
    
    const limitCheck = await checkLimit(user.id, 'browserMinutes', sessionMinutes, supabase)
    
    if (!limitCheck.allowed) {
      console.log(`[api/projects/test-extension] ❌ Browser minute limit exceeded: ${limitCheck.currentUsage}/${limitCheck.limit} on ${limitCheck.plan} plan`)
      return NextResponse.json(
        formatLimitError(limitCheck, 'browserMinutes'),
        { status: 429 }
      )
    }

    // Load existing extension files for this project
    const { data: files, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", id)
      .order("file_path")

    if (filesError) {
      return NextResponse.json({ error: filesError.message }, { status: 500 })
    }

    const extensionFiles = (files || []).map((f) => ({ file_path: f.file_path, content: f.content }))

    // Calculate session expiry - enforce 1 minute maximum for all sessions
    const remainingMinutes = BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES
    const sessionExpiryTime = new Date(now.getTime() + (remainingMinutes * 60 * 1000))

    console.log("Creating session with existing extension files count:", extensionFiles.length)
    const session = await hyperbrowserService.createTestSession(extensionFiles, id)

    // Store session information in database for tracking
    const { error: sessionInsertError } = await supabase
      .from('browser_sessions')
      .insert({
        id: session.sessionId,
        user_id: user.id,
        project_id: id,
        created_at: now.toISOString(),
        expires_at: sessionExpiryTime.toISOString(),
        status: 'active',
        plan: userPlan,
        remaining_minutes: remainingMinutes
      })

    if (sessionInsertError) {
      console.error('Error storing session info:', sessionInsertError)
      // Don't fail the request, just log the error
    }

    console.log(`Session expires at: ${sessionExpiryTime.toISOString()}, remaining minutes: ${remainingMinutes}`)

    return NextResponse.json({ 
      session: {
        ...session,
        expiresAt: sessionExpiryTime.toISOString(),
        remainingMinutes: remainingMinutes,
        plan: userPlan
      }
    })
  } catch (error) {
    console.error("Error creating Hyperbrowser test session:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const supabase = createClient()
  const { id } = params

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { sessionId } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    // Get session info to calculate actual minutes used
    const { data: sessionInfo, error: sessionError } = await supabase
      .from('browser_sessions')
      .select('created_at, expires_at, remaining_minutes, status')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !sessionInfo) {
      console.warn('Session info not found in database:', sessionError)
    }

    // Always record 1 minute used regardless of actual session duration
    const actualMinutesUsed = 1

    const ok = await hyperbrowserService.terminateSession(sessionId)
    if (!ok) {
      return NextResponse.json({ error: "Failed to terminate session" }, { status: 500 })
    }

    // Update browser usage with actual minutes used
    if (actualMinutesUsed > 0) {
      try {
        const { error: usageError } = await supabase.rpc('update_browser_usage', {
          user_id: user.id,
          minutes_used: actualMinutesUsed
        })

        if (usageError) {
          console.error('Error updating browser usage:', usageError)
        } else {
          console.log(`Updated browser usage: +${actualMinutesUsed} minutes for user ${user.id}`)
        }
      } catch (updateError) {
        console.error('Error calling update_browser_usage function:', updateError)
      }
    }

    // Mark session as terminated in database
    if (sessionInfo) {
      const { error: updateError } = await supabase
        .from('browser_sessions')
        .update({ 
          status: 'terminated',
          terminated_at: new Date().toISOString(),
          actual_minutes_used: actualMinutesUsed
        })
        .eq('id', sessionId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating session status:', updateError)
      }
    }

    console.log(`Actual minutes used: ${actualMinutesUsed}`)

    return NextResponse.json({ 
      success: true,
      actualMinutesUsed
    })
  } catch (error) {
    console.error("Error terminating Hyperbrowser session:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
} 