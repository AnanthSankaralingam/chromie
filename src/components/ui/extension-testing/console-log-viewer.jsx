"use client"

import { useState, useEffect, useRef } from "react"
import { Terminal, Trash2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Source badge color mapping
const SOURCE_BADGES = {
  'extension:background': { label: 'BG', className: 'bg-blue-600 text-white' },
  'extension:popup': { label: 'POPUP', className: 'bg-green-600 text-white' },
  'extension:sidepanel': { label: 'PANEL', className: 'bg-cyan-600 text-white' },
  'extension:content': { label: 'CONTENT', className: 'bg-orange-600 text-white' },
  'browser:page': { label: 'PAGE', className: 'bg-gray-600 text-white' },
}

function SourceBadge({ source }) {
  const badge = SOURCE_BADGES[source] || { label: source?.split(':')[1]?.toUpperCase() || '?', className: 'bg-gray-500 text-white' }
  return (
    <span className={cn("px-1.5 py-0.5 text-xs font-bold rounded flex-shrink-0", badge.className)}>
      {badge.label}
    </span>
  )
}

export default function ConsoleLogViewer({ sessionId, projectId, isSessionActive, onLogsReady }) {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('all') // 'all', 'extension'
  const [isPolling, setIsPolling] = useState(false)
  const logsEndRef = useRef(null)
  const pollingInterval = useRef(null)
  const previousLogsRef = useRef([])

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  // Notify parent when logs are ready
  useEffect(() => {
    if (onLogsReady && logs.length > 0) {
      onLogsReady(logs)
    }
  }, [logs, onLogsReady])

  // Fetch logs from API
  const fetchLogs = async () => {
    if (!sessionId || !projectId || !isSessionActive) return

    try {
      const response = await fetch(`/api/projects/${projectId}/test-extension/console-logs?sessionId=${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.logs && Array.isArray(data.logs)) {
          setLogs(data.logs)
          previousLogsRef.current = data.logs
        }
      }
    } catch (error) {
      console.error("Failed to fetch console logs:", error)
    }
  }

  // Start/stop polling based on session status (always poll when active, not just when expanded)
  useEffect(() => {
    if (isSessionActive) {
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
  }, [isSessionActive, sessionId, projectId])

  const clearLogs = () => {
    setLogs([])
  }

  // Get current logs for export
  const getCurrentLogs = () => {
    return previousLogsRef.current.length > 0 ? previousLogsRef.current : logs
  }

  const getLogTypeColor = (type) => {
    switch (type) {
      case "error":
        return "text-red-400"
      case "warn":
      case "warning":
        return "text-yellow-400"
      case "info":
        return "text-blue-400"
      default:
        return "text-gray-300"
    }
  }

  const getLogTypeIcon = (type) => {
    switch (type) {
      case "error":
        return "!"
      case "warn":
      case "warning":
        return "?"
      case "info":
        return "i"
      default:
        return ">"
    }
  }

  // Filter logs based on selected filter
  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true
    if (filter === 'extension') return log.source?.startsWith('extension:')
    return true
  })

  // Count by category for filter badges
  const extensionCount = logs.filter(l => l.source?.startsWith('extension:')).length

  return (
    <div className="flex flex-col h-[240px]">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-gray-800 border-b border-gray-700 rounded-t-lg">
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <Terminal className="h-3 w-3" />
          <span>console</span>
          {isPolling && (
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              <span>live</span>
            </span>
          )}
          <span className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">
            {filteredLogs.length}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Filter Dropdown */}
          <div className="flex items-center space-x-1">
            <Filter className="h-3 w-3 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-700 text-gray-300 text-xs rounded px-1.5 py-0.5 border-none focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              <option value="all">all ({logs.length})</option>
              <option value="extension">extension ({extensionCount})</option>
            </select>
          </div>

          {logs.length > 0 && (
            <Button
              onClick={clearLogs}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-500 hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Log Content - Fixed height, always visible */}
      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-0.5 bg-gray-900 p-2 rounded-b-lg">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            <Terminal className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p>no console logs yet</p>
            <p className="text-xs mt-1 text-gray-600">
              extension logs will appear here once the test starts
            </p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={log.id || index}
              className={cn(
                "px-2 py-1 rounded flex items-start gap-2",
                log.type === "error" && "bg-red-950/40",
                log.type === "warn" && "bg-yellow-950/40",
                log.type === "info" && "bg-blue-950/40",
                log.isChromieLog && "bg-purple-950/40",
                !log.type && !log.isChromieLog && "bg-gray-800/40"
              )}
            >
              {/* Type indicator */}
              <span className={cn(
                "flex-shrink-0 w-4 text-center font-bold",
                getLogTypeColor(log.type)
              )}>
                {getLogTypeIcon(log.type)}
              </span>

              {/* Source badge */}
              <SourceBadge source={log.source} />

              {/* CHROMIE badge if applicable */}
              {log.isChromieLog && (
                <span className="px-1.5 py-0.5 bg-purple-600 text-white text-xs font-bold rounded flex-shrink-0">
                  CHROMIE
                </span>
              )}

              {/* Component if applicable */}
              {log.component && (
                <span className="text-purple-300 font-semibold flex-shrink-0 text-xs">
                  {log.component}
                </span>
              )}

              {/* Log text */}
              <span className={cn(
                "flex-1",
                log.isChromieLog ? "text-purple-200" : getLogTypeColor(log.type)
              )}>
                {String(log.text || '')}
              </span>

              {/* Timestamp */}
              {log.timestamp && (
                <span className="text-gray-600 text-xs flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  )
}

// Export a function to get the current logs for parent components
ConsoleLogViewer.getCurrentLogs = () => {
  // This is a placeholder - the actual implementation uses the ref
  return []
}
