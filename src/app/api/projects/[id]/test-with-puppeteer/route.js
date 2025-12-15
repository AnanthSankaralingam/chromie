import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Hyperbrowser } from "@hyperbrowser/sdk"
import { hyperbrowserService } from "@/lib/hyperbrowser-service"
import { getPuppeteerSessionContext } from "@/lib/utils/browser-actions"

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
    console.log("🎬 Starting Puppeteer test with session recording for project:", projectId)

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, description")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Get the Puppeteer test script from the project files
    const { data: puppeteerFile, error: fileError } = await supabase
      .from("code_files")
      .select("content")
      .eq("project_id", projectId)
      .eq("file_path", "puppeteer_test_script.js")
      .single()

    if (fileError || !puppeteerFile) {
      return NextResponse.json({ 
        error: "Puppeteer test script not found. Please create testing commands first by clicking 'Create Testing Commands' button." 
      }, { status: 404 })
    }

    // Get all extension files for uploading
    const { data: extensionFiles, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", projectId)
      .neq("file_path", "puppeteer_test_script.js") // Exclude the test script itself

    if (filesError || !extensionFiles || extensionFiles.length === 0) {
      return NextResponse.json({ 
        error: "No extension files found. Please generate the extension first." 
      }, { status: 404 })
    }

    console.log(`📦 Found ${extensionFiles.length} extension files`)

    // Initialize HyperBrowser client
    const hbClient = new Hyperbrowser({
      apiKey: process.env.HYPERBROWSER_API_KEY,
    })

    if (!process.env.HYPERBROWSER_API_KEY) {
      return NextResponse.json({ 
        error: "HyperBrowser not configured. Missing API key." 
      }, { status: 500 })
    }

    // Upload extension and get extension ID
    console.log("📤 Uploading extension to Hyperbrowser...")
    const extensionId = await hyperbrowserService.uploadExtensionFromFiles(extensionFiles)
    console.log("✅ Extension uploaded, ID:", extensionId)

    // Create a new session with recording enabled
    console.log("🎬 Creating Hyperbrowser session with recording enabled...")
    const session = await hbClient.sessions.create({
      viewport: { width: 1920, height: 1080 },
      blockAds: false,
      timeoutMinutes: 10,
      enableWindowManager: true,
      extensionIds: extensionId ? [extensionId] : [],
      enableWebRecording: true, // Enable rrweb recording (required for video)
      enableVideoWebRecording: true, // Enable MP4 video recording
    })

    console.log("✅ Session created with ID:", session.id)
    console.log("⏳ Waiting for session to be ready...")
    
    // Wait for session to be fully ready
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Execute Puppeteer script
    console.log("🤖 Executing Puppeteer test script...")
    let testResult = null
    let testError = null

    try {
      // 1. Get the raw script logic (no imports/exports)
      let scriptLogic = puppeteerFile.content
      
      // Clean up any markdown code blocks if present
      scriptLogic = scriptLogic.replace(/```javascript/g, '').replace(/```/g, '').trim()
      
      // Remove any remaining import/export statements (legacy cleanup)
      scriptLogic = scriptLogic.replace(
        /import\s+\{([^}]+)\}\s+from\s+["'][^"']+["'];?\s*/g,
        ''
      )
      scriptLogic = scriptLogic.replace(
        /export\s+(const|function|{)\s*\w+/g,
        ''
      )
      scriptLogic = scriptLogic.replace(
        /export\s*{\s*\w+\s*};?\s*/g,
        ''
      )
      
      // Remove import.meta references
      scriptLogic = scriptLogic.replace(
        /if\s*\(\s*import\.meta\.url\s*===[\s\S]*?\)\s*\{[\s\S]*?\}\s*/g,
        ''
      )
      scriptLogic = scriptLogic.split('\n')
        .filter(line => !line.includes('import.meta'))
        .join('\n')
      
      scriptLogic = scriptLogic.trim()
      
      // Validate script content
      if (!scriptLogic || scriptLogic.trim().length === 0) {
        throw new Error("Script content is empty after cleaning")
      }
      
      console.log("📝 Script preview (first 500 chars):", scriptLogic.substring(0, 500))
      
      // 2. Connect to browser manually in the backend
      const apiKey = process.env.HYPERBROWSER_API_KEY
      if (!apiKey) {
        throw new Error("Missing HYPERBROWSER_API_KEY")
      }
      
      console.log("🔌 Connecting to browser session...")
      const { browser, page } = await getPuppeteerSessionContext(session.id, apiKey)
      console.log("✅ Connected to browser")
      
      // 3. Wrap the logic in an async function and execute it
      // We pass 'browser' and 'page' as arguments to this dynamic function
      const runTestDynamic = new Function('browser', 'page', 'console', `
        return (async () => {
          try {
            const result = await (async () => {
              ${scriptLogic}
            })();
            // If script returns a value, use it; otherwise return success
            if (result !== undefined) {
              return result;
            }
            return { success: true, message: "Test passed" };
          } catch (err) {
            return { success: false, error: err.message };
          }
        })();
      `)
      
      console.log("🧪 Executing dynamic test script...")
      
      // 4. Run it
      testResult = await runTestDynamic(browser, page, console)
      console.log("✅ Puppeteer test completed:", testResult)

    } catch (execError) {
      console.error("❌ Puppeteer script execution failed:", execError)
      testError = execError.message || String(execError)
      if (execError.stack) {
        console.error("Stack trace:", execError.stack)
      }
    }

    // Get the video recording URL with polling
    console.log("🎥 Fetching video recording URL...")
    let videoUrl = null
    let recordingStatus = 'unknown'
    
    try {
      // Poll for video recording completion (max 30 seconds)
      const maxAttempts = 30
      let attempts = 0
      
      while (attempts < maxAttempts) {
        const recordingResponse = await hbClient.sessions.getVideoRecordingURL(session.id)
        recordingStatus = recordingResponse.status
        videoUrl = recordingResponse.recordingUrl
        
        console.log(`📹 Recording status (attempt ${attempts + 1}/${maxAttempts}):`, recordingStatus)
        
        if (recordingStatus === 'completed') {
          console.log("✅ Video recording ready:", videoUrl)
          break
        } else if (recordingStatus === 'failed') {
          console.error("❌ Video recording failed:", recordingResponse.error)
          break
        } else if (recordingStatus === 'not_enabled') {
          console.error("❌ Video recording was not enabled for this session")
          break
        } else if (recordingStatus === 'pending' || recordingStatus === 'in_progress') {
          console.log("⏳ Recording still processing, waiting 1 second...")
          await new Promise(resolve => setTimeout(resolve, 1000))
          attempts++
        } else {
          console.warn("⚠️ Unknown recording status:", recordingStatus)
          break
        }
      }
      
      if (attempts >= maxAttempts && recordingStatus !== 'completed') {
        console.warn("⚠️ Video recording polling timed out after 30 seconds")
      }
    } catch (recordingError) {
      console.error("❌ Failed to fetch video recording URL:", recordingError)
      recordingStatus = 'error'
    }

    // Prepare test results data
    const testResults = {
      success: testError ? false : (testResult?.success !== false),
      message: testError 
        ? `Puppeteer test failed: ${testError}` 
        : (testResult?.message || "Puppeteer test completed successfully"),
      result: testError 
        ? testError 
        : (testResult?.message || testResult?.error || "Test completed"),
      task: `Execute Puppeteer test script for ${project.name}`,
      sessionId: session.id,
      videoUrl: videoUrl,
      recordingStatus: recordingStatus,
      note: videoUrl ? "Video recording is ready for playback" : "Video recording may still be processing. Try checking again in a few moments."
    }

    // Save test results to database (stored in projects table)
    try {
      const { error: saveError } = await supabase
        .from("projects")
        .update({
          ai_test_message: testResults.message,
          ai_test_result: testResults.result,
          ai_test_task: testResults.task,
          ai_test_session_id: testResults.sessionId,
          ai_test_video_url: testResults.videoUrl,
          ai_test_recording_status: testResults.recordingStatus,
          ai_test_note: testResults.note,
          ai_test_updated_at: new Date().toISOString()
        })
        .eq("id", projectId)
        .eq("user_id", user.id)

      if (saveError) {
        console.error("⚠️ Failed to save test results to database:", saveError)
        // Continue anyway - don't fail the request
      } else {
        console.log("✅ Test results saved to database")
      }
    } catch (saveError) {
      console.error("⚠️ Error saving test results:", saveError)
      // Continue anyway - don't fail the request
    }

    // Return the test results with video URL
    return NextResponse.json(testResults)

  } catch (error) {
    console.error("❌ Puppeteer test execution failed:", error)
    
    // Return a user-friendly error
    return NextResponse.json({
      success: false,
      error: error.message || "Puppeteer test execution failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}
