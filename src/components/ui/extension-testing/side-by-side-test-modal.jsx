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
      console.log("🔄 New test session detected, resetting expired state")
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
        console.log(`[session-wait] ✅ Session active for ${label || "action"}`, {
          sessionId: sessionData?.sessionId,
          status,
        })
        return { ok: true, status }
      }

      // If the session looks dead, try a single auto-refresh (keeps the same options via useTestExtension).
      if (
        DEAD_SESSION_STATUSES.has(status) &&
        !autoRefreshAttemptedRef.current &&
        typeof onRefresh === "function"
      ) {
        autoRefreshAttemptedRef.current = true
        console.warn("[session-wait] ⚠️ Session appears inactive, refreshing...", {
          sessionId: sessionData?.sessionId,
          status,
          label,
        })
        onRefresh()
        return { ok: false, refreshed: true, status }
      }

      await new Promise((r) => setTimeout(r, 1500))
    }

    console.warn(`[session-wait] ⏳ Timed out waiting for active session for ${label || "action"}`, {
      sessionId: sessionData?.sessionId,
      lastStatus,
      timeoutMs,
    })
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
      title: "setting up browser",
      description: "creating a new browser session for testing your extension"
    },
    {
      title: "installing extension",
      description: "preparing and uploading your extension files to the browser"
    },
    {
      title: "ready for testing",
      description: "your extension is loaded and ready to test!"
    }
  ]

  // Define instruction boxes for each stage
  const instructionBoxes = [
    {
      icon: Navigation,
      iconColor: "blue",
      title: "navigation & testing",
      items: [
        "• use url input to navigate",
        "• click and interact naturally",
        "• test on different websites",
        "• use keyboard shortcuts"
      ]
    },
    {
      icon: Eye,
      iconColor: "green",
      title: "extension features",
      items: [
        "• extension is automatically loaded",
        "• test popups and content scripts",
        "• check behavior on different pages",
        "• verify permissions work"
      ]
    },
    {
      icon: Info,
      iconColor: "purple",
      title: "session info",
      items: [
        "• 3-minute session limit",
        "• use \"test extension\" button for automated ai-agent testing",
        "• close when done"
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
  const handleRunHyperAgentTest = async () => {
    if (!sessionData?.sessionId || !projectId) {
      console.error("Missing session ID or project ID for HyperAgent test")
      return
    }

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
        console.log("[hyperagent-test] Test aborted by user")
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

    console.log("[hyperagent-test] Stopping AI agent tests...")
    
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
        console.log("[hyperagent-test] ✅ Session terminated, tests stopped")
        setHyperAgentResult({
          success: false,
          error: "Test stopped by user. Session terminated.",
        })
        // Mark session as expired so the UI reflects that the browser is closed
        setSessionExpired(true)
      } else {
        console.error("[hyperagent-test] Failed to terminate session")
        setHyperAgentResult({
          success: false,
          error: "Failed to stop test - session may still be running",
        })
      }
    } catch (error) {
      console.error("[hyperagent-test] Error stopping tests:", error)
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
    console.log("[ai-analysis] ✅ Pinning complete, auto-starting hyperagent_test_script...", {
      sessionId: sessionData.sessionId,
      pinned: pin?.pinned,
      alreadyPinned: pin?.alreadyPinned,
      sequence: sessionData?.runTestSequence === true,
    })
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
    console.log("[execute-testing-agent] ▶️ Auto-starting puppeteer tests...", {
      projectId,
      sessionId: sessionData.sessionId,
    })
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
    // Capture logs before closing if session is active
    if (sessionData?.sessionId && projectId && onSessionLogsCapture) {
      try {
        console.log('[side-by-side-test-modal] Fetching logs before close...')
        const response = await fetch(
          `/api/projects/${projectId}/test-extension/console-logs?sessionId=${encodeURIComponent(sessionData.sessionId)}`
        )

        if (response.ok) {
          const data = await response.json()
          if (data.logs && data.logs.length > 0) {
            console.log('[side-by-side-test-modal] Captured', data.logs.length, 'logs before close')
            onSessionLogsCapture(data.logs)
          }
        }
      } catch (error) {
        console.error('[side-by-side-test-modal] Failed to capture logs before close:', error)
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
      console.log("[demo-recording] 🎬 Started demo recording", {
        projectId,
        sessionId: sessionData?.sessionId,
      })

      // Capture offset from session start so we can auto-seek later.
      try {
        if (sessionData?.startedAt) {
          const sessionStartMs = new Date(sessionData.startedAt).getTime()
          const nowMs = Date.now()
          const offsetSeconds = Math.max(0, (nowMs - sessionStartMs) / 1000)
          demoStartOffsetRef.current = offsetSeconds
          console.log("[demo-recording] ⏱️ Demo start offset (s):", offsetSeconds)
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
      console.log("[demo-recording] ⏹️ Stopping demo recording (will save on view)...")
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
      console.log("[demo-recording] ▶️ Resolving demo video on view click...", {
        projectId,
        sessionId: sessionData.sessionId,
      })

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

      console.log("[demo-recording] ✅ Demo replay resolved", {
        sessionId: sessionData.sessionId,
        videoUrl: data.videoUrl,
        recordingStatus: data.recordingStatus,
      })

      if (data.sessionTerminated) {
        setSessionExpired(true)
      }

      setIsViewingDemo(true)
    } catch (err) {
      console.error("[demo-recording] ❌ Error resolving demo recording:", err)
      setDemoError(err?.message || "Failed to load demo recording")
      setDemoStatus("error")
    } finally {
      setIsResolvingDemoVideo(false)
    }
  }

  const handleRunPuppeteerTests = async () => {
    if (!sessionData?.sessionId || !projectId) {
      console.error("[puppeteer-tests] Missing session ID or project ID")
      return
    }

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

      console.log("[puppeteer-tests] Starting run", { projectId, sessionId: sessionData.sessionId })
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

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Puppeteer tests failed")
      }

      setPuppeteerTestResult(result)
    } catch (error) {
      // Don't set error if it was aborted
      if (error.name === 'AbortError') {
        console.log("[puppeteer-tests] Test aborted by user")
        return
      }
      setPuppeteerTestResult({
        success: false,
        error: error.message,
      })
    } finally {
      setIsRunningPuppeteerTests(false)
      puppeteerAbortControllerRef.current = null
      // We previously forced an iframe reconnect here by incrementing iframeReconnectNonce,
      // but this was causing "NOT FOUND" errors in the simulated browser.
      // The backend now keeps the CDP connection alive to prevent session disruption.
      console.log("[puppeteer-tests] ✅ Run complete", {
        sessionId: sessionData?.sessionId,
      })
    }
  }

  // Stop Puppeteer tests
  const handleStopPuppeteerTests = async () => {
    if (!sessionData?.sessionId || !projectId) {
      console.error("[puppeteer-tests] Missing session ID or project ID for stopping tests")
      return
    }

    console.log("[puppeteer-tests] Stopping puppeteer tests...")
    
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
        console.log("[puppeteer-tests] ✅ Session terminated, tests stopped")
        setPuppeteerTestResult({
          success: false,
          error: "Test stopped by user. Session terminated.",
        })
        // Mark session as expired so the UI reflects that the browser is closed
        setSessionExpired(true)
      } else {
        console.error("[puppeteer-tests] Failed to terminate session")
        setPuppeteerTestResult({
          success: false,
          error: "Failed to stop test - session may still be running",
        })
      }
    } catch (error) {
      console.error("[puppeteer-tests] Error stopping tests:", error)
      setPuppeteerTestResult({
        success: false,
        error: "Error stopping test",
      })
    }
  }

  // Get viewport dimensions from sessionData, with fallbacks
  const viewportWidth = sessionData?.browserInfo?.viewport?.width || 1920;
  const viewportHeight = sessionData?.browserInfo?.viewport?.height || 1080;

  // Estimate extra height for modal header and footer
  const modalExtraHeight = 56 + 50; // Total ~106px

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
        style={{
          width: `${viewportWidth}px`,
          height: `${viewportHeight + modalExtraHeight}px`,
          minWidth: '320px',
          minHeight: '200px',
          maxWidth: '95vw',
          maxHeight: '95vh',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ExternalLink
                className={cn(
                  "h-5 w-5",
                  sessionData?.status === 'active' ? "text-green-600" : "text-gray-400"
                )}
              />
              <h2 className="text-lg font-semibold text-gray-900">extension test environment</h2>
            </div>

            {sessionData && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>session: {sessionData.sessionId?.slice(-8)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
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

        {/* Main Content - Browser (left) + Testing Sidepanel (right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Browser Panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Monitor className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {isViewingDemo && demoVideoUrl ? "demo video recording" : "live browser session"}
                  </span>
                </div>
                {/* Demo recording controls (moved from top bar) */}
                <div className="flex items-center space-x-2 relative">
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

              <div className="flex-1 relative overflow-hidden">
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
                      <Button
                        onClick={handleClose}
                        className="bg-gradient-to-r from-black to-gray-800 hover:from-gray-900 hover:to-black text-white"
                      >
                        close session
                      </Button>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="absolute inset-0 bg-white flex items-center justify-center p-8">
                    <div className="text-center max-w-4xl w-full">
                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${((loadingStage + 1) / loadingStages.length) * 100}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600">
                          {loadingStage + 1} of {loadingStages.length} steps
                        </p>
                      </div>

                      {/* Current Stage */}
                      <div className="mb-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {loadingStages[loadingStage]?.title ? loadingStages[loadingStage].title.toLowerCase() : "initializing..."}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {loadingStages[loadingStage]?.description ? loadingStages[loadingStage].description.toLowerCase() :
                            "please wait while we prepare your testing environment"}
                        </p>
                      </div>

                      {/* Dynamic Instructions - Show one box per stage */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 text-center">testing tips</h4>
                        <div className="flex justify-center">
                          {instructionBoxes[loadingStage] && (
                            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-500 max-w-sm w-full">
                              <div className="flex items-center mb-4">
                                <div
                                  className={`w-10 h-10 bg-${instructionBoxes[loadingStage].iconColor}-100 rounded-lg flex items-center justify-center mr-4`}
                                >
                                  {React.createElement(instructionBoxes[loadingStage].icon, {
                                    className: `h-5 w-5 text-${instructionBoxes[loadingStage].iconColor}-600`,
                                  })}
                                </div>
                                <h5 className="font-medium text-gray-900 text-lg">{instructionBoxes[loadingStage].title.toLowerCase()}</h5>
                              </div>
                              <ul className="text-base text-gray-600 space-y-2 text-left">
                                {instructionBoxes[loadingStage].items.map((item, index) => (
                                  <li key={index}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : error ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <ErrorDisplay
                      error={error}
                      onRetry={onRefresh}
                      onSolveInChat={onSolveErrorInChat}
                      isLoading={isLoading}
                    />
                  </div>
                ) : sessionData?.iframeUrl ? (
                  <iframe
                    src={iframeSrc}
                    className="absolute inset-0 w-full h-full border-0"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
                    allow="clipboard-read; clipboard-write; autoplay; fullscreen; camera; microphone"
                    loading="eager"
                    title="browserbase session"
                    style={{
                      transform: "translateZ(0)",
                      willChange: "transform",
                      backfaceVisibility: "hidden",
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
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
            viewportLabel={
              sessionData?.browserInfo?.viewport?.width && sessionData?.browserInfo?.viewport?.height
                ? `${sessionData.browserInfo.viewport.width}x${sessionData.browserInfo.viewport.height}`
                : null
            }
            onRunPuppeteerTests={handleRunPuppeteerTests}
            isRunningPuppeteerTests={isRunningPuppeteerTests}
            puppeteerTestResult={puppeteerTestResult}
            onRunAiAgentTests={handleRunHyperAgentTest}
            isRunningAiAgentTests={isRunningHyperAgent}
            aiAgentTestResult={hyperAgentResult}
            onGeneratePuppeteerTests={onGeneratePuppeteerTests}
            onGenerateAiAgentTests={onGenerateAiAgentTests}
            onSessionLogsCapture={onSessionLogsCapture}
            onStopPuppeteerTests={handleStopPuppeteerTests}
            onStopAiAgentTests={handleStopAiAgentTests}
          />
        </div>
      </div>
    </div>
  )
}