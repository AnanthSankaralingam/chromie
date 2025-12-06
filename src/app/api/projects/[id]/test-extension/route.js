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

    // Start console log capture in background - with improved CDP approach
    const apiKey = process.env.HYPERBROWSER_API_KEY
    if (apiKey) {
      // Import dynamically to avoid circular dependencies
      Promise.all([
        import("@/lib/utils/browser-actions"),
        import("@/lib/utils/console-log-storage")
      ])
        .then(([{ getPlaywrightSessionContext }, logStorage]) => {
          return getPlaywrightSessionContext(session.sessionId, apiKey)
            .then(({ browser, page }) => ({ browser, page, logStorage }))
        })
        .then(async ({ browser, page, logStorage }) => {
          console.log(`[test-extension] Starting console log capture for session: ${session.sessionId}`)
          
          // Helper function to process log messages
          const processLogMessage = (text, type, context = 'page') => {
            // Extract CHROMIE prefix if log follows pattern [CHROMIE:COMPONENT] message
            let prefix = null
            let component = null
            let isChromieLog = false
            let cleanText = text
            
            // Check for [CHROMIE:COMPONENT] pattern
            const chromiePrefixMatch = text.match(/^\[CHROMIE:([^\]]+)\](.*)/)
            if (chromiePrefixMatch) {
              component = chromiePrefixMatch[1]
              cleanText = chromiePrefixMatch[2].trim()
              prefix = 'CHROMIE:' + component
              isChromieLog = true
            } else {
              // Check for any other [PREFIX] pattern
              const prefixMatch = text.match(/^\[([^\]]+)\](.*)/)
              if (prefixMatch) {
                prefix = prefixMatch[1]
                cleanText = prefixMatch[2].trim()
              }
            }
            
            const logEntry = {
              type: type,
              text: cleanText,
              prefix: prefix,
              component: component,
              isChromieLog: isChromieLog,
              context: context,
              timestamp: new Date().toISOString()
            }
            
            console.log(`[test-extension] Captured ${context} console.${type}:`, text)
            logStorage.addLog(session.sessionId, logEntry)
          }
          
          // Capture page errors
          page.on('pageerror', (error) => {
            const logEntry = {
              type: 'error',
              text: error.message,
              prefix: 'PAGE ERROR',
              component: null,
              isChromieLog: false,
              context: 'page',
              timestamp: new Date().toISOString()
            }
            console.error(`[test-extension] Page error:`, error.message)
            logStorage.addLog(session.sessionId, logEntry)
          })
          
          try {
            // Method 1: Try to set up CDP session for the main page
            console.log(`[test-extension] Setting up CDP for main page...`)
            const client = await page.target().createCDPSession()
            
            // Enable logging domains
            await client.send('Runtime.enable')
            await client.send('Log.enable')
            await client.send('ServiceWorker.enable')
            
            console.log(`[test-extension] CDP session created for main page`)
            
            // Listen to ALL console API calls
            client.on('Runtime.consoleAPICalled', (params) => {
              const { type, args, stackTrace, executionContextId } = params
              
              // Check if this is from an extension context by URL
              const isExtensionContext = stackTrace?.callFrames?.some(frame => 
                frame.url && frame.url.startsWith('chrome-extension://')
              ) || false
              
              if (args && args.length > 0) {
                // Convert args to text
                const text = args.map(arg => {
                  if (arg.value !== undefined) return String(arg.value)
                  if (arg.description) return arg.description
                  if (arg.preview?.description) return arg.preview.description
                  return String(arg.type)
                }).join(' ')
                
                const context = isExtensionContext ? 'extension' : 'page'
                console.log(`[test-extension] CDP Console [${context}/${type}]:`, text)
                processLogMessage(text, type, context)
              }
            })
            
            // Listen to Log.entryAdded
            client.on('Log.entryAdded', (params) => {
              const { entry } = params
              if (entry && entry.text) {
                console.log(`[test-extension] Log entry [${entry.level}]:`, entry.text)
                processLogMessage(entry.text, entry.level, 'browser')
              }
            })
            
            // Listen to Runtime.exceptionThrown
            client.on('Runtime.exceptionThrown', (params) => {
              const { exceptionDetails } = params
              const errorText = exceptionDetails.exception?.description || 
                               exceptionDetails.text || 
                               'Unknown error'
              
              const logEntry = {
                type: 'error',
                text: errorText,
                prefix: 'RUNTIME ERROR',
                component: null,
                isChromieLog: errorText.includes('[CHROMIE:'),
                context: 'runtime',
                timestamp: new Date().toISOString()
              }
              
              console.error(`[test-extension] Runtime error:`, errorText)
              logStorage.addLog(session.sessionId, logEntry)
            })
            
            console.log(`[test-extension] CDP listeners attached to main page`)
            
            // Method 2: Set up listeners for ALL targets (including service workers)
            console.log(`[test-extension] Setting up listeners for all browser targets...`)
            
            // Helper to attach listeners to a page
            const attachToPage = async (targetPage, targetUrl) => {
              if (!targetPage) return
              
              console.log(`[test-extension] Attaching console listeners to page:`, targetUrl)
              
              // Attach console listener
              targetPage.on('console', (msg) => {
                const text = msg.text()
                const type = msg.type()
                console.log(`[test-extension] Page console [${type}]:`, text)
                processLogMessage(text, type, 'extension')
              })
              
              // Attach error listener
              targetPage.on('pageerror', (error) => {
                console.error(`[test-extension] Page error:`, error.message)
                processLogMessage(error.message, 'error', 'extension')
              })
              
              // CRITICAL: Also set up CDP for this page to capture ALL console contexts
              try {
                const pageClient = await targetPage.target().createCDPSession()
                await pageClient.send('Runtime.enable')
                await pageClient.send('Log.enable')
                
                pageClient.on('Runtime.consoleAPICalled', (params) => {
                  const { type, args } = params
                  if (args && args.length > 0) {
                    const text = args.map(arg => {
                      if (arg.value !== undefined) return String(arg.value)
                      if (arg.description) return arg.description
                      return String(arg.type)
                    }).join(' ')
                    
                    console.log(`[test-extension] Page CDP console [${type}]:`, text)
                    processLogMessage(text, type, 'extension')
                  }
                })
                
                console.log(`[test-extension] CDP attached to page successfully`)
              } catch (cdpError) {
                console.warn(`[test-extension] Could not attach CDP to page:`, cdpError.message)
              }
            }
            
            // Listen for new targets (service workers, background pages, sidepanels, popups, etc.)
            browser.on('targetcreated', async (target) => {
              const targetType = target.type()
              const targetUrl = target.url()
              console.log(`[test-extension] 🎯 New target created - Type: ${targetType}, URL:`, targetUrl)
              
              // If it's an extension target, attach CDP to it
              if (targetUrl.startsWith('chrome-extension://')) {
                try {
                  console.log(`[test-extension] 🔌 Attaching to extension target (${targetType}):`, targetUrl)
                  
                  // Wait a bit for the target to be ready
                  await new Promise(resolve => setTimeout(resolve, 100))
                  
                  const targetPage = await target.page().catch(err => {
                    console.log(`[test-extension] Could not get page for target:`, err.message)
                    return null
                  })
                  
                  if (targetPage) {
                    console.log(`[test-extension] ✅ Got page for target, attaching listeners...`)
                    await attachToPage(targetPage, targetUrl)
                  } else {
                    // For service workers or other targets without a page
                    console.log(`[test-extension] 🔧 Target has no page, creating CDP session for worker...`)
                    const workerClient = await target.createCDPSession()
                    
                    await workerClient.send('Runtime.enable')
                    await workerClient.send('Log.enable')
                    
                    workerClient.on('Runtime.consoleAPICalled', (params) => {
                      const { type, args } = params
                      if (args && args.length > 0) {
                        const text = args.map(arg => {
                          if (arg.value !== undefined) return String(arg.value)
                          if (arg.description) return arg.description
                          return String(arg.type)
                        }).join(' ')
                        
                        console.log(`[test-extension] 🔨 Worker console [${type}]:`, text)
                        processLogMessage(text, type, 'background')
                      }
                    })
                    
                    console.log(`[test-extension] ✅ CDP attached to worker`)
                  }
                } catch (targetError) {
                  console.error(`[test-extension] ❌ Failed to attach to target:`, targetError.message)
                  console.error(targetError.stack)
                }
              }
            })
            
            // Also attach to existing targets
            const existingTargets = browser.targets()
            console.log(`[test-extension] 🔍 Found ${existingTargets.length} existing targets`)
            
            for (const target of existingTargets) {
              const targetType = target.type()
              const targetUrl = target.url()
              console.log(`[test-extension] 📋 Existing target - Type: ${targetType}, URL:`, targetUrl)
              
              if (targetUrl.startsWith('chrome-extension://')) {
                console.log(`[test-extension] 🔌 Processing existing extension target:`, targetUrl)
                try {
                  const targetPage = await target.page().catch(err => {
                    console.log(`[test-extension] Could not get page for existing target:`, err.message)
                    return null
                  })
                  
                  if (targetPage) {
                    console.log(`[test-extension] ✅ Got page for existing target, attaching...`)
                    await attachToPage(targetPage, targetUrl)
                  } else {
                    // Service worker
                    console.log(`[test-extension] 🔧 Existing target is a worker, creating CDP session...`)
                    const workerClient = await target.createCDPSession()
                    await workerClient.send('Runtime.enable')
                    await workerClient.send('Log.enable')
                    
                    workerClient.on('Runtime.consoleAPICalled', (params) => {
                      const { type, args } = params
                      if (args && args.length > 0) {
                        const text = args.map(arg => {
                          if (arg.value !== undefined) return String(arg.value)
                          if (arg.description) return arg.description
                          return String(arg.type)
                        }).join(' ')
                        
                        console.log(`[test-extension] 🔨 Existing worker console [${type}]:`, text)
                        processLogMessage(text, type, 'background')
                      }
                    })
                    
                    console.log(`[test-extension] ✅ CDP attached to existing worker`)
                  }
                } catch (existingTargetError) {
                  console.error(`[test-extension] ❌ Failed to attach to existing target:`, existingTargetError.message)
                  console.error(existingTargetError.stack)
                }
              }
            }
            
            console.log(`[test-extension] Console log capture fully initialized`)
          } catch (cdpError) {
            console.error(`[test-extension] CDP setup failed:`, cdpError.message)
            console.error(cdpError.stack)
            
            // Fallback: Just use page console listener
            page.on('console', (msg) => {
              processLogMessage(msg.text(), msg.type(), 'page')
            })
            console.log(`[test-extension] Using fallback console listener`)
          }
        })
        .catch((err) => {
          console.error("[test-extension] Failed to start console log capture:", err.message)
          console.error(err.stack)
        })
    }

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