"use client"

import { useState, useEffect, useRef } from "react"
import { Terminal, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function ConsoleLogViewer({ sessionId, projectId, isSessionActive }) {
  const [logs, setLogs] = useState([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const logsEndRef = useRef(null)
  const pollingInterval = useRef(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isExpanded && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, isExpanded])

  // Fetch logs from API
  const fetchLogs = async () => {
    if (!sessionId || !projectId || !isSessionActive) return

    try {
      const response = await fetch(`/api/projects/${projectId}/test-extension/console-logs?sessionId=${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.logs && Array.isArray(data.logs)) {
          setLogs(data.logs)
        }
      }
    } catch (error) {
      console.error("Failed to fetch console logs:", error)
    }
  }

  // Start/stop polling based on session status and expansion
  useEffect(() => {
    if (isSessionActive && isExpanded) {
      // Fetch immediately
      fetchLogs()
      
      // Start polling every 2 seconds
      setIsPolling(true)
      pollingInterval.current = setInterval(fetchLogs, 2000)
    } else {
      // Stop polling
      setIsPolling(false)
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
        pollingInterval.current = null
      }
    }

    // Cleanup on unmount
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
    }
  }, [isSessionActive, isExpanded, sessionId, projectId])

  const clearLogs = () => {
    setLogs([])
  }

  const getLogTypeColor = (type) => {
    switch (type) {
      case "error":
        return "text-red-600"
      case "warn":
        return "text-yellow-600"
      case "info":
        return "text-blue-600"
      default:
        return "text-gray-700"
    }
  }

  const getLogTypeIcon = (type) => {
    switch (type) {
      case "error":
        return "❌"
      case "warn":
        return "⚠️"
      case "info":
        return "ℹ️"
      default:
        return "📝"
    }
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl">
      {/* Header - Collapsed View */}
      <div className="flex items-center space-x-2">
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:text-gray-900"
        >
          <Terminal className="h-4 w-4 mr-2" />
          <span className="text-sm">Console Logs</span>
          {logs.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {logs.length}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 ml-1" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-1" />
          )}
        </Button>
        
        {logs.length > 0 && (
          <Button
            onClick={clearLogs}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-red-600"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Expanded Log View */}
      {isExpanded && (
        <div className="mt-2 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <Terminal className="h-3 w-3" />
              <span>Extension Console</span>
              {isPolling && (
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  <span>Live</span>
                </span>
              )}
            </div>
          </div>
          
          <div className="p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1 bg-gray-900">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No console logs yet</p>
                <p className="text-xs mt-1">Logs from your extension will appear here</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-2 rounded border-l-2",
                    log.isChromieLog && "bg-purple-950/30 border-purple-500",
                    !log.isChromieLog && log.type === "error" && "bg-red-950/30 border-red-600",
                    !log.isChromieLog && log.type === "warn" && "bg-yellow-950/30 border-yellow-600",
                    !log.isChromieLog && log.type === "info" && "bg-blue-950/30 border-blue-600",
                    !log.isChromieLog && !log.type && "bg-gray-800/50 border-gray-600"
                  )}
                >
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0">{getLogTypeIcon(log.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline space-x-2 flex-wrap">
                        {log.isChromieLog && (
                          <span className="px-1.5 py-0.5 bg-purple-600 text-white text-xs font-bold rounded flex-shrink-0">
                            CHROMIE
                          </span>
                        )}
                        {log.component && (
                          <span className="text-purple-300 font-semibold flex-shrink-0 text-xs">
                            {log.component}
                          </span>
                        )}
                        {log.context && (
                          <span className="px-1 py-0.5 bg-gray-700 text-gray-300 text-xs rounded flex-shrink-0">
                            {log.context}
                          </span>
                        )}
                        {log.prefix && !log.isChromieLog && (
                          <span className="text-gray-400 font-semibold flex-shrink-0">
                            {log.prefix}
                          </span>
                        )}
                        <span className={cn("break-words", log.isChromieLog ? "text-purple-200" : getLogTypeColor(log.type))}>
                          {log.text}
                        </span>
                      </div>
                      {log.timestamp && (
                        <span className="text-gray-500 text-xs">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  )
}

