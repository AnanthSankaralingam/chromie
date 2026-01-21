import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

/**
 * GET endpoint to check which test files exist for a project
 * Returns an object indicating which tests are present
 */
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
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check for both test files
    const testFilePaths = [
      "tests/puppeteer/index.test.js",
      "tests/hyperagent_test_script.js"
    ]

    const { data: testFiles, error: filesError } = await supabase
      .from("code_files")
      .select("file_path")
      .eq("project_id", projectId)
      .in("file_path", testFilePaths)

    if (filesError) {
      console.error("[tests/check] Error checking test files:", filesError)
      return NextResponse.json({ error: "Failed to check test files" }, { status: 500 })
    }

    // Build response object
    const existingPaths = new Set((testFiles || []).map(f => f.file_path))
    
    const testsExist = {
      puppeteer: existingPaths.has("tests/puppeteer/index.test.js"),
      aiAgent: existingPaths.has("tests/hyperagent_test_script.js")
    }

    console.log("[tests/check] ✅ Test status for project", projectId, testsExist)

    return NextResponse.json({
      success: true,
      projectId,
      tests: testsExist
    })
  } catch (error) {
    console.error("[tests/check] ❌ Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
