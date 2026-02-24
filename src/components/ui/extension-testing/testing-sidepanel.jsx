"use client"

import { useRef, useCallback, useEffect } from "react"
import ConsoleLogViewer from "@/components/ui/extension-testing/console-log-viewer"

export default function TestingSidepanel({
  projectId,
  sessionId,
  isSessionActive,
  clearLogsTrigger,
  onSessionLogsCapture,
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

  return (
    <aside className="w-[380px] max-w-[42vw] border-l border-gray-200 bg-white flex flex-col overflow-hidden min-h-0">
      <div className="flex-1 overflow-y-auto bg-white scroll-area-white">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            This is a simulated Chrome browser. Test your extension by clicking the puzzle icon in the toolbar or invoking its expected behavior. Logs shown below.
          </p>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            If you run into bot detection, try refreshing typing a website full URL into the address bar instead of using Google.
          </p>
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
