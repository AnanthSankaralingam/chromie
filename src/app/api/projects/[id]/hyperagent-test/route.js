import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Hyperbrowser } from "@hyperbrowser/sdk"

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
      // Combine multiple tasks into a sequence
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

    // Return the test results
    return NextResponse.json({
      success: true,
      message: "BrowserUse test completed successfully",
      result: result.data?.finalResult || "Test completed",
      task: testTask,
      sessionId: sessionId,
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
