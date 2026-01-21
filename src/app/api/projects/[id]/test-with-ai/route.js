import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Hyperbrowser } from "@hyperbrowser/sdk"
import { hyperbrowserService } from "@/lib/hyperbrowser-service"

export async function GET(request, { params }) {
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
    // Verify project ownership and fetch saved test results
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, ai_test_message, ai_test_result, ai_test_task, ai_test_session_id, ai_test_video_url, ai_test_recording_status, ai_test_note, ai_test_updated_at")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Check if test results exist
    if (!project.ai_test_video_url && !project.ai_test_result) {
      return NextResponse.json({ exists: false }, { status: 200 })
    }

    // Return the saved test results in the same format as POST
    return NextResponse.json({
      exists: true,
      success: true,
      message: project.ai_test_message,
      result: project.ai_test_result,
      task: project.ai_test_task,
      sessionId: project.ai_test_session_id,
      videoUrl: project.ai_test_video_url,
      recordingStatus: project.ai_test_recording_status,
      note: project.ai_test_note,
      updatedAt: project.ai_test_updated_at
    })

  } catch (error) {
    console.error("❌ Error fetching test results:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
    console.log("🎬 Starting AI test with session recording for project:", projectId)

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

    // Get the HyperAgent test script from the project files
    const { data: hyperAgentFile, error: fileError } = await supabase
      .from("code_files")
      .select("content")
      .eq("project_id", projectId)
      .eq("file_path", "tests/hyperagent_test_script.js")
      .single()

    if (fileError || !hyperAgentFile) {
      return NextResponse.json({ 
        error: "BrowserUse test script not found. Please create an AI testing agent first by clicking 'Create AI Testing Agent' button." 
      }, { status: 404 })
    }

    // Get all extension files for uploading
    const { data: extensionFiles, error: filesError } = await supabase
      .from("code_files")
      .select("file_path, content")
      .eq("project_id", projectId)
      .not("file_path", "like", "tests/%") // Exclude tests folder

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

    // Extract test tasks from the HyperAgent script
    const testScript = hyperAgentFile.content
    
    console.log("📄 Parsing HyperAgent test script...")
    console.log("📄 Script preview (first 500 chars):", testScript.substring(0, 500))
    
    // Extract extension name from comments
    const nameMatch = testScript.match(/\/\/.*?test script for:?\s*(.+)/i)
    const extensionName = nameMatch ? nameMatch[1].trim() : project.name
    
    console.log(`📦 Extension name: ${extensionName}`)
    
    // Extract task strings from hyperAgent.startAndWait calls using a more robust regex
    // Handle both single and double quotes, and multiline strings
    const taskMatches = testScript.match(/task:\s*["`']([\s\S]*?)["`']/g)
    let tasks = []
    
    if (taskMatches && taskMatches.length > 0) {
      tasks = taskMatches.map(match => {
        const taskContent = match.match(/task:\s*["`']([\s\S]*?)["`']/)[1]
        return taskContent.trim()
      }).filter(task => task.length > 0 && !task.includes('undefined') && !task.includes('${'))
      
      console.log(`✅ Extracted ${tasks.length} test tasks from script`)
      tasks.forEach((task, i) => console.log(`   Task ${i + 1}: ${task.substring(0, 100)}...`))
    } else {
      console.log("⚠️ No tasks found in script, using fallback")
      tasks = []
    }
    
    // Create a comprehensive test task
    let testTask
    if (tasks.length === 0 || tasks.some(t => t.length < 10)) {
      // Fallback to a general test instruction
      console.log("⚠️ Using fallback test task (extracted tasks were empty or malformed)")
      testTask = `Test the ${extensionName} Chrome extension thoroughly: 
STEP 1: Navigate to chrome://extensions and find the extension named "${extensionName}". Click the pin icon or toggle to pin it to the browser toolbar. This is CRITICAL - the extension must be pinned before you can click it.
STEP 2: Navigate to https://example.com (a simple CAPTCHA-free test page)
STEP 3: Look for the pinned extension icon in the browser toolbar (top right area) and click it to activate the extension
STEP 4: Interact with any UI elements (buttons, inputs, menus) to verify they work correctly
STEP 5: If it's a side panel extension, verify the side panel opens and test its functionality
STEP 6: If it's a popup extension, interact with the popup UI and test its features
STEP 7: Check that all features work as expected and report any issues found
Note: Stay on simple websites without CAPTCHAs during testing`
    } else if (tasks.length === 1) {
      testTask = tasks[0]
    } else {
      // Combine multiple tasks into a sequence
      testTask = tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')
    }

    console.log("🎯 Final test task:", testTask)

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
      // Note: solveCaptchas requires a paid plan, removed for free tier compatibility
    })

    console.log("✅ Session created with ID:", session.id)
    console.log("⏳ Waiting for session to be ready...")
    
    // Wait for session to be fully ready
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Execute BrowserUse task on the new session
    console.log("🤖 Starting BrowserUse agent...")
    const result = await hbClient.agents.browserUse.startAndWait({
      task: testTask,
      sessionId: session.id,
      keepBrowserOpen: false, // Close session after test completes
    })

    console.log("✅ BrowserUse test completed:", result.data?.finalResult)

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
      success: true,
      message: "AI test completed successfully",
      result: result.data?.finalResult || "Test completed",
      task: testTask,
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
    console.error("❌ AI test execution failed:", error)
    
    // Return a user-friendly error
    return NextResponse.json({
      success: false,
      error: error.message || "AI test execution failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}

