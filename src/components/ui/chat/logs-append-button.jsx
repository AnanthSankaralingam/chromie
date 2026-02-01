"use client"

import { useState } from "react"
import { ScrollText } from "lucide-react"
import { summarizeLogActivity, formatLogsPreview } from "@/lib/utils/console-logs-context"
import { cn } from "@/lib/utils"

export default function LogsAppendButton({ logs, onAppend, disabled }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const summary = summarizeLogActivity(logs)
  const hasErrors = summary.errors > 0

  return (
    <div className="relative">
      <button
        onClick={onAppend}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "relative rounded-full px-4 py-3 transition-colors flex items-center gap-2",
          disabled
            ? "bg-slate-700 opacity-50 cursor-not-allowed"
            : "bg-slate-700 hover:bg-slate-600"
        )}
        aria-label="Append test logs to message"
      >
        <span className="text-white text-[11px] font-medium">Logs</span>

        {/* Error indicator */}
        {hasErrors && !disabled && (
          <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}

        {/* Log count badge */}
        {!disabled && (
          <div className="absolute -top-1 -right-1 bg-slate-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {summary.total > 99 ? '99+' : summary.total}
          </div>
        )}
      </button>

      {/* Custom tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 whitespace-nowrap">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg px-3 py-2">
            <div className="text-xs text-slate-200">
              Append logs from your last test as context
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
            <div className="border-8 border-transparent border-t-slate-800"></div>
          </div>
        </div>
      )}
    </div>
  )
}
