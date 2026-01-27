"use client"

import { useMemo, useState, useEffect, useRef, useCallback } from "react"
import { Play, FileCode, Bot, CheckCircle, AlertCircle, Terminal, Sparkles, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import ConsoleLogViewer from "@/components/ui/extension-testing/console-log-viewer"
import { usePaidPlan } from "@/hooks/use-paid-plan"

function ResultStatusPill({ status }) {
  if (!status) return null
  const isSuccess = status === "success"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        isSuccess ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", isSuccess ? "bg-green-600" : "bg-red-600")} />
      {isSuccess ? "Passed" : "Failed"}
    </span>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-700" />
          <div className="font-semibold text-gray-900">{title}</div>
        </div>
        {subtitle ? <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div> : null}
      </div>
    </div>
  )
}

export default function TestingSidepanel({
  projectId,
  sessionId,
  isSessionActive,

  // Run controls
  onRunPuppeteerTests,
  isRunningPuppeteerTests,
  puppeteerTestResult,

  onRunAiAgentTests,
  isRunningAiAgentTests,
  aiAgentTestResult,

  // Generation controls
  onGeneratePuppeteerTests,
  onGenerateAiAgentTests,

  // Session info
  viewportLabel,

  // Logs capture callback
  onSessionLogsCapture,
}) {
  const [activeTab, setActiveTab] = useState("puppeteer")
  const [testsExist, setTestsExist] = useState({ puppeteer: true, aiAgent: true })
  const [isCheckingTests, setIsCheckingTests] = useState(true)
  const { isPaid, isLoading: isLoadingPaidPlan } = usePaidPlan()

  // Track current session logs for capture on session end
  const sessionLogsRef = useRef([])
  const previousSessionActiveRef = useRef(isSessionActive)

  // Callback to capture logs from ConsoleLogViewer
  const handleLogsReady = useCallback((logs) => {
    sessionLogsRef.current = logs
  }, [])

  // Capture logs when session ends
  useEffect(() => {
    // Detect session ending (was active, now inactive)
    if (previousSessionActiveRef.current && !isSessionActive) {
      const capturedLogs = sessionLogsRef.current
      if (capturedLogs.length > 0 && onSessionLogsCapture) {
        console.log('[testing-sidepanel] Session ended, capturing', capturedLogs.length, 'logs')
        onSessionLogsCapture(capturedLogs)
      }
    }
    previousSessionActiveRef.current = isSessionActive
  }, [isSessionActive, onSessionLogsCapture])

  // Check which tests exist when component mounts or projectId changes
  useEffect(() => {
    const checkTestsExistence = async () => {
      if (!projectId) return

      setIsCheckingTests(true)
      try {
        const response = await fetch(`/api/projects/${projectId}/tests/check`)
        if (response.ok) {
          const data = await response.json()
          setTestsExist(data.tests || { puppeteer: false, aiAgent: false })
          console.log("[testing-sidepanel] 📋 Tests existence:", data.tests)
        } else {
          console.error("[testing-sidepanel] Failed to check tests:", response.status)
          setTestsExist({ puppeteer: false, aiAgent: false })
        }
      } catch (error) {
        console.error("[testing-sidepanel] Error checking tests:", error)
        setTestsExist({ puppeteer: false, aiAgent: false })
      } finally {
        setIsCheckingTests(false)
      }
    }

    checkTestsExistence()
  }, [projectId])

  const puppeteerStatus = useMemo(() => {
    if (!puppeteerTestResult) return null
    return puppeteerTestResult.success ? "success" : "error"
  }, [puppeteerTestResult])

  const aiAgentStatus = useMemo(() => {
    if (!aiAgentTestResult) return null
    return aiAgentTestResult.success ? "success" : "error"
  }, [aiAgentTestResult])

  return (
    <aside className="w-[380px] max-w-[42vw] border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold text-gray-900">Testing</div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                isSessionActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
              )}
              title={isSessionActive ? "Session active" : "Session inactive"}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", isSessionActive ? "bg-green-600" : "bg-gray-400")} />
              {isSessionActive ? "Live" : "Offline"}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-gray-500">Session</div>
            <div className="mt-0.5 font-mono text-gray-900">{sessionId ? sessionId.slice(-8) : "—"}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-gray-500">Viewport</div>
            <div className="mt-0.5 text-gray-900">{viewportLabel || "—"}</div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200 space-y-3">
        <SectionHeader
          icon={Play}
          title="Run tests"
          subtitle="Run automated tests against the current live session."
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-gray-700" />
                <button
                  type="button"
                  className={cn(
                    "text-sm font-medium text-gray-900 hover:underline",
                    activeTab === "puppeteer" && "underline"
                  )}
                  onClick={() => setActiveTab("puppeteer")}
                >
                  Puppeteer tests
                </button>
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                Basic validation (quick smoke tests).
              </div>
            </div>

            <div className="flex items-center gap-2">
              {puppeteerTestResult && (
                <ResultStatusPill status={puppeteerStatus} />
              )}
              {testsExist.puppeteer ? (
                <button
                  onClick={() => {
                    console.log("[testing-sidepanel] ▶️ Run puppeteer tests clicked", { projectId, sessionId })
                    setActiveTab("puppeteer")
                    onRunPuppeteerTests?.()
                  }}
                  disabled={isRunningPuppeteerTests || !sessionId}
                  className="p-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Run Puppeteer tests"
                >
                  {isRunningPuppeteerTests ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent" />
                  ) : (
                    <Play className="h-4 w-4 fill-emerald-600" />
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    console.log("[testing-sidepanel] ✨ Generate puppeteer tests clicked", { projectId })
                    onGeneratePuppeteerTests?.()
                  }}
                  disabled={isCheckingTests}
                  className="px-2 py-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded"
                  title="Generate Puppeteer tests"
                >
                  Generate
                </button>
              )}
            </div>
          </div>

          <div className={cn(
            "flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
            !isPaid && !isLoadingPaidPlan ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white"
          )}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bot className={cn("h-4 w-4", !isPaid && !isLoadingPaidPlan ? "text-gray-400" : "text-gray-700")} />
                <button
                  type="button"
                  className={cn(
                    "text-sm font-medium hover:underline flex items-center gap-1.5",
                    !isPaid && !isLoadingPaidPlan ? "text-gray-500 cursor-not-allowed" : "text-gray-900",
                    activeTab === "aiAgent" && "underline"
                  )}
                  onClick={() => {
                    if (isPaid || isLoadingPaidPlan) {
                      setActiveTab("aiAgent")
                    }
                  }}
                  disabled={!isPaid && !isLoadingPaidPlan}
                >
                  AI agent tests
                  {!isPaid && !isLoadingPaidPlan && (
                    <Lock className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </button>
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                {!isPaid && !isLoadingPaidPlan ? (
                  <span className="text-amber-600">Paid feature — upgrade to unlock</span>
                ) : (
                  "End‑to‑end user simulation (realistic interactions)."
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {aiAgentTestResult && (
                <ResultStatusPill status={aiAgentStatus} />
              )}
              {!isPaid && !isLoadingPaidPlan ? (
                <div className="p-1 text-gray-400 cursor-not-allowed" title="AI agent testing is a paid feature">
                  <Lock className="h-4 w-4" />
                </div>
              ) : testsExist.aiAgent ? (
                <button
                  onClick={() => {
                    console.log("[testing-sidepanel] ▶️ Run AI agent tests clicked", { projectId, sessionId })
                    setActiveTab("aiAgent")
                    onRunAiAgentTests?.()
                  }}
                  disabled={isRunningAiAgentTests || !sessionId}
                  className="p-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Run AI agent tests"
                >
                  {isRunningAiAgentTests ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent" />
                  ) : (
                    <Play className="h-4 w-4 fill-emerald-600" />
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    console.log("[testing-sidepanel] ✨ Generate AI agent tests clicked", { projectId })
                    onGenerateAiAgentTests?.()
                  }}
                  disabled={isCheckingTests}
                  className="px-2 py-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded"
                  title="Generate AI agent tests"
                >
                  Generate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <SectionHeader icon={AlertCircle} title="Results" subtitle="See pass/fail and error messages here." />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("puppeteer")}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium",
                activeTab === "puppeteer" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              Puppeteer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("aiAgent")}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium",
                activeTab === "aiAgent" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              AI agent
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === "puppeteer" ? (
            <div className="space-y-3">
              {!testsExist.puppeteer ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <AlertCircle className="h-4 w-4" />
                    Tests not generated yet
                  </div>
                  <div className="text-xs">Click "Generate" above to create Puppeteer tests for this extension.</div>
                </div>
              ) : !puppeteerTestResult ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                  Run Puppeteer tests to see results here.
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      "rounded-lg border p-3 text-sm",
                      puppeteerTestResult.success
                        ? "border-green-200 bg-green-50 text-green-800"
                        : "border-red-200 bg-red-50 text-red-800"
                    )}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {puppeteerTestResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-700" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-700" />
                      )}
                      {puppeteerTestResult.success ? "Puppeteer tests passed" : "Puppeteer tests failed"}
                    </div>
                    {puppeteerTestResult.error ? (
                      <div className="mt-2 text-xs whitespace-pre-wrap">
                        <span className="font-semibold">Error:</span> {puppeteerTestResult.error.replace(/Hyperbrowser/gi, 'Testing Browser')}
                      </div>
                    ) : null}
                  </div>

                  {Array.isArray(puppeteerTestResult.results) && puppeteerTestResult.results.length > 0 ? (
                    <div className="space-y-2">
                      {puppeteerTestResult.results.map((r, idx) => (
                        <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-gray-900">{r.name || `Test ${idx + 1}`}</div>
                            <div
                              className={cn(
                                "text-xs font-semibold",
                                r.status === "passed" ? "text-green-700" : "text-red-700"
                              )}
                            >
                              {r.status}
                            </div>
                          </div>
                          {r.error ? (
                            <div className="mt-2 text-xs text-red-700 whitespace-pre-wrap">{r.error.replace(/Hyperbrowser/gi, 'Testing Browser')}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                      No test results returned.
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {!testsExist.aiAgent ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <AlertCircle className="h-4 w-4" />
                    Tests not generated yet
                  </div>
                  <div className="text-xs">Click "Generate" above to create AI agent tests for this extension.</div>
                </div>
              ) : !aiAgentTestResult ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                  Run AI agent tests to see results here.
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      "rounded-lg border p-3 text-sm",
                      aiAgentTestResult.success
                        ? "border-green-200 bg-green-50 text-green-800"
                        : "border-red-200 bg-red-50 text-red-800"
                    )}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {aiAgentTestResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-700" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-700" />
                      )}
                      {aiAgentTestResult.success ? "AI agent tests passed" : "AI agent tests failed"}
                    </div>
                    {aiAgentTestResult.error ? (
                      <div className="mt-2 text-xs whitespace-pre-wrap">
                        <span className="font-semibold">Error:</span> {aiAgentTestResult.error.replace(/Hyperbrowser/gi, 'Testing Browser')}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="text-xs text-gray-500">Task</div>
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {aiAgentTestResult.task || "—"}
                    </div>

                    <div className="mt-3 text-xs text-gray-500">Result</div>
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {aiAgentTestResult.result || aiAgentTestResult.message || "—"}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4">
          <SectionHeader icon={Terminal} title="Console logs" subtitle="Extension console output from this session." />
          <div className="mt-2">
            <ConsoleLogViewer
              sessionId={sessionId}
              projectId={projectId}
              isSessionActive={isSessionActive}
              onLogsReady={handleLogsReady}
            />
          </div>
        </div>
      </div>
    </aside>
  )
}

