"use client"

import { useMemo, useState, useEffect, useRef, useCallback } from "react"
import {
  Play, FileCode, Bot, CheckCircle, AlertCircle,
  Lock, Square, ChevronDown, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import ConsoleLogViewer from "@/components/ui/extension-testing/console-log-viewer"
import { usePaidPlan } from "@/hooks/use-paid-plan"

function StatusPill({ status }) {
  if (!status) return null
  const isSuccess = status === "success"
  const isWarning = status === "warning"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        isSuccess && "bg-green-100 text-green-700",
        isWarning && "bg-amber-100 text-amber-700",
        !isSuccess && !isWarning && "bg-red-100 text-red-700"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isSuccess && "bg-green-600",
          isWarning && "bg-amber-600",
          !isSuccess && !isWarning && "bg-red-600"
        )}
      />
      {isSuccess ? "passed" : isWarning ? "warning" : "failed"}
    </span>
  )
}

function RunningPulse({ label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
      </span>
      <span className="text-xs text-blue-600 font-medium">{label || "running"}</span>
    </div>
  )
}

function getFailureExplanation(result, testType) {
  if (!result || result.success) return null
  if (result.logAnalysis?.logBasedFailure) {
    return "Your extension threw errors during the test. Review the activity below for details."
  }
  if (result.error?.toLowerCase().includes("timeout")) {
    return "The test timed out — your extension may be slow to load, or a required element wasn't found in time."
  }
  if (result.error?.toLowerCase().includes("session")) {
    return "The testing session encountered an issue. Try refreshing and running again."
  }
  if (testType === "puppeteer") {
    return "One or more smoke tests didn't pass. Expand each test below to see what failed."
  }
  return "The AI agent couldn't complete the task. Check the result description below for details."
}

