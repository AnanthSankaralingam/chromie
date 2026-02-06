import { NextResponse } from "next/server"
import vm from "vm"
import { createClient } from "@/lib/supabase/server"
import { getPuppeteerSessionContext } from "@/lib/utils/browser-actions"
import { analyzeLogsForTestVerification, formatErrorSummary } from "@/lib/utils/test-log-verification"
import { Hyperbrowser } from "@hyperbrowser/sdk"

export const runtime = "nodejs"

function createExpect() {
  return function expect(received) {
    return {
      toBe(expected) {
        if (received !== expected) throw new Error(`Expected ${JSON.stringify(received)} to be ${JSON.stringify(expected)}`)
      },
      toBeTruthy() {
        if (!received) throw new Error(`Expected ${JSON.stringify(received)} to be truthy`)
      },
      toContain(substr) {
        if (typeof received !== "string") throw new Error(`toContain expects a string, got ${typeof received}`)
        if (!received.includes(substr)) throw new Error(`Expected string to contain ${JSON.stringify(substr)}`)
      },
      toBeGreaterThan(n) {
        if (!(received > n)) throw new Error(`Expected ${JSON.stringify(received)} to be > ${JSON.stringify(n)}`)
      },
    }
  }
}

async function getStoredChromeExtensionId({ supabase, projectId }) {
  try {
    const { data: extensionIdFile } = await supabase
      .from("code_files")
      .select("content")
      .eq("project_id", projectId)
      .eq("file_path", ".chromie/extension-id.json")
      .single()

    if (!extensionIdFile?.content) return null
    const parsed = JSON.parse(extensionIdFile.content)
    return parsed?.chromeExtensionId || null
  } catch (e) {
    console.warn("[puppeteer-tests/run] ⚠️  Could not read stored extension id:", e?.message || e)
    return null
  }
}

function injectStoredExtensionIdIntoTestCode(code, chromeExtensionId) {
  if (!chromeExtensionId || !code || typeof code !== "string") return code

  let next = code

  // Best-effort: replace the generated variable if present
  next = next.replace(
    /var\s+STORED_CHROME_EXTENSION_ID\s*=\s*[^;]*;/,
    `var STORED_CHROME_EXTENSION_ID = ${JSON.stringify(chromeExtensionId)};`
  )

  return next
}

