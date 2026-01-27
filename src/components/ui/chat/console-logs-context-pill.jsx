"use client"

import { useState } from "react"
import { Terminal, ChevronDown, ChevronUp, X, Plus, AlertCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { summarizeLogActivity, formatLogsForContext, formatLogsPreview } from "@/lib/utils/console-logs-context"

export default function ConsoleLogsContextPill({ logs, onAddToContext, onDismiss }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!logs || logs.length === 0) return null

  const summary = summarizeLogActivity(logs)
  const preview = formatLogsPreview(logs, 5)

  const handleAddToChat = () => {
    const formatted = formatLogsForContext(logs)
    onAddToContext(formatted)
  }

  return (
    <div className="mb-3 rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
        >
          <Terminal className="h-4 w-4 text-purple-400" />
          <span className="font-medium">Test Session Logs</span>
          <span className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">
            {summary.total}
          </span>
          {summary.errors > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-900/50 text-red-400 rounded text-xs">
              <AlertCircle className="h-3 w-3" />
              {summary.errors}
            </span>
          )}
          {summary.warnings > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-900/50 text-yellow-400 rounded text-xs">
              <AlertTriangle className="h-3 w-3" />
              {summary.warnings}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddToChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add to Chat
          </button>
          <button
            onClick={onDismiss}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded Preview */}
      {isExpanded && (
        <div className="border-t border-slate-700 px-3 py-2">
          <div className="text-xs text-slate-500 mb-2">Preview (most important logs):</div>
          <div className="space-y-1 font-mono text-xs">
            {preview.map((line, idx) => (
              <div
                key={idx}
                className={cn(
                  "px-2 py-1 rounded",
                  line.startsWith('!') && "bg-red-900/30 text-red-300",
                  line.startsWith('?') && "bg-yellow-900/30 text-yellow-300",
                  !line.startsWith('!') && !line.startsWith('?') && "bg-slate-700/50 text-slate-300"
                )}
              >
                {line}
              </div>
            ))}
          </div>
          {logs.length > 5 && (
            <div className="mt-2 text-xs text-slate-500">
              + {logs.length - 5} more logs will be included when added to chat
            </div>
          )}
        </div>
      )}
    </div>
  )
}
