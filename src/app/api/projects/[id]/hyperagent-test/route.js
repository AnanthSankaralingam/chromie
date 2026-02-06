import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Hyperbrowser } from "@hyperbrowser/sdk"
import { analyzeLogsForTestVerification, formatErrorSummary } from "@/lib/utils/test-log-verification"

export async function POST(request, { params }) {
  const supabase = createClient()
  const projectId = params.id

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
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

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

    // Get the HyperAgent test script from the project files
    const { data: hyperAgentFile, error: fileError } = await supabase
      .from("code_files")
      .select("content")
      .eq("project_id", projectId)
      .eq("file_path", "tests/hyperagent_test_script.js")
      .single()

    if (fileError || !hyperAgentFile) {
      return NextResponse.json({ 
        error: "BrowserUse test script not found. Please regenerate the extension to include the test script." 
      }, { status: 404 })
    }

    console.log("🤖 Executing BrowserUse test for project:", projectId)
    console.log("📋 Session ID:", sessionId)

    // Try to read the stored Chrome extension ID from the last test session
    let chromeExtensionId = null
    const { data: extensionIdFile } = await supabase
      .from("code_files")
      .select("content")
      .eq("project_id", projectId)
      .eq("file_path", ".chromie/extension-id.json")
      .single()

    if (extensionIdFile?.content) {
      try {
        const idData = JSON.parse(extensionIdFile.content)
        chromeExtensionId = idData.chromeExtensionId || null
        console.log("✅ Found stored Chrome extension ID:", chromeExtensionId)
      } catch (e) {
        console.warn("⚠️  Could not parse stored extension ID:", e.message)
      }
    } else {
      console.log("ℹ️  No stored Chrome extension ID found - tests will use extension icon clicks")
    }

    // Read manifest to get extension page paths
    const { data: manifestFile } = await supabase
      .from("code_files")
      .select("content")
      .eq("project_id", projectId)
      .eq("file_path", "manifest.json")
      .single()

    let popupFile = null
    let optionsPage = null
    let sidePanelPath = null

    if (manifestFile?.content) {
      try {
        const manifest = JSON.parse(manifestFile.content)
        popupFile = manifest?.action?.default_popup || manifest?.browser_action?.default_popup || null
        optionsPage = manifest?.options_page || manifest?.options_ui?.page || null
        sidePanelPath = manifest?.side_panel?.default_path || null
      } catch (e) {
        console.warn("⚠️  Could not parse manifest.json:", e.message)
      }
    }

    // Construct extension URLs if extension ID is available
    const popupUrl = chromeExtensionId && popupFile 
      ? `chrome-extension://${chromeExtensionId}/${popupFile}` 
      : null
    const optionsUrl = chromeExtensionId && optionsPage 
      ? `chrome-extension://${chromeExtensionId}/${optionsPage}` 
      : null
    const sidePanelUrl = chromeExtensionId && sidePanelPath 
      ? `chrome-extension://${chromeExtensionId}/${sidePanelPath}` 
      : null

    if (chromeExtensionId) {
      console.log("🔗 Extension URLs available:")
      if (popupUrl) console.log("  - Popup:", popupUrl)
      if (optionsUrl) console.log("  - Options:", optionsUrl)
      if (sidePanelUrl) console.log("  - Side Panel:", sidePanelUrl)
    }

    // Initialize HyperBrowser client
    const hbClient = new Hyperbrowser({
      apiKey: process.env.HYPERBROWSER_API_KEY,
    })

    if (!process.env.HYPERBROWSER_API_KEY) {
      return NextResponse.json({ 
        error: "HyperBrowser not configured. Missing API key." 
      }, { status: 500 })
    }

    // Inject extension URLs into the test script
    let testScript = hyperAgentFile.content
    
    // Replace placeholders with actual URLs or fallback instructions
    testScript = testScript.replace(
      /\{\{POPUP_URL\}\}/g, 
      popupUrl || "the extension popup (click the extension icon)"
    )
    testScript = testScript.replace(
      /\{\{OPTIONS_URL\}\}/g, 
      optionsUrl || "the extension options page (right-click extension icon and select Options)"
    )
    testScript = testScript.replace(
      /\{\{SIDEPANEL_URL\}\}/g, 
      sidePanelUrl || "the extension side panel (click the extension icon)"
    )

    console.log("📝 Injected extension URLs into test script")
    
    console.log("📄 Parsing HyperAgent test script...")
    
    // Extract extension name from comments
    const nameMatch = testScript.match(/\/\/.*?test script for:?\s*(.+)/i)
    const extensionName = nameMatch ? nameMatch[1].trim() : project.name
    
    console.log(`📦 Extension name: ${extensionName}`)
    
    // Extract task strings from hyperAgent.startAndWait calls
    const taskMatches = testScript.match(/task:\s*["`']([^"`']+)["`']/g)
    let tasks = []
    
    if (taskMatches && taskMatches.length > 0) {
      tasks = taskMatches.map(match => {
        const taskContent = match.match(/task:\s*["`']([^"`']+)["`']/)[1]
        return taskContent.trim()
      })
      // Limit to maximum 5 tests to avoid long execution times
      const maxTests = 5
      if (tasks.length > maxTests) {
        console.log(`⚠️ Found ${tasks.length} tests, limiting to first ${maxTests} to avoid repetition`)
        tasks = tasks.slice(0, maxTests)
      }
      console.log(`✅ Extracted ${tasks.length} test tasks from script`)
    } else {
      console.log("⚠️ No tasks found in script, using fallback")
      tasks = [`Test the ${extensionName} extension by clicking the extension icon and verifying its functionality works correctly`]
    }
    
    // Use the first task as the primary test (or combine multiple tasks)
    let testTask
    if (tasks.length === 1) {
      testTask = tasks[0]
    } else if (tasks.length > 1) {
      // Combine multiple tasks into a sequence (limited to avoid repetition)
      testTask = tasks.join('. Then, ')
    } else {
      testTask = `Test the ${extensionName} extension functionality`
    }

    console.log("🎯 Test task:", testTask)

    // Execute BrowserUse task on the existing session
    const result = await hbClient.agents.browserUse.startAndWait({
      task: testTask,
      sessionId: sessionId,
      keepBrowserOpen: true, // Keep session open after test
    })

    console.log("✅ BrowserUse test completed:", result.data?.finalResult)

    // Wait a moment for logs to be captured
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Analyze extension logs to verify test results
    console.log("📊 Analyzing extension logs for test verification...")
    const logAnalysis = analyzeLogsForTestVerification(sessionId, {
      checkExtensionErrors: true,
      checkRuntimeErrors: true,
      timeWindowMs: 10 * 60 * 1000, // Check logs from last 10 minutes
    })

    console.log("📊 Log analysis:", {
      hasErrors: logAnalysis.hasErrors,
      errorCount: logAnalysis.errorCount,
      warningCount: logAnalysis.warningCount,
      totalLogs: logAnalysis.totalLogs,
    })

    // Determine final success status based on both agent result and logs
    const agentSuccess = result.data?.finalResult && !result.data?.finalResult.toLowerCase().includes("failed")
    const logBasedFailure = logAnalysis.hasErrors ? formatErrorSummary(logAnalysis.errors) : null
    const finalSuccess = agentSuccess && !logAnalysis.hasErrors

    // Get session details to extract live URL
    let liveUrl = null
    try {
      const sessionDetails = await hbClient.sessions.get(sessionId)
      liveUrl =
        sessionDetails.liveViewUrl ||
        sessionDetails.liveUrl ||
        sessionDetails.debuggerUrl ||
        sessionDetails.debuggerFullscreenUrl ||
        null
      console.log("🖥️  Extracted live URL:", liveUrl ? "Found" : "Not found")
    } catch (liveUrlError) {
      console.warn("⚠️ Could not fetch live URL:", liveUrlError.message)
    }

    // Attempt to fetch video recording URL for this session
    console.log("🎥 [hyperagent-test] Fetching video recording URL...")
    let videoUrl = null
    let recordingStatus = "unknown"
    try {
      const maxAttempts = 30
      let attempts = 0

      while (attempts < maxAttempts) {
        const recordingResponse = await hbClient.sessions.getVideoRecordingURL(sessionId)
        recordingStatus = recordingResponse.status
        videoUrl = recordingResponse.recordingUrl

        console.log(
          `📹 [hyperagent-test] Recording status (attempt ${attempts + 1}/${maxAttempts}):`,
          recordingStatus
        )

        if (recordingStatus === "completed") {
          console.log("✅ [hyperagent-test] Video recording ready:", videoUrl)
          break
        } else if (recordingStatus === "failed") {
          console.error("❌ [hyperagent-test] Video recording failed:", recordingResponse.error)
          break
        } else if (recordingStatus === "not_enabled") {
          console.warn("⚠️ [hyperagent-test] Video recording not enabled for this session")
          break
        } else if (recordingStatus === "pending" || recordingStatus === "in_progress") {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          attempts++
        } else {
          console.warn("⚠️ [hyperagent-test] Unknown recording status:", recordingStatus)
          break
        }
      }
    } catch (recordingError) {
      console.error("❌ [hyperagent-test] Failed to fetch video recording URL:", recordingError)
      recordingStatus = "error"
    }

    // Save testing replay to session_replays table
    try {
      const { error: replayError } = await supabase.from("session_replays").insert({
        project_id: projectId,
        session_id: sessionId,
        live_url: liveUrl,
        video_url: videoUrl,
        recording_status: recordingStatus,
        test_type: "hyperagent",
        test_result: {
          success: finalSuccess,
          message: finalSuccess
            ? "BrowserUse test completed successfully"
            : logBasedFailure
            ? `Test completed but extension logs show errors: ${logBasedFailure}`
            : "BrowserUse test completed with issues",
          result: result.data?.finalResult || "Test completed",
          task: testTask,
          logAnalysis: {
            hasErrors: logAnalysis.hasErrors,
            errorCount: logAnalysis.errorCount,
            warningCount: logAnalysis.warningCount,
            totalLogs: logAnalysis.totalLogs,
            logBasedFailure: logBasedFailure,
          },
        },
      })

      if (replayError) {
        console.error("⚠️ Failed to save testing replay to database:", replayError)
        // Continue anyway - don't fail the request
      } else {
        console.log("✅ Testing replay saved to database")
      }
    } catch (replayError) {
      console.error("⚠️ Error saving testing replay:", replayError)
      // Continue anyway - don't fail the request
    }

    // Return the test results
    return NextResponse.json({
      success: finalSuccess,
      message: finalSuccess
        ? "BrowserUse test completed successfully"
        : logBasedFailure
        ? `Test completed but extension logs show errors: ${logBasedFailure}`
        : "BrowserUse test completed with issues",
      result: result.data?.finalResult || "Test completed",
      task: testTask,
      sessionId: sessionId,
      logAnalysis: {
        hasErrors: logAnalysis.hasErrors,
        errorCount: logAnalysis.errorCount,
        warningCount: logAnalysis.warningCount,
        totalLogs: logAnalysis.totalLogs,
        logBasedFailure: logBasedFailure,
      },
      videoUrl,
      recordingStatus,
    })

  } catch (error) {
    console.error("❌ BrowserUse test execution failed:", error)
    
    // Return a user-friendly error
    return NextResponse.json({
      success: false,
      error: error.message || "BrowserUse test execution failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}