export default function TestingSidepanel({
  projectId,
  sessionId,
  isSessionActive,
  clearLogsTrigger,

  onRunPuppeteerTests,
  isRunningPuppeteerTests,
  puppeteerTestResult,

  onRunAiAgentTests,
  isRunningAiAgentTests,
  aiAgentTestResult,

  onGeneratePuppeteerTests,
  onGenerateAiAgentTests,

  viewportLabel,
  onSessionLogsCapture,
  onStopPuppeteerTests,
  onStopAiAgentTests,
}) {
  const [activeTab, setActiveTab] = useState("puppeteer")
  const [testsExist, setTestsExist] = useState({ puppeteer: true, aiAgent: true })
  const [isCheckingTests, setIsCheckingTests] = useState(true)
  const [expandedTests, setExpandedTests] = useState({})
  const { isPaid, isLoading: isLoadingPaidPlan } = usePaidPlan()

  const sessionLogsRef = useRef([])
  const previousSessionActiveRef = useRef(isSessionActive)

  const handleLogsReady = useCallback((logs) => {
    sessionLogsRef.current = logs
  }, [])

  useEffect(() => {
    if (previousSessionActiveRef.current && !isSessionActive) {
      const capturedLogs = sessionLogsRef.current
      if (capturedLogs.length > 0 && onSessionLogsCapture) {
        onSessionLogsCapture(capturedLogs)
      }
    }
    previousSessionActiveRef.current = isSessionActive
  }, [isSessionActive, onSessionLogsCapture])

  useEffect(() => {
    const checkTestsExistence = async () => {
      if (!projectId) return
      setIsCheckingTests(true)
      try {
        const response = await fetch(`/api/projects/${projectId}/tests/check`)
        if (response.ok) {
          const data = await response.json()
          setTestsExist(data.tests || { puppeteer: false, aiAgent: false })
        } else {
          setTestsExist({ puppeteer: false, aiAgent: false })
        }
      } catch (error) {
        setTestsExist({ puppeteer: false, aiAgent: false })
      } finally {
        setIsCheckingTests(false)
      }
    }
    checkTestsExistence()
  }, [projectId])

  // Auto-switch active tab when a test starts running
  useEffect(() => {
    if (isRunningPuppeteerTests) setActiveTab("puppeteer")
  }, [isRunningPuppeteerTests])

  useEffect(() => {
    if (isRunningAiAgentTests) setActiveTab("aiAgent")
  }, [isRunningAiAgentTests])

  const puppeteerStatus = useMemo(
    () => (!puppeteerTestResult ? null : puppeteerTestResult.success ? "success" : "error"),
    [puppeteerTestResult]
  )
  const aiAgentStatus = useMemo(() => {
    if (!aiAgentTestResult) return null
    if (aiAgentTestResult.status) return aiAgentTestResult.status
    return aiAgentTestResult.success ? "success" : "error"
  }, [aiAgentTestResult])

  const isActiveRunning =
    activeTab === "puppeteer" ? isRunningPuppeteerTests : isRunningAiAgentTests
  const activeResult =
    activeTab === "puppeteer" ? puppeteerTestResult : aiAgentTestResult

  const toggleTestExpanded = (idx) => {
    setExpandedTests((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <aside className="w-[380px] max-w-[42vw] border-l border-gray-200 bg-white flex flex-col overflow-hidden min-h-0">

      {/* ── Controls ──────────────────────────────────── */}
      <div className="p-3 border-b border-gray-200 space-y-2 flex-shrink-0 bg-white">

        {/* Basic tests row */}
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors",
            activeTab === "puppeteer"
              ? "border-gray-300 bg-white"
              : "border-gray-200 bg-white hover:border-gray-300"
          )}
          onClick={() => setActiveTab("puppeteer")}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileCode className="h-4 w-4 text-gray-600 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900">basic tests</div>
              <div className="text-xs text-gray-500">puppeteer smoke tests</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {isRunningPuppeteerTests ? (
              <RunningPulse />
            ) : puppeteerTestResult ? (
              <StatusPill status={puppeteerStatus} />
            ) : null}
            {testsExist.puppeteer ? (
              <button
                onClick={() => {
                  if (isRunningPuppeteerTests) {
                    onStopPuppeteerTests?.()
                  } else {
                    setActiveTab("puppeteer")
                    onRunPuppeteerTests?.()
                  }
                }}
                disabled={!sessionId}
                className={cn(
                  "p-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                  isRunningPuppeteerTests
                    ? "text-red-600 hover:text-red-700"
                    : "text-emerald-600 hover:text-emerald-700"
                )}
                title={isRunningPuppeteerTests ? "stop basic tests" : "run basic tests"}
              >
                {isRunningPuppeteerTests ? (
                  <Square className="h-4 w-4 fill-red-600" />
                ) : (
                  <Play className="h-4 w-4 fill-emerald-600" />
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  onGeneratePuppeteerTests?.()
                }}
                disabled={isCheckingTests}
                className="px-2 py-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded"
              >
                generate
              </button>
            )}
          </div>
        </div>

        {/* AI agent row */}
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors",
            !isPaid && !isLoadingPaidPlan
              ? "border-gray-200 bg-white cursor-not-allowed"
              : activeTab === "aiAgent"
              ? "border-gray-300 bg-white cursor-pointer"
              : "border-gray-200 bg-white hover:border-gray-300 cursor-pointer"
          )}
          onClick={() => {
            if (isPaid || isLoadingPaidPlan) setActiveTab("aiAgent")
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Bot
              className={cn(
                "h-4 w-4 flex-shrink-0",
                !isPaid && !isLoadingPaidPlan ? "text-gray-400" : "text-gray-600"
              )}
            />
            <div className="min-w-0">
              <div
                className={cn(
                  "text-sm font-medium flex items-center gap-1.5",
                  !isPaid && !isLoadingPaidPlan ? "text-gray-500" : "text-gray-900"
                )}
              >
                AI agent tests
                {!isPaid && !isLoadingPaidPlan && (
                  <Lock className="h-3.5 w-3.5 text-gray-400" />
                )}
              </div>
              <div className="text-xs text-gray-500">
                {!isPaid && !isLoadingPaidPlan ? (
                  <span className="text-amber-600">upgrade to unlock</span>
                ) : (
                  "end-to-end real interactions"
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {isRunningAiAgentTests ? (
              <RunningPulse />
            ) : aiAgentTestResult ? (
              <StatusPill status={aiAgentStatus} />
            ) : null}
            {!isPaid && !isLoadingPaidPlan ? (
              <div className="p-1 text-gray-300 cursor-not-allowed">
                <Lock className="h-4 w-4" />
              </div>
            ) : testsExist.aiAgent ? (
              <button
                onClick={() => {
                  if (isRunningAiAgentTests) {
                    onStopAiAgentTests?.()
                  } else {
                    setActiveTab("aiAgent")
                    onRunAiAgentTests?.()
                  }
                }}
                disabled={!sessionId}
                className={cn(
                  "p-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                  isRunningAiAgentTests
                    ? "text-red-600 hover:text-red-700"
                    : "text-emerald-600 hover:text-emerald-700"
                )}
                title={isRunningAiAgentTests ? "stop ai agent tests" : "run ai agent tests"}
              >
                {isRunningAiAgentTests ? (
                  <Square className="h-4 w-4 fill-red-600" />
                ) : (
                  <Play className="h-4 w-4 fill-emerald-600" />
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  onGenerateAiAgentTests?.()
                }}
                disabled={isCheckingTests}
                className="px-2 py-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded"
              >
                generate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Unified activity area ──────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-white scroll-area-white">

        {/* ── Console logs — always at top, always mounted ── */}
        <div className="px-4 pt-4 pb-2">
          <ConsoleLogViewer
            sessionId={sessionId}
            projectId={projectId}
            isSessionActive={isSessionActive}
            onLogsReady={handleLogsReady}
            clearLogsTrigger={clearLogsTrigger}
            flow
            light
          />
        </div>

        {/* Running state */}
        {isActiveRunning && (
          <div className="px-4 pt-4 pb-2 space-y-1.5">
            <RunningPulse
              label={
                activeTab === "puppeteer" ? "running basic tests…" : "AI agent is testing…"
              }
            />
            <p className="text-xs text-gray-500 pl-3.5">
              {activeTab === "puppeteer"
                ? "Smoke tests are running in the live browser. Logs update in real time above."
                : "The AI agent is interacting with your extension. This may take a minute."}
            </p>
          </div>
        )}

        {/* Results state */}
        {!isActiveRunning && activeResult && (() => {
          const isAiWarning = activeTab === "aiAgent" && activeResult.status === "warning"
          return (
          <div className="px-4 pt-4 pb-2 space-y-3">

            {/* Summary card */}
            <div
              className={cn(
                "rounded-lg border p-3",
                activeResult.success && !isAiWarning && "border-green-200 bg-green-50",
                isAiWarning && "border-amber-200 bg-amber-50",
                !activeResult.success && "border-red-200 bg-red-50"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2 font-medium text-sm",
                  activeResult.success && !isAiWarning && "text-green-800",
                  isAiWarning && "text-amber-800",
                  !activeResult.success && "text-red-800"
                )}
              >
                {activeResult.success && !isAiWarning ? (
                  <CheckCircle className="h-4 w-4 text-green-700 flex-shrink-0" />
                ) : isAiWarning ? (
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-700 flex-shrink-0" />
                )}
                {activeTab === "puppeteer"
                  ? activeResult.success
                    ? "basic tests passed"
                    : "basic tests failed"
                  : activeResult.status === "warning"
                  ? "AI agent tests — warning"
                  : activeResult.success
                  ? "AI agent tests passed"
                  : "AI agent tests failed"}
              </div>

              {/* Human-readable failure or warning explanation */}
              {isAiWarning ? (
                <p className="mt-2 text-xs text-amber-700/90 leading-relaxed">
                  Some verification steps could not be completed. Review the result below for details.
                </p>
              ) : (
                (() => {
                  const explanation = getFailureExplanation(activeResult, activeTab)
                  return explanation ? (
                    <p className="mt-2 text-xs text-red-700/80 leading-relaxed">{explanation}</p>
                  ) : null
                })()
              )}

              {/* Error message */}
              {activeResult.error && (
                <div className="mt-2 text-xs bg-red-100/70 rounded p-2 font-mono whitespace-pre-wrap text-red-800">
                  {activeResult.error.replace(/Hyperbrowser/gi, "Testing Browser")}
                </div>
              )}

              {/* Log analysis stats */}
              {activeResult.logAnalysis && (
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                  <span>{activeResult.logAnalysis.totalLogs || 0} logs captured</span>
                  {(activeResult.logAnalysis.errorCount || 0) > 0 && (
                    <span className="text-red-600 font-medium">
                      {activeResult.logAnalysis.errorCount} error
                      {activeResult.logAnalysis.errorCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {(activeResult.logAnalysis.warningCount || 0) > 0 && (
                    <span className="text-yellow-600">
                      {activeResult.logAnalysis.warningCount} warning
                      {activeResult.logAnalysis.warningCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* AI agent: task + result */}
            {activeTab === "aiAgent" &&
              (activeResult.result || activeResult.message) && (
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                    result
                  </div>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {activeResult.result || activeResult.message}
                  </p>
                </div>
              )}

            {/* Basic tests: expandable breakdown */}
            {activeTab === "puppeteer" &&
              Array.isArray(activeResult.results) &&
              activeResult.results.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-0.5">
                    test breakdown
                  </div>
                  {activeResult.results.map((r, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-gray-200 bg-white overflow-hidden"
                    >
                      <button
                        type="button"
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-left transition-colors",
                          r.error ? "hover:ring-1 hover:ring-gray-200 cursor-pointer" : "cursor-default"
                        )}
                        onClick={() => r.error && toggleTestExpanded(idx)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {r.status === "passed" ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                          )}
                          <span className="text-sm text-gray-900 truncate">
                            {r.name ? r.name.toLowerCase() : `test ${idx + 1}`}
                          </span>
                        </div>
                        {r.error && (
                          expandedTests[idx] ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          )
                        )}
                      </button>
                      {r.error && expandedTests[idx] && (
                        <div className="px-3 pb-3">
                          <div className="text-xs font-mono text-red-700 bg-red-50 rounded p-2 whitespace-pre-wrap">
                            {r.error.replace(/Hyperbrowser/gi, "Testing Browser")}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
        )()}

        {/* Idle state: brief context prompt */}
        {!isActiveRunning && !activeResult && (
          <div className="px-4 pt-4 pb-2">
            {activeTab === "puppeteer" && !testsExist.puppeteer ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 mb-3">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertCircle className="h-4 w-4" />
                  tests not generated yet
                </div>
                <div className="text-xs">
                  click &quot;generate&quot; above to create basic tests for this extension.
                </div>
              </div>
            ) : activeTab === "aiAgent" && !testsExist.aiAgent ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 mb-3">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertCircle className="h-4 w-4" />
                  tests not generated yet
                </div>
                <div className="text-xs">
                  click &quot;generate&quot; above to create AI agent tests for this extension.
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-500 mb-3">
                {activeTab === "puppeteer"
                  ? "run basic tests to validate your extension loads and core features work."
                  : "run AI agent tests to simulate real user interactions with your extension."}
              </div>
            )}
          </div>
        )}

      </div>
    </aside>
  )
}
