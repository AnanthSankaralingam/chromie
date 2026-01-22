import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { HyperbrowserService } from "@/lib/hyperbrowser-service"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"
import { BROWSER_SESSION_CONFIG, CREDIT_COSTS } from "@/lib/constants"

// TODO depracate this route
export async function POST(request, { params }) {
  const supabase = createClient()
  const { id: projectId } = params

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
      .select("id, name")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Check credit limit for browser testing (1 credit per use)
    const browserTestCredits = CREDIT_COSTS.BROWSER_TESTING
    
    const limitCheck = await checkLimit(user.id, 'credits', browserTestCredits, supabase)
    
    if (!limitCheck.allowed) {
      console.log(`[api/projects/test] ❌ Credit limit exceeded: ${limitCheck.currentUsage}/${limitCheck.limit} on ${limitCheck.plan} plan`)
      return NextResponse.json(
        formatLimitError(limitCheck, 'credits'),
        { status: 429 }
      )
    }

    // Get project files
    const { data: files, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", projectId)

    if (filesError) {
      console.error("Error fetching project files:", filesError)
      return NextResponse.json({ error: "Failed to fetch project files" }, { status: 500 })
    }

    // Get project assets (custom icons and other files)
    const { data: assets, error: assetsError } = await supabase
      .from("project_assets")
      .select("file_path, content_base64")
      .eq("project_id", projectId)

    if (assetsError) {
      console.error("Error fetching project assets:", assetsError)
      // Continue without custom assets - not a fatal error
    }

    // Extract user plan from limit check
    const userPlan = limitCheck.plan

    // Convert files array to object format expected by BrowserBase service
    const extensionFiles = {}
    files?.forEach(file => {
      extensionFiles[file.file_path] = file.content
    })

    // Add project assets (convert base64 back to binary for consistency, but the service will handle it)
    assets?.forEach(asset => {
      extensionFiles[asset.file_path] = asset.content_base64
    })

    // Calculate session expiry - enforce 1 minute maximum for all sessions
    const now = new Date()
    const sessionStartTime = now.toISOString()
    const remainingMinutes = BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES
    const sessionExpiryTime = new Date(now.getTime() + (remainingMinutes * 60 * 1000))

    // Create test session using Hyperbrowser service with user profile support
    const hyperbrowserService = new HyperbrowserService()
    const sessionData = await hyperbrowserService.createTestSession(extensionFiles, projectId, user.id, supabase)

    // Skip database storage since browser_sessions table doesn't exist
    console.log('Skipping database session storage (table does not exist)')

    console.log("Test session created successfully:", sessionData.sessionId)
    console.log(`Session starts at: ${sessionStartTime}, expires at: ${sessionExpiryTime.toISOString()}, remaining minutes: ${remainingMinutes}`)

    return NextResponse.json({
      success: true,
      session: {
        ...sessionData,
        startedAt: sessionStartTime,
        expiresAt: sessionExpiryTime.toISOString(),
        remainingMinutes: remainingMinutes,
        plan: userPlan
      }
    })

  } catch (error) {
    console.error("Error creating test session:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to create test session" 
    }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const supabase = createClient()
  const { id: projectId } = params

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
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    const { sessionId, startedAt } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

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

    // Terminate session using Hyperbrowser service
    const hyperbrowserService = new HyperbrowserService()
    const success = await hyperbrowserService.terminateSession(sessionId)

    // Charge 1 credit for browser testing (charged when session ends)
    const browserTestCredits = CREDIT_COSTS.BROWSER_TESTING
    
    try {
      // Use service-role client for RLS-safe updates
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      let db = supabase
      if (supabaseUrl && serviceKey) {
        const { createClient: createServiceClient } = await import('@supabase/supabase-js')
        db = createServiceClient(supabaseUrl, serviceKey)
      }

      // Check if user already has a token_usage record
      const { data: existingUsage, error: fetchError } = await db
        .from('token_usage')
        .select('id, total_credits, total_tokens, monthly_reset, model')
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching existing usage:', fetchError)
      } else {
        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        let newMonthlyResetISO = existingUsage?.monthly_reset || firstDayOfMonth.toISOString()

        // Determine if reset is due
        let isResetDue = false
        if (existingUsage?.monthly_reset) {
          const d = new Date(existingUsage.monthly_reset)
          const plusOne = new Date(d)
          plusOne.setMonth(plusOne.getMonth() + 1)
          isResetDue = now >= plusOne
        }

        let newTotalCredits
        if (!existingUsage || isResetDue) {
          newTotalCredits = browserTestCredits
          newMonthlyResetISO = firstDayOfMonth.toISOString()
        } else {
          newTotalCredits = (existingUsage.total_credits || 0) + browserTestCredits
        }

        if (existingUsage?.id) {
          // Update existing record
          const { error: updateError } = await db
            .from('token_usage')
            .update({
              total_credits: newTotalCredits,
              monthly_reset: newMonthlyResetISO
            })
            .eq('id', existingUsage.id)
            .eq('user_id', user.id)

          if (updateError) {
            console.error('Error updating credit usage:', updateError)
          } else {
            console.log(`Updated credit usage: +${browserTestCredits} credits for user ${user.id}`)
          }
        } else {
          // Create new record
          const { error: insertError } = await db
            .from('token_usage')
            .insert({
              user_id: user.id,
              total_credits: browserTestCredits,
              total_tokens: 0,
              model: 'browser-testing',
              monthly_reset: newMonthlyResetISO
            })

          if (insertError) {
            console.error('Error creating credit usage record:', insertError)
          } else {
            console.log(`Created credit usage: +${browserTestCredits} credits for user ${user.id}`)
          }
        }
      }
    } catch (updateError) {
      console.error('Error updating credit usage:', updateError)
    }

    console.log("Test session terminated:", sessionId, success ? "successfully" : "with errors")
    console.log(`Credits charged: ${browserTestCredits}`)

    return NextResponse.json({ 
      success,
      message: success ? "Session terminated successfully" : "Failed to terminate session",
      creditsCharged: browserTestCredits
    })

  } catch (error) {
    console.error("Error terminating test session:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to terminate test session" 
    }, { status: 500 })
  }
}