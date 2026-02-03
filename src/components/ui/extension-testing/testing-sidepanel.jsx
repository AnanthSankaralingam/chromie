"use client"

import { useMemo, useState, useEffect, useRef, useCallback } from "react"
import { Play, FileCode, Bot, CheckCircle, AlertCircle, Terminal, Sparkles, Lock, Square } from "lucide-react"
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
      {isSuccess ? "passed" : "failed"}
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

  // Stop handlers
  onStopPuppeteerTests,
  onStopAiAgentTests,
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
        <SectionHeader icon={Terminal} title="extension logs" />
        <div className="mt-2">
          <ConsoleLogViewer
            sessionId={sessionId}
            projectId={projectId}
            isSessionActive={isSessionActive}
            onLogsReady={handleLogsReady}
          />
        </div>
      </div>

      <div className="p-4 border-b border-gray-200 space-y-3">
        <SectionHeader
          icon={Play}
          title="run tests"
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
                  basic tests
                </button>
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                puppeteer validation (quick smoke tests)
              </div>
            </div>

            <div className="flex items-center gap-2">
              {puppeteerTestResult && (
                <ResultStatusPill status={puppeteerStatus} />
              )}
              {testsExist.puppeteer ? (
                <button
                  onClick={() => {
                    if (isRunningPuppeteerTests) {
                      console.log("[testing-sidepanel] ⏹️ Stop puppeteer tests clicked", { projectId, sessionId })
                      onStopPuppeteerTests?.()
                    } else {
                      console.log("[testing-sidepanel] ▶️ Run puppeteer tests clicked", { projectId, sessionId })
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
                    console.log("[testing-sidepanel] ✨ Generate puppeteer tests clicked", { projectId })
                    onGeneratePuppeteerTests?.()
                  }}
                  disabled={isCheckingTests}
                  className="px-2 py-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded"
                  title="generate basic tests"
                >
                  generate
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
                  <span className="text-amber-600">paid feature — upgrade to unlock</span>
                ) : (
                  "end‑to‑end simulation (real interactions)"
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {aiAgentTestResult && (
                <ResultStatusPill status={aiAgentStatus} />
              )}
              {!isPaid && !isLoadingPaidPlan ? (
                <div className="p-1 text-gray-400 cursor-not-allowed" title="ai agent testing is a paid feature">
                  <Lock className="h-4 w-4" />
                </div>
              ) : testsExist.aiAgent ? (
                <button
                  onClick={() => {
                    if (isRunningAiAgentTests) {
                      console.log("[testing-sidepanel] ⏹️ Stop AI agent tests clicked", { projectId, sessionId })
                      onStopAiAgentTests?.()
                    } else {
                      console.log("[testing-sidepanel] ▶️ Run AI agent tests clicked", { projectId, sessionId })
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
                    console.log("[testing-sidepanel] ✨ Generate AI agent tests clicked", { projectId })
                    onGenerateAiAgentTests?.()
                  }}
                  disabled={isCheckingTests}
                  className="px-2 py-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded"
                  title="generate ai agent tests"
                >
                  generate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <SectionHeader icon={AlertCircle} title="results" />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("puppeteer")}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium",
                activeTab === "puppeteer" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              basic
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
                    tests not generated yet
                  </div>
                  <div className="text-xs">click "generate" above to create basic tests for this extension.</div>
                </div>
              ) : !puppeteerTestResult ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                  run basic tests to see results here.
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
                      {puppeteerTestResult.success ? "basic tests passed" : "basic tests failed"}
                    </div>
                    {puppeteerTestResult.error ? (
                      <div className="mt-2 text-xs whitespace-pre-wrap">
                        <span className="font-semibold">error:</span> {puppeteerTestResult.error.replace(/Hyperbrowser/gi, 'Testing Browser')}
                      </div>
                    ) : null}
                    {puppeteerTestResult.logAnalysis?.logBasedFailure ? (
                      <div className="mt-2 text-xs whitespace-pre-wrap">
                        <span className="font-semibold">extension logs:</span> {puppeteerTestResult.logAnalysis.logBasedFailure.replace(/Hyperbrowser/gi, 'Testing Browser')}
                      </div>
                    ) : null}
                    {puppeteerTestResult.logAnalysis && (
                      <div className="mt-2 text-xs text-gray-600">
                        analyzed {puppeteerTestResult.logAnalysis.totalLogs || 0} log(s) • {puppeteerTestResult.logAnalysis.errorCount || 0} error(s) • {puppeteerTestResult.logAnalysis.warningCount || 0} warning(s)
                      </div>
                    )}
                  </div>

                  {Array.isArray(puppeteerTestResult.results) && puppeteerTestResult.results.length > 0 ? (
                    <div className="space-y-2">
                      {puppeteerTestResult.results.map((r, idx) => (
                        <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-gray-900">{r.name ? r.name.toLowerCase() : `test ${idx + 1}`}</div>
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
                      no test results returned.
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
                    tests not generated yet
                  </div>
                  <div className="text-xs">click "generate" above to create ai agent tests for this extension.</div>
                </div>
              ) : !aiAgentTestResult ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                  run ai agent tests to see results here.
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
                      {aiAgentTestResult.success ? "ai agent tests passed" : "ai agent tests failed"}
                    </div>
                    {aiAgentTestResult.error ? (
                      <div className="mt-2 text-xs whitespace-pre-wrap">
                        <span className="font-semibold">error:</span> {aiAgentTestResult.error.replace(/Hyperbrowser/gi, 'Testing Browser')}
                      </div>
                    ) : null}
                    {aiAgentTestResult.logAnalysis?.logBasedFailure ? (
                      <div className="mt-2 text-xs whitespace-pre-wrap">
                        <span className="font-semibold">extension logs:</span> {aiAgentTestResult.logAnalysis.logBasedFailure.replace(/Hyperbrowser/gi, 'Testing Browser')}
                      </div>
                    ) : null}
                    {aiAgentTestResult.logAnalysis && (
                      <div className="mt-2 text-xs text-gray-600">
                        analyzed {aiAgentTestResult.logAnalysis.totalLogs || 0} log(s) • {aiAgentTestResult.logAnalysis.errorCount || 0} error(s) • {aiAgentTestResult.logAnalysis.warningCount || 0} warning(s)
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="text-xs text-gray-500">task</div>
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {aiAgentTestResult.task || "—"}
                    </div>

                    <div className="mt-3 text-xs text-gray-500">result</div>
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {aiAgentTestResult.result || aiAgentTestResult.message || "—"}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