async function runChromieTestFile({ code, sessionId, apiKey }) {
  const tests = []
  let beforeEachFn = null
  let afterEachFn = null
  let cachedContext = null

  const context = {
    console,
    setTimeout,
    clearTimeout,
    beforeEach(fn) {
      beforeEachFn = fn
    },
    afterEach(fn) {
      afterEachFn = fn
    },
    test(name, fn) {
      tests.push({ name, fn })
    },
    expect: createExpect(),
    // Provided to generated test file
    async getPuppeteerSessionContext() {
      // Hyperbrowser CDP endpoints can be fragile if we repeatedly connect/disconnect.
      // Reuse a single connection per run for stability.
      if (cachedContext) return cachedContext
      cachedContext = await getPuppeteerSessionContext(sessionId, apiKey)
      return cachedContext
    },
  }

  const contextified = vm.createContext(context)
  try {
    const script = new vm.Script(code, { 
      filename: 'index.test.js',
      displayErrors: true 
    })
    script.runInContext(contextified, { timeout: 5000 })
  } catch (e) {
    console.error("[puppeteer-tests/run] ❌ Test file failed to load/compile:", e?.message || e)
    const previewLines = String(code || "")
      .split("\n")
      .slice(0, 80)
      .map((line, idx) => `${String(idx + 1).padStart(3, " ")} | ${line}`)
      .join("\n")
    return {
      passed: false,
      results: [
        {
          name: "compile",
          status: "failed",
          durationMs: 0,
          error: e?.message || String(e),
          stack: e?.stack,
          preview: previewLines,
        },
      ],
    }
  }

  const results = []
  for (const t of tests) {
    const startedAt = Date.now()
    try {
      if (beforeEachFn) await beforeEachFn()
      await t.fn()
      if (afterEachFn) await afterEachFn()
      results.push({ name: t.name, status: "passed", durationMs: Date.now() - startedAt })
    } catch (e) {
      try {
        if (afterEachFn) await afterEachFn()
      } catch (_) {
        // ignore cleanup failures
      }
      console.error("[puppeteer-tests/run] ❌ Test failed:", { name: t.name, error: e?.message || String(e) })
      results.push({
        name: t.name,
        status: "failed",
        durationMs: Date.now() - startedAt,
        error: e?.message || String(e),
      })
    }
  }

  // Final cleanup for the shared connection.
  // We avoid calling browser.disconnect() here because it can disrupt the
  // embedded live view in the "Try it out" simulated browser environment.
  // The session will be cleaned up when the user closes the modal or it expires.
  /*
  try {
    await cachedContext?.browser?.disconnect?.()
  } catch (_) {
    // ignore
  }
  */

  const passed = results.every((r) => r.status === "passed")
  return { passed, results }
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
    const apiKey = process.env.HYPERBROWSER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Hyperbrowser not configured. Missing API key." }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const sessionId = body?.sessionId

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

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

    const { data: testFile, error: testFileError } = await supabase
      .from("code_files")
      .select("content")
      .eq("project_id", projectId)
      .eq("file_path", "tests/puppeteer/index.test.js")
      .single()

    if (testFileError || !testFile?.content) {
      return NextResponse.json(
        { error: "Puppeteer test file not found. Generate it first (tests/puppeteer/index.test.js)." },
        { status: 404 }
      )
    }

    console.log("[puppeteer-tests/run] 🧪 Running puppeteer tests", { projectId, sessionId })

    const storedChromeExtensionId = await getStoredChromeExtensionId({ supabase, projectId })
    if (storedChromeExtensionId) {
      console.log("[puppeteer-tests/run] ✅ Using stored Chrome extension ID:", storedChromeExtensionId)
    } else {
      console.warn("[puppeteer-tests/run] ⚠️  No stored Chrome extension ID found for project (will run with extensionId undefined)")
    }

    const code = injectStoredExtensionIdIntoTestCode(testFile.content, storedChromeExtensionId)

    const run = await runChromieTestFile({
      code,
      sessionId,
      apiKey,
    })

    // Wait a moment for logs to be captured
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Analyze extension logs to verify test results
    console.log("[puppeteer-tests/run] 📊 Analyzing extension logs for test verification...")
    const logAnalysis = analyzeLogsForTestVerification(sessionId, {
      checkExtensionErrors: true,
      checkRuntimeErrors: true,
      timeWindowMs: 10 * 60 * 1000, // Check logs from last 10 minutes
    })

    console.log("[puppeteer-tests/run] 📊 Log analysis:", {
      hasErrors: logAnalysis.hasErrors,
      errorCount: logAnalysis.errorCount,
      warningCount: logAnalysis.warningCount,
      totalLogs: logAnalysis.totalLogs,
    })

    // If logs show errors, mark tests as failed even if they didn't throw
    let finalPassed = run.passed
    let logBasedFailure = null

    if (logAnalysis.hasErrors) {
      console.log("[puppeteer-tests/run] ⚠️  Extension logs contain errors, marking tests as failed")
      finalPassed = false
      logBasedFailure = formatErrorSummary(logAnalysis.errors)

      // Add a synthetic test result for log-based failures if all tests passed but logs show errors
      if (run.passed && run.results.length > 0) {
        // Check if we should add a log-based failure result
        const hasLogFailureResult = run.results.some(
          (r) => r.name && r.name.toLowerCase().includes("log")
        )

        if (!hasLogFailureResult) {
          run.results.push({
            name: "extension logs verification",
            status: "failed",
            durationMs: 0,
            error: logBasedFailure,
            logBased: true,
          })
        }
      }
    }

    // Get session details to extract live URL and attempt to fetch video recording
    let liveUrl = null
    let videoUrl = null
    let recordingStatus = "unknown"
    try {
      const hbClient = new Hyperbrowser({ apiKey })
      const sessionDetails = await hbClient.sessions.get(sessionId)
      liveUrl =
        sessionDetails.liveViewUrl ||
        sessionDetails.liveUrl ||
        sessionDetails.debuggerUrl ||
        sessionDetails.debuggerFullscreenUrl ||
        null
      console.log("[puppeteer-tests/run] 🖥️  Extracted live URL:", liveUrl ? "Found" : "Not found")

      console.log("[puppeteer-tests/run] 🎥 Fetching video recording URL...")
      const maxAttempts = 30
      let attempts = 0

      while (attempts < maxAttempts) {
        const recordingResponse = await hbClient.sessions.getVideoRecordingURL(sessionId)
        recordingStatus = recordingResponse.status
        videoUrl = recordingResponse.recordingUrl

        console.log(
          `[puppeteer-tests/run] 📹 Recording status (attempt ${attempts + 1}/${maxAttempts}):`,
          recordingStatus
        )

        if (recordingStatus === "completed") {
          console.log("[puppeteer-tests/run] ✅ Video recording ready:", videoUrl)
          break
        } else if (recordingStatus === "failed") {
          console.error("[puppeteer-tests/run] ❌ Video recording failed:", recordingResponse.error)
          break
        } else if (recordingStatus === "not_enabled") {
          console.warn("[puppeteer-tests/run] ⚠️ Video recording not enabled for this session")
          break
        } else if (recordingStatus === "pending" || recordingStatus === "in_progress") {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          attempts++
        } else {
          console.warn("[puppeteer-tests/run] ⚠️ Unknown recording status:", recordingStatus)
          break
        }
      }
    } catch (liveUrlError) {
      console.warn("[puppeteer-tests/run] ⚠️ Could not fetch live URL or recording:", liveUrlError.message)
      recordingStatus = recordingStatus === "unknown" ? "error" : recordingStatus
    }

    // Save testing replay to session_replays table
    try {
      const { error: replayError } = await supabase.from("session_replays").insert({
        project_id: projectId,
        session_id: sessionId,
        live_url: liveUrl,
        video_url: videoUrl,
        recording_status: recordingStatus,
        test_type: "puppeteer",
        test_result: {
          success: finalPassed,
          results: run.results,
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
        console.error("[puppeteer-tests/run] ⚠️ Failed to save testing replay to database:", replayError)
        // Continue anyway - don't fail the request
      } else {
        console.log("[puppeteer-tests/run] ✅ Testing replay saved to database")
      }
    } catch (replayError) {
      console.error("[puppeteer-tests/run] ⚠️ Error saving testing replay:", replayError)
      // Continue anyway - don't fail the request
    }

    const response = {
      success: finalPassed,
      sessionId,
      filePath: "tests/puppeteer/index.test.js",
      results: run.results,
      logAnalysis: {
        hasErrors: logAnalysis.hasErrors,
        errorCount: logAnalysis.errorCount,
        warningCount: logAnalysis.warningCount,
        totalLogs: logAnalysis.totalLogs,
        logBasedFailure: logBasedFailure,
      },
    }

    console.log("[puppeteer-tests/run] ✅ Completed", {
      projectId,
      sessionId,
      passed: finalPassed,
      testPassed: run.passed,
      logBasedFailure: logBasedFailure !== null,
    })
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("[puppeteer-tests/run] ❌ Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}

