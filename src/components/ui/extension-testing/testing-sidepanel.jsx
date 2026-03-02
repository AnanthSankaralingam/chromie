"use client"

import { useRef, useCallback, useEffect } from "react"
import { Play, Sparkles, CheckCircle2, XCircle, AlertCircle, Loader2, FileCode, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import ConsoleLogViewer from "@/components/ui/extension-testing/console-log-viewer"

export default function TestingSidepanel({
  projectId,
  sessionId,
  isSessionActive,
  clearLogsTrigger,
  onSessionLogsCapture,
  showTestingSection = false,
  hasBasicTests = false,
  hasAiAgentTests = false,
  onRunBasicTests,
  onRunAiAgentTests,
  onGenerateBasicTests,
  onGenerateAiAgentTests,
  isRunningBasicTests = false,
  isRunningAiAgentTests = false,
  basicTestResult = null,
  aiAgentTestResult = null,
}) {
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

  const canRunTests = isSessionActive && !isRunningBasicTests && !isRunningAiAgentTests

  return (
    <aside className="w-full md:w-[380px] md:max-w-[42vw] border-t md:border-t-0 md:border-l border-gray-200 bg-white flex flex-col overflow-hidden min-h-0 max-h-[45vh] md:max-h-none flex-shrink-0">
      <div className="flex-1 overflow-y-auto bg-white scroll-area-white">
        <div className="px-4 pt-4 pb-2">
          {showTestingSection && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex flex-col gap-2">
                {hasBasicTests ? (
                  <button
                    type="button"
                    onClick={onRunBasicTests}
                    disabled={!canRunTests}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left text-sm font-medium transition-colors",
                      "border-neutral-200 bg-neutral-50 text-neutral-800",
                      "hover:border-neutral-300 hover:bg-neutral-100",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-50"
                    )}
                  >
                    {isRunningBasicTests ? (
                      <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-neutral-600" />
                    ) : (
                      <Play className="h-4 w-4 flex-shrink-0 text-neutral-600" />
                    )}
                    <span>{isRunningBasicTests ? "running basic tests..." : "run basic tests"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onGenerateBasicTests}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left text-sm font-medium transition-colors",
                      "border-emerald-200 bg-emerald-50 text-emerald-800",
                      "hover:border-emerald-300 hover:bg-emerald-100"
                    )}
                  >
                    <FileCode className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span>Generate basic tests</span>
                  </button>
                )}
                {hasAiAgentTests ? (
                  <button
                    type="button"
                    onClick={onRunAiAgentTests}
                    disabled={!canRunTests}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left text-sm font-medium transition-colors",
                      "border-neutral-200 bg-neutral-50 text-neutral-800",
                      "hover:border-neutral-300 hover:bg-neutral-100",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-50"
                    )}
                  >
                    {isRunningAiAgentTests ? (
                      <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-neutral-600" />
                    ) : (
                      <Sparkles className="h-4 w-4 flex-shrink-0 text-neutral-600" />
                    )}
                    <span>{isRunningAiAgentTests ? "running AI agent tests..." : "run ai agent tests"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onGenerateAiAgentTests}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left text-sm font-medium transition-colors",
                      "border-violet-200 bg-violet-50 text-violet-800",
                      "hover:border-violet-300 hover:bg-violet-100"
                    )}
                  >
                    <Bot className="h-4 w-4 flex-shrink-0 text-violet-600" />
                    <span>Generate AI agent tests</span>
                  </button>
                )}
              </div>
              {(basicTestResult || aiAgentTestResult) && (
                <div className="mt-3 space-y-2">
                  {basicTestResult && (
                    <div
                      className={cn(
                        "rounded-lg border p-2.5 text-xs",
                        basicTestResult.results?.length > 0 && !basicTestResult.logAnalysis
                          ? "border-gray-200 bg-gray-50 text-gray-900"
                          : basicTestResult.passed
                          ? "border-green-200 bg-green-50 text-green-900"
                          : "border-red-200 bg-red-50 text-red-900"
                      )}
                    >
                      <div className="flex items-center gap-2 font-medium mb-1">
                        {basicTestResult.passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                        )}
                        <span>
                          Basic tests:{" "}
                          {basicTestResult.results?.length > 0 && !basicTestResult.logAnalysis
                            ? "In progress..."
                            : basicTestResult.passed
                            ? "Passed"
                            : "Failed"}
                        </span>
                      </div>
                      {!basicTestResult.passed && basicTestResult.error && (
                        <p className="text-red-700 mt-1">{basicTestResult.error}</p>
                      )}
                      {basicTestResult.results?.length > 0 && (
                        <ul
                          className={cn(
                            "mt-1.5 space-y-0.5",
                            basicTestResult.results?.length > 0 && !basicTestResult.logAnalysis
                              ? "text-gray-700"
                              : basicTestResult.passed
                              ? "text-gray-600"
                              : "text-red-800"
                          )}
                        >
                          {basicTestResult.results.map((r, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              {r.status === "passed" ? (
                                <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                              )}
                              <span>{r.name || `Test ${i + 1}`}</span>
                              {r.error && <span className="text-red-600">— {r.error}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {aiAgentTestResult && (
                    <div
                      className={cn(
                        "rounded-lg border p-2.5 text-xs",
                        aiAgentTestResult.success
                          ? "border-green-200 bg-green-50 text-green-900"
                          : aiAgentTestResult.status === "warning"
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-red-200 bg-red-50 text-red-900"
                      )}
                    >
                      <div className="flex items-center gap-2 font-medium mb-1">
                        {aiAgentTestResult.success ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        ) : aiAgentTestResult.status === "warning" ? (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                        )}
                        <span>
                          AI agent:{" "}
                          {aiAgentTestResult.success
                            ? "Passed"
                            : aiAgentTestResult.status === "warning"
                            ? "Warning"
                            : "Failed"}
                        </span>
                      </div>
                      {(aiAgentTestResult.error || aiAgentTestResult.message) && (
                        <p
                          className={cn(
                            "mt-1",
                            aiAgentTestResult.success ? "text-gray-600" : "text-red-700"
                          )}
                        >
                          {aiAgentTestResult.error || aiAgentTestResult.message}
                        </p>
                      )}
                      {aiAgentTestResult.result && aiAgentTestResult.success && (
                        <p className="text-gray-600 mt-1 truncate" title={aiAgentTestResult.result}>
                          {aiAgentTestResult.result}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {!showTestingSection && (
            <>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                This is a simulated Chrome browser. Test your extension by clicking the puzzle icon in the toolbar or invoking its expected behavior. Logs shown below.
              </p>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                If you run into bot detection, try refreshing typing a website full URL into the address bar instead of using Google.
              </p>
            </>
          )}
          {showTestingSection && (
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              logs from your extension appear below.
            </p>
          )}
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
      </div>
    </aside>
  )
}
