import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hyperbrowserService } from "@/lib/hyperbrowser-service"
import { PLAN_LIMITS, DEFAULT_PLAN, BROWSER_SESSION_CONFIG } from "@/lib/constants"

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

    // Check browser usage limits before creating session
    const { data: billing } = await supabase
      .from('billing')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const userPlan = billing?.plan || DEFAULT_PLAN
    const planLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS[DEFAULT_PLAN]

    // Get current browser usage
    const { data: usageData, error: usageError } = await supabase
      .from('token_usage')
      .select('browser_minutes, monthly_reset')
      .eq('user_id', user.id)
      .maybeSingle()

    if (usageError) {
      console.error('Error fetching browser usage:', usageError)
      return NextResponse.json({ error: "Failed to check browser usage limits" }, { status: 500 })
    }

    // Check if monthly reset is due
    const now = new Date()
    const monthlyResetDate = usageData?.monthly_reset ? new Date(usageData.monthly_reset) : null
    let resetDatePlusOneMonth = null
    if (monthlyResetDate) {
      resetDatePlusOneMonth = new Date(monthlyResetDate)
      resetDatePlusOneMonth.setMonth(resetDatePlusOneMonth.getMonth() + 1)
    }
    const isResetDue = monthlyResetDate ? now >= resetDatePlusOneMonth : false
    const currentBrowserMinutes = isResetDue ? 0 : (usageData?.browser_minutes || 0)

    // Check if user has exceeded browser minute limit (but allow 1-minute sessions)
    if (planLimit.monthly_browser_minutes !== -1 && currentBrowserMinutes >= planLimit.monthly_browser_minutes) {
      return NextResponse.json({ 
        error: "Browser testing limit exceeded", 
        details: `You have used ${currentBrowserMinutes}/${planLimit.monthly_browser_minutes} browser minutes this month. Please upgrade your plan for more testing time.`,
        limitExceeded: true,
        currentUsage: currentBrowserMinutes,
        limit: planLimit.monthly_browser_minutes,
        plan: userPlan,
        resetDate: monthlyResetDate ? monthlyResetDate.toISOString() : null
      }, { status: 429 })
    }

    // Check if user has enough remaining minutes for a 1-minute session
    if (planLimit.monthly_browser_minutes !== -1 && (planLimit.monthly_browser_minutes - currentBrowserMinutes) < BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES) {
      return NextResponse.json({ 
        error: "Insufficient browser testing time", 
        details: `You need at least ${BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES} minute(s) remaining for a test session. You have ${planLimit.monthly_browser_minutes - currentBrowserMinutes} minutes left.`,
        limitExceeded: true,
        currentUsage: currentBrowserMinutes,
        limit: planLimit.monthly_browser_minutes,
        required: BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES,
        plan: userPlan,
        resetDate: monthlyResetDate ? monthlyResetDate.toISOString() : null
      }, { status: 429 })
    }

    console.log(`Browser usage check - plan: ${userPlan}, limit: ${planLimit.monthly_browser_minutes}, used: ${currentBrowserMinutes}`)

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