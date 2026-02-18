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

// Condensed: show component when present (more specific), otherwise source. One badge per log.
// CHROMIE logs use purple; non-CHROMIE use source color.
function SourceBadge({ source, component, isChromieLog }) {
  const badge = SOURCE_BADGES[source] || { label: source?.split(':')[1]?.toUpperCase() || '?', className: 'bg-gray-500 text-white' }
  const label = component || badge.label
  const badgeClass = isChromieLog ? 'bg-purple-600 text-white' : badge.className
  return (
    <span className={cn("px-1.5 py-0.5 text-xs font-bold rounded flex-shrink-0", badgeClass)}>
      {label}
    </span>
  )
}

// flow=true: no fixed height, no internal scroll — parent container handles scrolling
// light=true: white background instead of dark terminal
export default function ConsoleLogViewer({ sessionId, projectId, isSessionActive, onLogsReady, clearLogsTrigger, flow = false, light = false }) {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('all') // 'all', 'extension'
  const [isPolling, setIsPolling] = useState(false)
  const logsEndRef = useRef(null)
  const pollingInterval = useRef(null)
  const previousLogsRef = useRef([])

  // Auto-scroll to bottom when new logs arrive (only when self-contained, not in flow mode)
  useEffect(() => {
    if (flow) return
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, flow])

  // Clear logs when parent triggers (e.g. starting a new test run)
  useEffect(() => {
    if (clearLogsTrigger != null && clearLogsTrigger > 0) {
      setLogs([])
      previousLogsRef.current = []
    }
  }, [clearLogsTrigger])

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
    if (light) {
      switch (type) {
        case "error":
          return "text-red-600"
        case "warn":
        case "warning":
          return "text-yellow-600"
        case "info":
          return "text-blue-600"
        default:
          return "text-gray-700"
      }
    }
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
    if (filter === 'chromie') return log.isChromieLog
    if (filter === 'extension-only') return log.source?.startsWith('extension:') && !log.isChromieLog
    return true
  })

  // Count by category for filter badges
  const chromieCount = logs.filter(l => l.isChromieLog).length
  const extensionOnlyCount = logs.filter(l => l.source?.startsWith('extension:') && !l.isChromieLog).length

  const headerClasses = light
    ? "flex items-center justify-between px-2 py-1.5 bg-white border border-gray-200 rounded-t-lg"
    : "flex items-center justify-between px-2 py-1.5 bg-gray-800 border-b border-gray-700 rounded-t-lg"
  const headerTextClasses = light ? "text-xs text-gray-600" : "text-xs text-gray-400"
  const countBadgeClasses = light ? "px-1.5 py-0.5 bg-white border border-gray-200 text-gray-700 rounded text-xs" : "px-1.5 py-0.5 bg-gray-700 rounded text-xs"
  const selectClasses = light
    ? "bg-white border border-gray-200 text-gray-700 text-xs rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-300"
    : "bg-gray-700 text-gray-300 text-xs rounded px-1.5 py-0.5 border-none focus:outline-none focus:ring-1 focus:ring-gray-500"
  const contentClasses = light
    ? cn("font-mono text-xs space-y-0.5 bg-white border border-t-0 border-gray-200 p-2 rounded-b-lg overflow-x-auto scroll-area-white", flow ? "" : "flex-1 overflow-y-auto")
    : cn("font-mono text-xs space-y-0.5 bg-gray-900 p-2 rounded-b-lg overflow-x-auto", flow ? "" : "flex-1 overflow-y-auto")
  const emptyStateClasses = light ? "text-gray-500 text-center py-8" : "text-gray-500 text-center py-8"
  const emptyStateSubClasses = light ? "text-xs mt-1 text-gray-500" : "text-xs mt-1 text-gray-600"
  const getLogRowBg = (log) => {
    if (light) return "bg-white"
    if (log.type === "error") return "bg-red-950/40"
    if (log.type === "warn" || log.type === "warning") return "bg-yellow-950/40"
    if (log.type === "info") return "bg-blue-950/40"
    if (log.isChromieLog) return "bg-purple-950/40"
    return "bg-gray-800/40"
  }

  return (
    <div className={cn("flex flex-col", flow ? "" : "h-[240px]", light && "bg-white")}>
      {/* Header */}
      <div className={headerClasses}>
        <div className={cn("flex items-center space-x-2", headerTextClasses)}>
          <Terminal className="h-3 w-3" />
          <span>console</span>
          {isPolling && (
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              <span>live</span>
            </span>
          )}
          <span className={countBadgeClasses}>
            {filteredLogs.length}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Filter Dropdown */}
          <div className="flex items-center space-x-1">
            <Filter className={light ? "h-3 w-3 text-gray-500" : "h-3 w-3 text-gray-500"} />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={selectClasses}
            >
              <option value="all">all ({logs.length})</option>
              <option value="chromie">chromie ({chromieCount})</option>
              <option value="extension-only">extension only ({extensionOnlyCount})</option>
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

      {/* Log Content */}
      <div className={contentClasses}>
        {filteredLogs.length === 0 ? (
          <div className={emptyStateClasses}>
            <Terminal className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p>no console logs yet</p>
            <p className={emptyStateSubClasses}>
              extension logs will appear here once the test starts
            </p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={log.id || index}
              className={cn(
                "px-2 py-1 rounded flex items-start gap-2 min-w-0",
                getLogRowBg(log)
              )}
            >
              {/* Type indicator */}
              <span className={cn(
                "flex-shrink-0 w-4 text-center font-bold",
                getLogTypeColor(log.type)
              )}>
                {getLogTypeIcon(log.type)}
              </span>

              {/* Condensed metadata: single badge + timestamp */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <SourceBadge source={log.source} component={log.component} isChromieLog={log.isChromieLog} />
                {log.timestamp && (
                  <span className={cn("text-xs", light ? "text-gray-500" : "text-gray-600")}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Log text */}
              <span className={cn(
                "flex-1 min-w-0 break-words",
                light && log.isChromieLog ? "text-purple-700" : log.isChromieLog ? "text-purple-200" : getLogTypeColor(log.type)
              )}>
                {String(log.text || '')}
              </span>
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
