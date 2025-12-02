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

    // Extract user plan from limit check
    const userPlan = limitCheck.plan

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
    const now = new Date()
    const sessionStartTime = now.toISOString()
    const remainingMinutes = BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES
    const sessionExpiryTime = new Date(now.getTime() + (remainingMinutes * 60 * 1000))

    console.log("Creating session with existing extension files count:", extensionFiles.length)
    const session = await hyperbrowserService.createTestSession(extensionFiles, id, user.id, supabase)

    // Debug: Log session details after creation
    console.log("🔍 Session created successfully:", {
      sessionId: session.sessionId,
      status: session.status,
      liveViewUrl: session.liveViewUrl,
      connectUrl: session.connectUrl
    })

    // Note: Extension pinning is now handled automatically in createTestSession

    // Skip database storage since browser_sessions table doesn't exist
    console.log('Skipping database session storage (table does not exist)')

    console.log(`Session starts at: ${sessionStartTime}, expires at: ${sessionExpiryTime.toISOString()}, remaining minutes: ${remainingMinutes}`)

    return NextResponse.json({
      session: {
        ...session,
        startedAt: sessionStartTime,
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
    const { sessionId, startedAt } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    // Skip database session lookup since browser_sessions table doesn't exist
    console.log('Skipping database session lookup (table does not exist)')

    // Calculate actual minutes used based on elapsed time
    let actualMinutesUsed = BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES // Default to full session

    if (startedAt) {
      const startTime = new Date(startedAt)
      const endTime = new Date()
      const elapsedMs = endTime.getTime() - startTime.getTime()
      const elapsedMinutes = elapsedMs / (60 * 1000)

      // Round up to nearest minute, minimum 1 minute
      actualMinutesUsed = Math.max(1, Math.ceil(elapsedMinutes))

      // Cap at session duration limit
      actualMinutesUsed = Math.min(actualMinutesUsed, BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES)

      console.log(`📊 Session duration: ${elapsedMinutes.toFixed(2)} minutes, charging: ${actualMinutesUsed} minutes`)
    } else {
      console.log(`⚠️ No startedAt provided, defaulting to full session duration: ${actualMinutesUsed} minutes`)
    }

    const ok = await hyperbrowserService.terminateSession(sessionId)
    if (!ok) {
      return NextResponse.json({ error: "Failed to terminate session" }, { status: 500 })
    }

    // Update browser usage with actual minutes used
    if (actualMinutesUsed > 0) {
      try {
        // Check if user already has a token_usage record
        const { data: existingUsage, error: fetchError } = await supabase
          .from('token_usage')
          .select('browser_minutes')
          .eq('user_id', user.id)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error fetching existing usage:', fetchError)
          return
        }

        if (existingUsage) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('token_usage')
            .update({
              browser_minutes: (existingUsage.browser_minutes || 0) + actualMinutesUsed
            })
            .eq('user_id', user.id)

          if (updateError) {
            console.error('Error updating browser usage:', updateError)
          } else {
            console.log(`Updated browser usage: +${actualMinutesUsed} minutes for user ${user.id}`)
          }
        } else {
          // Create new record
          const { error: insertError } = await supabase
            .from('token_usage')
            .insert({
              user_id: user.id,
              total_tokens: 0,
              model: 'none',
              monthly_reset: new Date().toISOString(),
              browser_minutes: actualMinutesUsed
            })

          if (insertError) {
            console.error('Error creating browser usage record:', insertError)
          } else {
            console.log(`Created browser usage: +${actualMinutesUsed} minutes for user ${user.id}`)
          }
        }
      } catch (updateError) {
        console.error('Error updating browser usage:', updateError)
      }
    }

    // Skip database session update since browser_sessions table doesn't exist
    console.log('Skipping database session update (table does not exist)')

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