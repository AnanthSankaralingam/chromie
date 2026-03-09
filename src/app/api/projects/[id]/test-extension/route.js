import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hyperbrowserService } from "@/lib/hyperbrowser-service"
import { buildExtension } from "@/lib/build/esbuild-service.js"
import { ensureRequiredFiles } from "@/lib/utils/hyperbrowser-utils"
import { checkLimit, formatLimitError } from "@/lib/limit-checker"
import { BROWSER_SESSION_CONFIG, CREDIT_COSTS } from "@/lib/constants"
import { classifyError } from "@/lib/utils/error-classifier"

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))

    // Handle session termination via POST (for sendBeacon compatibility)
    if (body?.action === "terminate" && body?.sessionId) {
      console.log("[test-extension] POST terminate action for session:", body.sessionId)
      const ok = await hyperbrowserService.terminateSession(body.sessionId)
      return NextResponse.json({ success: ok })
    }
    // Always await pinning to capture the Chrome extension ID
    const awaitPinExtension = body?.awaitPinExtension !== false

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

    // Check credit limit for browser testing (1 credit per use). We only charge after
    // a successful build + session creation, but still enforce the limit up-front.
    const browserTestCredits = CREDIT_COSTS.BROWSER_TESTING
    const limitCheck = await checkLimit(user.id, 'credits', browserTestCredits, supabase)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        formatLimitError(limitCheck, 'credits'),
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
      .not("file_path", "like", "tests/%") // exclude generated test artifacts from extension bundle
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

    // Build extension (ensure required files + bundle)
    const codeFiles = (files || []).filter((f) => !f.file_path.startsWith("tests/") && !f.file_path.startsWith(".chromie/"))
    if (codeFiles.length === 0) {
      return NextResponse.json({ error: "No buildable files found" }, { status: 404 })
    }

    const ensuredFiles = ensureRequiredFiles(codeFiles.map((f) => ({ file_path: f.file_path, content: f.content })))
    const originalPaths = new Set(codeFiles.map((f) => f.file_path))
    const placeholders = ensuredFiles.filter((f) => !originalPaths.has(f.file_path))
    console.log(`[test-extension] Upserting ${placeholders.length} placeholder files: ${placeholders.map(f => f.file_path).join(', ')}`)
    for (const file of placeholders) {
      console.log(`[test-extension]   - upserting: ${file.file_path}`)
      await supabase.from("code_files").upsert(
        { project_id: id, file_path: file.file_path, content: file.content, last_used_at: new Date().toISOString() },
        { onConflict: "project_id,file_path" }
      )
      console.log(`[test-extension]   - upserted: ${file.file_path}`)
    }

    const fileMap = Object.fromEntries(ensuredFiles.map((f) => [f.file_path, f.content]))
    console.log(`[test-extension] Starting buildExtension with ${Object.keys(fileMap).length} files: ${Object.keys(fileMap).join(', ')}`)
    const buildStart = Date.now()
    const buildResult = await buildExtension({ files: fileMap, planPackages: [] })
    console.log(`[test-extension] buildExtension completed in ${Date.now() - buildStart}ms, success=${buildResult.success}`)
    if (!buildResult.success) {
      const msg = buildResult.errors?.length
        ? buildResult.errors.map((e) => `${e.file || "build"}: ${e.message}`).join("; ")
        : "Build failed"
      return NextResponse.json({ error: `Extension build failed: ${msg}` }, { status: 500 })
    }

    const builtFiles = Object.entries(buildResult.files).map(([file_path, content]) => ({ file_path, content }))
    const extensionFiles = [
      ...builtFiles,
      ...(assets || []).map((a) => ({ file_path: a.file_path, content: a.content_base64, is_base64: true }))
    ]
    console.log(`[test-extension] Built ${builtFiles.length} files, ${assets?.length || 0} assets`)

    // Calculate session expiry: 5 min for "Run Tests", else use default (Try it out)
    const now = new Date()
    const sessionStartTime = now.toISOString()
    const remainingMinutes = body?.isRunTests === true
      ? 5
      : BROWSER_SESSION_CONFIG.SESSION_DURATION_MINUTES
    const sessionExpiryTime = new Date(now.getTime() + (remainingMinutes * 60 * 1000))

    const viewport = body?.viewport && typeof body.viewport === "object" && body.viewport.width && body.viewport.height
      ? body.viewport
      : null
    console.log(`[test-extension] Creating hyperbrowser session (awaitPinExtension=${awaitPinExtension}, files=${extensionFiles.length}, viewport=${viewport ? `${viewport.width}x${viewport.height}` : "default"})...`)
    const sessionStart = Date.now()
    const session = await hyperbrowserService.createTestSession(
      extensionFiles,
      id,
      user.id,
      supabase,
      { awaitPinExtension, viewport }
    )
    console.log(`[test-extension] createTestSession completed in ${Date.now() - sessionStart}ms`)

    // Store the Chrome extension ID if we got it
    if (session.chromeExtensionId) {
      console.log("[test-extension] ✅ Got Chrome extension ID from session:", session.chromeExtensionId)
      
      try {
        const { error: storeError } = await supabase
          .from("code_files")
          .upsert(
            {
              project_id: id,
              file_path: ".chromie/extension-id.json",
              content: JSON.stringify({ 
                chromeExtensionId: session.chromeExtensionId,
                hyperbrowserExtensionId: session.hyperbrowserExtensionId,
                capturedAt: new Date().toISOString() 
              }, null, 2)
            },
            { onConflict: "project_id,file_path" }
          )
        
        if (storeError) {
          console.error("[test-extension] ❌ Failed to store extension ID:", storeError.message)
        } else {
          console.log("[test-extension] ✅ Stored Chrome extension ID in database")
        }
      } catch (storeErr) {
        console.error("[test-extension] ❌ Error storing extension ID:", storeErr.message)
      }
    } else {
      console.warn("[test-extension] ⚠️  No Chrome extension ID in session response")
    }

    // Charge 1 credit only after we have successfully built the extension and
    // created a Testing Browser session. This avoids charging for failed builds.
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      let db = supabase
      if (supabaseUrl && serviceKey) {
        const { createClient: createServiceClient } = await import('@supabase/supabase-js')
        db = createServiceClient(supabaseUrl, serviceKey)
      }

      const { data: existingUsage, error: fetchError } = await db
        .from('token_usage')
        .select('id, total_credits, total_tokens, monthly_reset, model')
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing usage (post-session):', fetchError)
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
          const { error: updateError } = await db
            .from('token_usage')
            .update({
              total_credits: newTotalCredits,
              monthly_reset: newMonthlyResetISO
            })
            .eq('id', existingUsage.id)
            .eq('user_id', user.id)

          if (updateError) {
            console.error('Error updating credit usage after test session creation:', updateError)
          } else {
            console.log(`✅ Charged ${browserTestCredits} credit(s) for browser testing session creation`)
          }
        } else {
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
            console.error('Error creating credit usage record after test session creation:', insertError)
          } else {
            console.log(`✅ Charged ${browserTestCredits} credit(s) for browser testing session creation`)
          }
        }
      }
    } catch (updateError) {
      console.error('Error charging credit after test session creation:', updateError)
      // Non-fatal: the session is already running; we just skip charging on failure.
    }

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
    console.error("Error creating Testing Browser session:", error)

    const classification = classifyError(error)

    return NextResponse.json({
      error: error.message || "Internal server error",
      errorCode: error.code || null,
      errorType: classification.type,
      errorCategory: classification.category,
    }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

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

    // Credit was already charged when session was created, no need to charge again
    return NextResponse.json({ 
      success: true,
      message: "Session terminated successfully"
    })
  } catch (error) {
    console.error("Error terminating Hyperbrowser session:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
} 