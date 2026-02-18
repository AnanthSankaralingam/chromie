"use client"

/**
 * Inline diff-style code preview for generated files.
 * Shows code with green "added" styling (new file = all additions).
 * Similar to editor diff view with gutter indicators.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import CodeViewer from '@/components/ui/code-editing/code-viewer'

export function FileDiffPreview({ fileName, content, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (!content || content.trim().length === 0) {
    return null
  }

  const lineCount = content.split('\n').length

  return (
    <div className="mt-2 rounded-md overflow-hidden border border-slate-600/50 bg-slate-900/60">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-mono text-slate-300 hover:bg-slate-700/40 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
        )}
        <span className="truncate">{fileName}</span>
        <span className="ml-auto text-slate-500 shrink-0">+{lineCount} lines</span>
      </button>
      {expanded && (
        <div className="border-t border-slate-600/50">
          {/* Diff-style gutter: green bar for "all added" */}
          <div className="flex min-h-0 max-h-48 overflow-auto custom-scrollbar">
            <div className="w-1 flex-shrink-0 bg-green-600/60" aria-hidden />
            <div className="flex-1 min-w-0">
              <CodeViewer
                code={content}
                fileName={fileName}
                className="!m-0 !rounded-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
