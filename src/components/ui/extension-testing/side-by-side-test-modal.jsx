"use client"

import React, { useState, useEffect, useRef } from "react"
import { X, RefreshCw, ExternalLink, AlertCircle, Monitor, Navigation, Info, Eye, CircleDot, Square, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import SessionTimer from "@/components/ui/timer/session-timer"
import BrowserTestingTutorial from "./browser-testing-tutorial"
import ProgressSpinner from "@/components/ui/loading/progress-spinner"
import TestingSidepanel from "@/components/ui/extension-testing/testing-sidepanel"
import ErrorDisplay from "./error-display"

export default function SideBySideTestModal({
  isOpen,
  onClose,
  sessionData,
  createOptions = null,
  onRefresh,
  isLoading = false,
  loadingProgress = 0,
  projectId,
  extensionFiles = [],
  onGeneratePuppeteerTests,
  onGenerateAiAgentTests,
  onSessionLogsCapture,
  onSolveErrorInChat,
}) {
  const [sessionStatus, setSessionStatus] = useState("loading")
  const [isRunningHyperAgent, setIsRunningHyperAgent] = useState(false)
  const [hyperAgentResult, setHyperAgentResult] = useState(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [loadingStage, setLoadingStage] = useState(0)
  const [isRunningPuppeteerTests, setIsRunningPuppeteerTests] = useState(false)
  const [puppeteerTestResult, setPuppeteerTestResult] = useState(null)
  const [iframeReconnectNonce, setIframeReconnectNonce] = useState(0)
  const hasAutoKickedRef = useRef(false)
  const hasAutoRunPuppeteerRef = useRef(false)
  const autoRefreshAttemptedRef = useRef(false)
  const lastSequenceIdRef = useRef(null)
  const puppeteerAbortControllerRef = useRef(null)
  const aiAgentAbortControllerRef = useRef(null)
  const [clearLogsTrigger, setClearLogsTrigger] = useState(0)

  const hasBasicTests = extensionFiles.some(
    (f) => (f.file_path || f.fullPath) === "tests/puppeteer/index.test.js"
  )
  const hasAiAgentTests = extensionFiles.some(
    (f) => (f.file_path || f.fullPath) === "tests/hyperagent_test_script.js"
  )

  const [isRecordingDemo, setIsRecordingDemo] = useState(false)
  const [demoStatus, setDemoStatus] = useState("idle") // idle | recording | saved | error
  const [demoVideoUrl, setDemoVideoUrl] = useState(null)
  const [demoRecordingStatus, setDemoRecordingStatus] = useState(null)
  const [demoError, setDemoError] = useState(null)
  const [isDemoShareOpen, setIsDemoShareOpen] = useState(false)
  const [isViewingDemo, setIsViewingDemo] = useState(false)
  const [isResolvingDemoVideo, setIsResolvingDemoVideo] = useState(false)
  const demoStartOffsetRef = useRef(null)

  // Reset expired state when a new session opens or modal re-opens with a fresh session
  useEffect(() => {
    if (isOpen && sessionData?.sessionId) {
      setSessionExpired(false)
      autoRefreshAttemptedRef.current = false
      setIsRecordingDemo(false)
      setDemoStatus("idle")
      setDemoVideoUrl(null)
      setDemoRecordingStatus(null)
      setDemoError(null)
      setIsDemoShareOpen(false)
      setIsViewingDemo(false)
      setIsResolvingDemoVideo(false)
      demoStartOffsetRef.current = null

      const seqId = sessionData?.sequenceId || null
      const isNewSequence = seqId && seqId !== lastSequenceIdRef.current
      const hasSequence = !!seqId

      // For normal sessions (no sequenceId), always reset results/flags.
      // For Execute Testing Agent, only reset when the sequenceId changes.
      if (!hasSequence || isNewSequence) {
        setPuppeteerTestResult(null)
        setHyperAgentResult(null)
        hasAutoKickedRef.current = false
        hasAutoRunPuppeteerRef.current = false
      } else {
        // Same sequence across a refresh: preserve results and prevent re-running Puppeteer.
        if (puppeteerTestResult) {
          hasAutoRunPuppeteerRef.current = true
        }
      }

      lastSequenceIdRef.current = seqId
    }
  }, [isOpen, sessionData?.sessionId, sessionData?.sequenceId])

  const ACTIVE_SESSION_STATUSES = new Set(["active", "running", "ready"])
  const DEAD_SESSION_STATUSES = new Set(["stopped", "ended", "closed", "inactive", "failed"])

  const getSessionStatus = async () => {
    if (!projectId || !sessionData?.sessionId) return null
    try {
      const res = await fetch(
        `/api/projects/${projectId}/test-extension/status?sessionId=${encodeURIComponent(sessionData.sessionId)}`
      )
      const data = await res.json()
      if (!res.ok) {
        return { success: false, status: "unknown", error: data?.error || "Failed to get status" }
      }
      return data
    } catch (e) {
      return { success: false, status: "unknown", error: e?.message || String(e) }
    }
  }

  const waitForSessionActive = async ({ label, timeoutMs = 60000 } = {}) => {
    const startedAt = Date.now()
    let lastStatus = "unknown"

    while (Date.now() - startedAt < timeoutMs) {
      const statusResp = await getSessionStatus()
      const status = (statusResp?.status || "unknown").toString().toLowerCase()
      lastStatus = status

      if (ACTIVE_SESSION_STATUSES.has(status)) {
        return { ok: true, status }
      }

      // If the session looks dead, try a single auto-refresh (keeps the same options via useTestExtension).
      if (
        DEAD_SESSION_STATUSES.has(status) &&
        !autoRefreshAttemptedRef.current &&
        typeof onRefresh === "function"
      ) {
        autoRefreshAttemptedRef.current = true
        onRefresh()
        return { ok: false, refreshed: true, status }
      }

      await new Promise((r) => setTimeout(r, 1500))
    }

    return { ok: false, status: lastStatus, timedOut: true }
  }

  // Ensure loading transitions restart on each new load or session
  useEffect(() => {
    if (isLoading || sessionData?.sessionId) {
      setLoadingStage(0)
    }
  }, [isLoading, sessionData?.sessionId])

  // Define loading stages for browser initialization
  const loadingStages = [
    {
      title: "launching cloud browser",
      description: "spinning up a secure hyperbrowser session — this takes 15–30 seconds"
    },
    {
      title: "installing your extension",
      description: "bundling your extension files and injecting them into the browser"
    },
    {
      title: "opening live view",
      description: "connecting the interactive browser stream — almost ready"
    }
  ]

  // Define instruction boxes for each stage
  const instructionBoxes = [
    {
      icon: Monitor,
      iconColor: "blue",
      title: "what's happening",
      items: [
        "a real cloud browser is spinning up for you",
        "this is a full chromium instance, not a simulation",
        "your extension will be auto-installed — no manual steps",
        "hang tight, this usually takes under 30 seconds"
      ]
    },
    {
      icon: Navigation,
      iconColor: "green",
      title: "extension setup",
      items: [
        "your extension files are being bundled and injected",
        "all permissions are pre-configured from your manifest",
        "background scripts, popups, and content scripts are loaded",
        "no manual install or chrome://extensions needed"
      ]
    },
    {
      icon: Eye,
      iconColor: "purple",
      title: "once it loads",
      items: [
        "navigate to any site to test your extension in action",
        "click the puzzle icon in the toolbar to open the popup",
        "check the console log panel on the right for errors",
        "use the AI agent tab to run automated tests"
      ]
    }
  ]

  // Store session data for the embed page to access
  useEffect(() => {
    if (sessionData && sessionData.sessionId) {
      sessionStorage.setItem('session_' + sessionData.sessionId, JSON.stringify(sessionData))
    }
  }, [sessionData])

  // Animate through stages like the original ProgressSpinner
  useEffect(() => {
    if (!isLoading) {
      setLoadingStage(0)
      return
    }

    const interval = setInterval(() => {
      setLoadingStage(prev => {
        if (prev < loadingStages.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 2000) // Progress every 2 seconds

    return () => clearInterval(interval)
  }, [isLoading, loadingStages.length])

  // Handle HyperAgent test execution
  const clearConsoleLogs = async () => {
    if (!sessionData?.sessionId || !projectId) return
    // Clear UI immediately so user sees empty logs before tests start
    setClearLogsTrigger((prev) => prev + 1)
    try {
      await fetch(`/api/projects/${projectId}/test-extension/console-logs?sessionId=${sessionData.sessionId}`, {
        method: "DELETE",
      })
    } catch (e) {
    }
  }

  const handleRunHyperAgentTest = async () => {
    if (!sessionData?.sessionId || !projectId) {
      console.error("Missing session ID or project ID for HyperAgent test")
      return
    }

    await clearConsoleLogs()
    setIsRunningHyperAgent(true)
    setHyperAgentResult(null)

    // Create abort controller for this test run
    const abortController = new AbortController()
    aiAgentAbortControllerRef.current = abortController

    try {
      const waited = await waitForSessionActive({ label: "ai-agent" })
      if (!waited.ok) {
        // If we triggered a refresh, don't record this as a test failure.
        // The sequence will resume on the new session.
        if (waited.refreshed) return
        throw new Error("Session not active yet. Please wait a moment and try again.")
      }

      const response = await fetch(`/api/projects/${projectId}/hyperagent-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
        }),
        signal: abortController.signal,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "HyperAgent test failed")
      }

      setHyperAgentResult(result)
    } catch (error) {
      // Don't set error if it was aborted
      if (error.name === 'AbortError') {
        return
      }
      setHyperAgentResult({
        success: false,
        error: error.message,
      })
    } finally {
      setIsRunningHyperAgent(false)
      aiAgentAbortControllerRef.current = null
    }
  }

  // Stop AI Agent tests
  const handleStopAiAgentTests = async () => {
    if (!sessionData?.sessionId || !projectId) {
      console.error("[hyperagent-test] Missing session ID or project ID for stopping tests")
      return
    }

    // Abort the fetch request first
    if (aiAgentAbortControllerRef.current) {
      aiAgentAbortControllerRef.current.abort()
      aiAgentAbortControllerRef.current = null
    }

    setIsRunningHyperAgent(false)
    setHyperAgentResult({
      success: false,
      error: "Test stopped by user - terminating session...",
    })

    // Terminate the session to stop server-side test execution
    try {
      const response = await fetch(`/api/projects/${projectId}/test-extension`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          startedAt: sessionData.startedAt,
        }),
      })

      if (response.ok) {
        setHyperAgentResult({
          success: false,
          error: "Test stopped by user. Session terminated.",
        })
        // Mark session as expired so the UI reflects that the browser is closed
        setSessionExpired(true)
      } else {
        setHyperAgentResult({
          success: false,
          error: "Failed to stop test - session may still be running",
        })
      }
    } catch (error) {
      setHyperAgentResult({
        success: false,
        error: "Error stopping test",
      })
    }
  }

  // Auto-kickoff HyperAgent test after extension pinning completes (Kickoff AI analysis flow)
  // IMPORTANT: Must be declared before any early returns to keep hook order stable.
  useEffect(() => {
    if (!isOpen) return
    if (hasAutoKickedRef.current) return
    if (!sessionData?.autoRunHyperAgent) return
    if (!sessionData?.sessionId || !projectId) return
    if (isLoading || sessionExpired) return
    if (isRunningHyperAgent) return

    // If this session was started via "Execute Testing Agent", run AI after Puppeteer completes.
    if (sessionData?.runTestSequence === true) {
      if (!hasAutoRunPuppeteerRef.current) return
      if (isRunningPuppeteerTests) return
      if (!puppeteerTestResult) return
    }

    // If we requested awaitPinExtension, the server should return a pinExtension object.
    // Only auto-run once pin was confirmed (or at least reported as successful).
    const pin = sessionData?.pinExtension
    const pinConfirmed = pin?.success === true && (pin?.pinned || pin?.alreadyPinned || pin?.success)
    if (!pinConfirmed) return

    hasAutoKickedRef.current = true
    // Small delay to allow the live view to settle before agent starts interacting.
    setTimeout(() => {
      ;(async () => {
        const waited = await waitForSessionActive({ label: "ai-agent-auto" })
        if (!waited.ok) return
        handleRunHyperAgentTest()
      })()
    }, 750)
  }, [
    isOpen,
    isLoading,
    sessionExpired,
    sessionData?.autoRunHyperAgent,
    sessionData?.runTestSequence,
    sessionData?.pinExtension,
    sessionData?.sessionId,
    projectId,
    isRunningHyperAgent,
    isRunningPuppeteerTests,
    puppeteerTestResult,
  ])

  // Auto-run Puppeteer tests for the "Execute Testing Agent" flow.
  // IMPORTANT: Must be declared before any early returns to keep hook order stable.
  useEffect(() => {
    if (!isOpen) return
    if (hasAutoRunPuppeteerRef.current) return
    if (!sessionData?.autoRunPuppeteerTests) return
    if (!sessionData?.sessionId || !projectId) return
    if (isLoading || sessionExpired) return
    if (isRunningPuppeteerTests) return
    // If we're in a sequence and Puppeteer already ran (pass or fail), do not re-run it on refresh.
    if (sessionData?.runTestSequence === true && puppeteerTestResult) {
      hasAutoRunPuppeteerRef.current = true
      return
    }

    // If pin info exists, wait until pin was confirmed for stability (extension icon interactions).
    const pin = sessionData?.pinExtension
    const hasPinInfo = pin != null
    const pinConfirmed =
      !hasPinInfo || (pin?.success === true && (pin?.pinned || pin?.alreadyPinned || pin?.success))
    if (!pinConfirmed) return

    hasAutoRunPuppeteerRef.current = true
    setTimeout(() => {
      ;(async () => {
        const waited = await waitForSessionActive({ label: "puppeteer-auto" })
        if (!waited.ok) return
        handleRunPuppeteerTests()
      })()
    }, 500)
  }, [
    isOpen,
    isLoading,
    sessionExpired,
    sessionData?.autoRunPuppeteerTests,
    sessionData?.runTestSequence,
    sessionData?.pinExtension,
    sessionData?.sessionId,
    projectId,
    isRunningPuppeteerTests,
    puppeteerTestResult,
  ])

  // Prevent body scroll when modal is open (especially important on mobile)
  // IMPORTANT: Must be before early return to keep hook order stable.
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  if (!isOpen) return null

  const liveUrl = sessionData?.liveViewUrl || sessionData?.iframeUrl || sessionData?.browserUrl
  const error = sessionData?.error

  const buildIframeSrc = (rawUrl) => {
    if (!rawUrl) return rawUrl
    try {
      const u = new URL(rawUrl)
      // Bump this param to force the embedded viewer to reconnect after Puppeteer finishes.
      u.searchParams.set("chromieReconnect", String(iframeReconnectNonce))
      return u.toString()
    } catch (_) {
      // If the URL isn't parseable (shouldn't happen), fall back to adding a basic query param.
      const joiner = rawUrl.includes("?") ? "&" : "?"
      return `${rawUrl}${joiner}chromieReconnect=${encodeURIComponent(String(iframeReconnectNonce))}`
    }
  }

  const iframeSrc = buildIframeSrc(sessionData?.iframeUrl)



  // Handle session expiry - just show warning, don't auto-close
  const handleSessionExpire = () => {
    setSessionExpired(true)
    // Don't auto-close modal - let user manually close when ready
  }

  // Handle cleanup when modal is closed
  const handleClose = async () => {
    // Save unsaved demo replay before closing (e.g. when session time limit was hit before user could click "View Video")
    const hasUnsavedDemo =
      (demoStatus === "saved" || demoStatus === "recording") &&
      !demoVideoUrl &&
      sessionData?.sessionId &&
      projectId
    if (hasUnsavedDemo) {
      try {
        const response = await fetch(`/api/projects/${projectId}/testing-replays/demo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionData.sessionId }),
        })
        const data = await response.json()
        if (response.ok && data?.success) {
          console.log("[side-by-side-test] ✅ Saved demo replay before close (session time limit)")
        } else {
          console.warn("[side-by-side-test] ⚠️ Failed to save demo replay before close:", data?.error)
        }
      } catch (err) {
        console.warn("[side-by-side-test] ⚠️ Error saving demo replay before close:", err?.message)
      }
    }

    // Capture logs before closing if session is active
    if (sessionData?.sessionId && projectId && onSessionLogsCapture) {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/test-extension/console-logs?sessionId=${encodeURIComponent(sessionData.sessionId)}`
        )

        if (response.ok) {
          const data = await response.json()
          if (data.logs && data.logs.length > 0) {
            onSessionLogsCapture(data.logs)
          }
        }
      } catch (error) {
      }
    }

    setIsViewingDemo(false)
    onClose()
  }

  const handleToggleDemoRecording = async () => {
    const canRecordDemo = !isLoading && !sessionExpired && !!sessionData?.sessionId
    if (!canRecordDemo) {
      return
    }

    // Start recording (client-side flag only; Hyperbrowser records entire session)
    if (!isRecordingDemo && (demoStatus === "idle" || demoStatus === "saved" || demoStatus === "error")) {

      // Capture offset from session start so we can auto-seek later.
      try {
        if (sessionData?.startedAt) {
          const sessionStartMs = new Date(sessionData.startedAt).getTime()
          const nowMs = Date.now()
          const offsetSeconds = Math.max(0, (nowMs - sessionStartMs) / 1000)
          demoStartOffsetRef.current = offsetSeconds
        } else {
          demoStartOffsetRef.current = null
        }
      } catch {
        demoStartOffsetRef.current = null
      }

      setIsRecordingDemo(true)
      setDemoStatus("recording")
      setDemoError(null)
      setIsDemoShareOpen(false)
      return
    }

    // Stop recording and mark demo as ready to save later
    if (isRecordingDemo && demoStatus === "recording") {
      setIsRecordingDemo(false)
      setDemoStatus("saved")
      setDemoError(null)
      setIsDemoShareOpen(false)
    }
  }

  const handleViewDemoVideo = async () => {
    setDemoError(null)

    // If we've already resolved a video URL, just switch to viewing.
    if (demoVideoUrl) {
      setIsViewingDemo(true)
      return
    }

    if (!projectId || !sessionData?.sessionId) {
      setDemoError("Missing session information for demo recording")
      setDemoStatus("error")
      return
    }

    try {
      setIsResolvingDemoVideo(true)

      const response = await fetch(`/api/projects/${projectId}/testing-replays/demo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
        }),
      })

      const data = await response.json()

      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || "Failed to fetch demo recording")
      }

      setDemoVideoUrl(data.videoUrl || null)
      setDemoRecordingStatus(data.recordingStatus || null)
      setDemoStatus("saved")

      if (data.sessionTerminated) {
        setSessionExpired(true)
      }

      setIsViewingDemo(true)
    } catch (err) {
      setDemoError(err?.message || "Failed to load demo recording")
      setDemoStatus("error")
    } finally {
      setIsResolvingDemoVideo(false)
    }
  }

  const handleRunPuppeteerTests = async () => {
    if (!sessionData?.sessionId || !projectId) {
      return
    }

    await clearConsoleLogs()
    setIsRunningPuppeteerTests(true)
    setPuppeteerTestResult(null)

    // Create abort controller for this test run
    const abortController = new AbortController()
    puppeteerAbortControllerRef.current = abortController

    try {
      const waited = await waitForSessionActive({ label: "puppeteer" })
      if (!waited.ok) {
        // If we triggered a refresh, don't record this as a test failure.
        // The sequence will resume on the new session.
        if (waited.refreshed) return
        throw new Error("Session not active yet. Please wait a moment and try again.")
      }

      const response = await fetch(`/api/projects/${projectId}/puppeteer-tests/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || "Puppeteer tests failed")
      }

      // Stream NDJSON: each line is a JSON object
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let streamedResults = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const msg = JSON.parse(line)
            if (msg.type === "test" && msg.result) {
              streamedResults = [...streamedResults, msg.result]
              setPuppeteerTestResult((prev) => ({
                ...prev,
                results: streamedResults,
                passed: streamedResults.every((r) => r.status === "passed"),
              }))
            } else if (msg.type === "done") {
              setPuppeteerTestResult({
                passed: msg.success,
                success: msg.success,
                sessionId: msg.sessionId,
                filePath: msg.filePath,
                results: msg.results,
                logAnalysis: msg.logAnalysis,
              })
            } else if (msg.type === "error") {
              throw new Error(msg.error || "Test run failed")
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }
    } catch (error) {
      // Don't set error if it was aborted
      if (error.name === 'AbortError') {
        return
      }
      setPuppeteerTestResult({
        success: false,
        error: error.message,
      })
    } finally {
      setIsRunningPuppeteerTests(false)
      puppeteerAbortControllerRef.current = null
      // The backend now keeps the CDP connection alive to prevent session disruption.
    }
  }

  // Stop Puppeteer tests
  const handleStopPuppeteerTests = async () => {
    if (!sessionData?.sessionId || !projectId) {
      console.error("[puppeteer-tests] Missing session ID or project ID for stopping tests")
      return
    }

    
    // Abort the fetch request first
    if (puppeteerAbortControllerRef.current) {
      puppeteerAbortControllerRef.current.abort()
      puppeteerAbortControllerRef.current = null
    }

    setIsRunningPuppeteerTests(false)
    setPuppeteerTestResult({
      success: false,
      error: "Test stopped by user - terminating session...",
    })

    // Terminate the session to stop server-side test execution
    try {
      const response = await fetch(`/api/projects/${projectId}/test-extension`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          startedAt: sessionData.startedAt,
        }),
      })

      if (response.ok) {
        setPuppeteerTestResult({
          success: false,
          error: "Test stopped by user. Session terminated.",
        })
        // Mark session as expired so the UI reflects that the browser is closed
        setSessionExpired(true)
      } else {
        setPuppeteerTestResult({
          success: false,
          error: "Failed to stop test - session may still be running",
        })
      }
    } catch (error) {
      setPuppeteerTestResult({
        success: false,
        error: "Error stopping test",
      })
    }
  }

  // Get viewport dimensions from sessionData, with fallbacks (used for desktop layout)
  const viewportWidth = sessionData?.browserInfo?.viewport?.width || 1920;
  const viewportHeight = sessionData?.browserInfo?.viewport?.height || 1080;

  // Estimate extra height for modal header and footer
  const modalExtraHeight = 56 + 50; // Total ~106px

  // Mobile: full viewport (handled by w-full h-full). Desktop: use session dimensions.
  const desktopWidth = Math.min(viewportWidth, 1920);
  const desktopHeight = Math.min(viewportHeight + modalExtraHeight, 1200);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div
        className="bg-white rounded-none md:rounded-lg shadow-xl flex flex-col overflow-hidden
          w-full h-full max-w-full max-h-full
          md:w-[var(--modal-width)] md:h-[var(--modal-height)] md:min-w-[320px] md:min-h-[200px] md:max-w-[95vw] md:max-h-[95vh]"
        style={{
          // CSS vars for desktop: use session dimensions, capped for safety
          "--modal-width": `${desktopWidth}px`,
          "--modal-height": `${desktopHeight}px`,
        }}
      >
        {/* Header */}
        <div className="px-3 md:px-6 py-3 md:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
            <div className="flex items-center space-x-2 min-w-0">
              <ExternalLink
                className={cn(
                  "h-4 w-4 md:h-5 md:w-5 flex-shrink-0",
                  sessionData?.status === 'active' ? "text-green-600" : "text-gray-400"
                )}
              />
              <h2 className="text-sm md:text-lg font-semibold text-gray-900 truncate">extension test environment</h2>
            </div>

            {sessionData && (
              <div className="flex items-center space-x-2 text-xs md:text-sm text-gray-500 flex-shrink-0">
                <span>session: {sessionData.sessionId?.slice(-8)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
            {/* Session Timer */}
            {sessionData?.expiresAt && !sessionExpired && (
              <SessionTimer
                expiresAt={sessionData.expiresAt}
                onExpire={handleSessionExpire}
                warningThreshold={30}
              />
            )}

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={onRefresh} className="text-gray-600 hover:text-gray-900">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-600 hover:text-gray-900">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content - Browser (left/top) + Testing Sidepanel (right/bottom) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white min-h-0">
          {/* Left Column / Top on mobile */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 md:min-h-[200px]">
            {/* Browser Panel */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-[200px] md:min-h-0">
              <div className="px-3 md:px-4 py-2 bg-white border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 flex-shrink-0">
                <div className="flex items-center space-x-2 min-w-0">
                  <Monitor className="h-4 w-4 text-gray-600 flex-shrink-0" />
                  <span className="text-xs md:text-sm font-medium text-gray-700 truncate">
                    {isViewingDemo && demoVideoUrl ? "demo video recording" : "live browser session"}
                  </span>
                </div>
                {/* Demo recording controls (moved from top bar) */}
                <div className="flex items-center space-x-2 relative flex-wrap">
                  <Button
                    variant={isRecordingDemo ? "destructive" : "outline"}
                    size="sm"
                    onClick={handleToggleDemoRecording}
                    disabled={isLoading || sessionExpired || !sessionData?.sessionId || demoStatus === "processing"}
                    className={cn(
                      "flex items-center space-x-1 text-xs",
                      !isRecordingDemo && "border-red-200 text-red-600",
                      (isLoading || sessionExpired || !sessionData?.sessionId || demoStatus === "processing") &&
                        "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {isRecordingDemo ? (
                      <>
                        <Square className="h-3 w-3 fill-red-600 text-red-600" />
                        <span className="text-red-600">stop</span>
                      </>
                    ) : (
                      <>
                        <CircleDot className="h-3 w-3 text-red-600" />
                        <span className="text-red-600">record demo</span>
                      </>
                    )}
                  </Button>

                  {demoStatus === "saved" && (
                    isViewingDemo ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsViewingDemo(false)
                          setSessionExpired(false)
                          if (typeof onRefresh === "function") {
                            onRefresh()
                          }
                        }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        back to browser
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleViewDemoVideo}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        view video
                      </button>
                    )
                  )}

                  {demoStatus === "error" && demoError && (
                    <span className="text-xs text-red-500" title={demoError}>
                      demo failed
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 relative overflow-auto md:overflow-hidden">
                {isViewingDemo && demoVideoUrl ? (
                  <div className="absolute inset-0 bg-black flex items-center justify-center">
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      {demoVideoUrl.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) ? (
                        <video
                          src={demoVideoUrl}
                          controls
                          className="w-full h-full object-contain bg-black"
                          onLoadedMetadata={(e) => {
                            try {
                              const offset = demoStartOffsetRef.current
                              if (typeof offset === "number" && offset > 0 && e?.target) {
                                e.target.currentTime = Math.min(offset, e.target.duration || offset)
                              }
                            } catch {
                              // best-effort; ignore seek errors
                            }
                          }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <iframe
                          src={demoVideoUrl}
                          className="w-full h-full border-0 bg-black"
                          title="Demo Recording Video"
                          allow="autoplay; encrypted-media"
                          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        />
                      )}
                    </div>
                  </div>
                ) : sessionExpired ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-yellow-50">
                    <div className="text-center max-w-md">
                      <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">session time limit reached</h3>
                      <p className="text-gray-600 mb-4">
                        this session has reached its time limit, but you can continue using it. close the modal when you're done testing.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {(demoStatus === "saved" || demoStatus === "recording") && !demoVideoUrl && (
                          <Button
                            variant="outline"
                            onClick={handleViewDemoVideo}
                            disabled={isResolvingDemoVideo}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            {isResolvingDemoVideo ? "saving..." : "save & view recording"}
                          </Button>
                        )}
                        <Button
                          onClick={handleClose}
                          className="bg-gradient-to-r from-black to-gray-800 hover:from-gray-900 hover:to-black text-white"
                        >
                          close session
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="absolute inset-0 bg-[#0a0a0a] flex items-center justify-center p-8">
                    <div className="text-center max-w-md w-full">
                      {/* Progress Bar */}
                      <div className="mb-8">
                        <div className="w-full bg-neutral-800 rounded-full h-1.5 mb-3">
                          <div
                            className="bg-white h-1.5 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${((loadingStage + 1) / loadingStages.length) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-neutral-500">
                          step {loadingStage + 1} of {loadingStages.length}
                        </p>
                      </div>

                      {/* Current Stage */}
                      <div className="mb-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-700 border-t-white mx-auto mb-5" />
                        <h3 className="text-base font-semibold text-white mb-2">
                          {loadingStages[loadingStage]?.title ?? "initializing"}
                        </h3>
                        <p className="text-neutral-400 text-sm leading-relaxed">
                          {loadingStages[loadingStage]?.description ?? "please wait"}
                        </p>
                      </div>

                      {/* Dynamic tip box per stage */}
                      {instructionBoxes[loadingStage] && (
                        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 text-left">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-neutral-800 rounded-lg flex items-center justify-center flex-shrink-0">
                              {React.createElement(instructionBoxes[loadingStage].icon, {
                                className: "h-4 w-4 text-neutral-300",
                              })}
                            </div>
                            <h5 className="font-medium text-neutral-200 text-sm">{instructionBoxes[loadingStage].title}</h5>
                          </div>
                          <ul className="space-y-2">
                            {instructionBoxes[loadingStage].items.map((item, index) => (
                              <li key={index} className="text-sm text-neutral-400 flex items-start gap-2">
                                <span className="text-neutral-600 mt-0.5">—</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ) : error ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white">
                    <ErrorDisplay
                      error={error}
                      onRetry={onRefresh}
                      onSolveInChat={onSolveErrorInChat}
                      isLoading={isLoading}
                    />
                  </div>
                ) : sessionData?.iframeUrl ? (
                  <div
                    className="absolute inset-0 min-w-full min-h-full"
                    style={
                      viewportWidth < 1000
                        ? { minWidth: viewportWidth, minHeight: viewportHeight }
                        : undefined
                    }
                  >
                    <iframe
                      src={iframeSrc}
                      className="absolute inset-0 w-full h-full border-0"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
                      allow="clipboard-read; clipboard-write; autoplay; fullscreen; camera; microphone"
                      loading="eager"
                      title="testing session"
                      style={{
                        transform: "translateZ(0)",
                        willChange: "transform",
                        backfaceVisibility: "hidden",
                        touchAction: "manipulation",
                      }}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-white">
                    <div className="text-center">
                      <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        ready to test
                      </h3>
                      <p className="text-gray-600">
                        click "test extension" to launch the testing browser
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Testing Sidepanel */}
          <TestingSidepanel
            projectId={projectId}
            sessionId={sessionData?.sessionId}
            isSessionActive={!sessionExpired && !isLoading && !!sessionData?.sessionId}
            clearLogsTrigger={clearLogsTrigger}
            onSessionLogsCapture={onSessionLogsCapture}
            showTestingSection={sessionData?.autoRunHyperAgent === true || createOptions?.autoRunHyperAgent === true}
            hasBasicTests={hasBasicTests}
            hasAiAgentTests={hasAiAgentTests}
            onRunBasicTests={handleRunPuppeteerTests}
            onRunAiAgentTests={handleRunHyperAgentTest}
            onGenerateBasicTests={onGeneratePuppeteerTests}
            onGenerateAiAgentTests={onGenerateAiAgentTests}
            isRunningBasicTests={isRunningPuppeteerTests}
            isRunningAiAgentTests={isRunningHyperAgent}
            basicTestResult={puppeteerTestResult}
            aiAgentTestResult={hyperAgentResult}
          />
        </div>
      </div>
    </div>
  )
}