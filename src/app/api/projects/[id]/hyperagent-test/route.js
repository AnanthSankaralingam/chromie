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
      .select("id")
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
      .eq("file_path", "hyperagent_test_script.js")
      .single()

    if (fileError || !hyperAgentFile) {
      return NextResponse.json({ 
        error: "HyperAgent test script not found. Please regenerate the extension to include the test script." 
      }, { status: 404 })
    }

    console.log("🤖 Executing HyperAgent test for project:", projectId)
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

    // Extract the test task from the HyperAgent script
    const testScript = hyperAgentFile.content
    
    // Parse a comprehensive test task from the script
    let testTask = "Test the Chrome extension functionality"
    let specificSteps = []
    
    // Extract extension name from comments
    const nameMatch = testScript.match(/\/\/ .*(?:automation script for testing|HyperAgent.*script.*for) (.+)/i)
    const extensionName = nameMatch ? nameMatch[1].trim() : "Chrome Extension"
    
    // Extract console.log statements that describe test steps
    const logMatches = testScript.match(/console\.log\(['"](.*?)['"]\)/g)
    if (logMatches) {
      specificSteps = logMatches.map(match => {
        const content = match.match(/console\.log\(['"](.*?)['"]\)/)[1]
        return content.replace(/Starting HyperAgent test for.*?;/, '').trim()
      }).filter(step => step && !step.includes('✅') && !step.includes('❌'))
    }
    
    // Extract navigation URLs from the script
    const urlMatches = testScript.match(/(?:goto|navigate.*?to|visit)\(['"`](https?:\/\/[^'"]+)['"`]\)/g)
    const testUrls = urlMatches ? urlMatches.map(match => 
      match.match(/['"`](https?:\/\/[^'"]+)['"`]/)[1]
    ) : []
    
    // Extract specific UI interactions from the script
    const interactionMatches = testScript.match(/(?:click|select|type|interact|verify|check|test).*?['"`]([^'"]+)['"`]/gi)
    const interactions = interactionMatches ? interactionMatches.map(match => 
      match.replace(/['"`]/g, '').trim()
    ).slice(0, 3) : [] // Limit to first 3 interactions
    
    // Build a comprehensive test task description
    if (testUrls.length > 0 || interactions.length > 0 || specificSteps.length > 0) {
      let taskParts = [`Test the ${extensionName} functionality`]
      
      if (testUrls.length > 0) {
        taskParts.push(`Navigate to ${testUrls[0]}`)
      }
      
      if (interactions.length > 0) {
        taskParts.push(`Interact with the extension: ${interactions.join(', ')}`)
      }
      
      if (specificSteps.length > 0) {
        taskParts.push(`Verify: ${specificSteps.slice(0, 2).join(', ')}`)
      }
      
      testTask = taskParts.join('. ')
    } else {
      testTask = `Test the ${extensionName} by clicking the extension icon and verifying its functionality works correctly`
    }

    console.log("🎯 Test task:", testTask)

    // Execute HyperAgent task on the existing session
    const result = await hbClient.agents.hyperAgent.startAndWait({
      task: testTask,
      sessionId: sessionId,
      keepBrowserOpen: true, // Keep session open after test
      maxSteps: 10, // Limit steps for testing
    })

    console.log("✅ HyperAgent test completed:", result.data?.finalResult)

    // Return the test results
    return NextResponse.json({
      success: true,
      message: "HyperAgent test completed successfully",
      result: result.data?.finalResult || "Test completed",
      task: testTask,
      sessionId: sessionId,
    })

  } catch (error) {
    console.error("❌ HyperAgent test execution failed:", error)
    
    // Return a user-friendly error
    return NextResponse.json({
      success: false,
      error: error.message || "HyperAgent test execution failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}
