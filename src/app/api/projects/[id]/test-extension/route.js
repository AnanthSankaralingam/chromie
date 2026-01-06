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

    // Also fetch project assets (custom icons, etc.)
    const { data: assets, error: assetsError } = await supabase
      .from("project_assets")
      .select("file_path, content_base64")
      .eq("project_id", id)

    if (assetsError) {
      console.error("Error fetching project assets:", assetsError)
      // Continue without custom assets - not a fatal error
    }

    // Combine code files and assets
    // Mark assets with is_base64 flag so hyperbrowser-service knows to decode them
    const extensionFiles = [
      ...(files || []).map((f) => ({ file_path: f.file_path, content: f.content })),
      ...(assets || []).map((a) => ({ file_path: a.file_path, content: a.content_base64, is_base64: true }))
    ]
    
    console.log(`[test-extension] Loading extension with ${files?.length || 0} code files and ${assets?.length || 0} assets`)

    // Calculate session expiry - enforce 1 minute maximum for all sessions
    const now = new Date()
    const sessionStartTime = now.toISOString()
    const remainingMinutes = BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES
    const sessionExpiryTime = new Date(now.getTime() + (remainingMinutes * 60 * 1000))

    const session = await hyperbrowserService.createTestSession(extensionFiles, id, user.id, supabase)

    // Start console log capture in background
    const apiKey = process.env.HYPERBROWSER_API_KEY
    if (apiKey) {
      Promise.all([
        import("@/lib/utils/browser-actions"),
        import("@/lib/utils/extension-log-capture")
      ])
        .then(([{ getPuppeteerSessionContext }, logCapture]) => {
          return getPuppeteerSessionContext(session.sessionId, apiKey)
            .then(({ browser, page }) => ({ browser, page, logCapture }))
        })
        .then(async ({ browser, page, logCapture }) => {
          await logCapture.setupLogCapture(browser, page, session.sessionId)
        })
        .catch((err) => {
          console.error("[test-extension] Failed to start console log capture:", err.message)
        })
    }

    // Skip database storage since browser_sessions table doesn't exist

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

    return NextResponse.json({ 
      success: true,
      actualMinutesUsed
    })
  } catch (error) {
    console.error("Error terminating Hyperbrowser session:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
} 