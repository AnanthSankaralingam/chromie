import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { HyperbrowserService } from "@/lib/hyperbrowser-service"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"
import { BROWSER_SESSION_CONFIG } from "@/lib/constants"

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

    // Check browser minute limit using new limit checker
    const sessionMinutes = BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES
    
    const limitCheck = await checkLimit(user.id, 'browserMinutes', sessionMinutes, supabase)
    
    if (!limitCheck.allowed) {
      console.log(`[api/projects/test] ❌ Browser minute limit exceeded: ${limitCheck.currentUsage}/${limitCheck.limit} on ${limitCheck.plan} plan`)
      return NextResponse.json(
        formatLimitError(limitCheck, 'browserMinutes'),
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

    // Convert files array to object format expected by BrowserBase service
    const extensionFiles = {}
    files?.forEach(file => {
      extensionFiles[file.file_path] = file.content
    })

    // Calculate session expiry - enforce 1 minute maximum for all sessions
    const remainingMinutes = BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES
    const sessionExpiryTime = new Date(now.getTime() + (remainingMinutes * 60 * 1000))

    // Create test session using Hyperbrowser service
    const hyperbrowserService = new HyperbrowserService()
    const sessionData = await hyperbrowserService.createTestSession(extensionFiles, projectId)

    // Skip database storage since browser_sessions table doesn't exist
    console.log('Skipping database session storage (table does not exist)')

    console.log("Test session created successfully:", sessionData.sessionId)
    console.log(`Session expires at: ${sessionExpiryTime.toISOString()}, remaining minutes: ${remainingMinutes}`)

    return NextResponse.json({ 
      success: true,
      session: {
        ...sessionData,
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

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Skip database session lookup since browser_sessions table doesn't exist
    console.log('Skipping database session lookup (table does not exist)')

    // Always record 1 minute used regardless of actual session duration
    const actualMinutesUsed = 1

    // Terminate session using Hyperbrowser service
    const hyperbrowserService = new HyperbrowserService()
    const success = await hyperbrowserService.terminateSession(sessionId)

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

    // Skip database session update since browser_sessions table doesn't exist
    console.log('Skipping database session update (table does not exist)')

    console.log("Test session terminated:", sessionId, success ? "successfully" : "with errors")
    console.log(`Actual minutes used: ${actualMinutesUsed}`)

    return NextResponse.json({ 
      success,
      message: success ? "Session terminated successfully" : "Failed to terminate session",
      actualMinutesUsed
    })

  } catch (error) {
    console.error("Error terminating test session:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to terminate test session" 
    }, { status: 500 })
  }
}