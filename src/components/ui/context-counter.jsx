"use client"

import { AlertTriangle, FileText, Activity } from "lucide-react"
import { useMemo } from "react"
import { validateFile, FILE_VALIDATION_LIMITS } from "@/lib/utils/file-validation"
import { cn } from "@/lib/utils"

/**
 * ContextCounter displays statistics about project files to help prevent context overflow.
 * Shows total lines, characters, and warnings for files exceeding limits.
 *
 * @param {Object} props
 * @param {Array} props.files - Array of file objects with file_path and content
 * @param {string} props.className - Optional className for styling
 */
export default function ContextCounter({ files = [], className }) {
  const stats = useMemo(() => {
    // Filter out asset files (images, etc.) since they're not sent as text context
    const codeFiles = files.filter(f => {
      if (!f?.file_path) return false
      // Skip binary assets
      if (f.isAsset || f.mime_type?.startsWith('image/')) return false
      // Skip common binary file extensions
      const ext = f.file_path.split('.').pop()?.toLowerCase()
      if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'woff', 'woff2', 'ttf', 'eot'].includes(ext)) {
        return false
      }
      return true
    })

    let totalLines = 0
    let totalChars = 0
    const invalidFiles = []

    for (const file of codeFiles) {
      if (!file.content) continue

      const validation = validateFile(file.content)
      totalLines += validation.lineCount
      totalChars += validation.charCount

      if (!validation.isValid) {
        invalidFiles.push({
          name: file.file_path.split('/').pop() || file.file_path,
          path: file.file_path,
          lineCount: validation.lineCount
        })
      }
    }

    return {
      totalFiles: codeFiles.length,
      totalLines,
      totalChars,
      invalidFiles,
      hasWarnings: invalidFiles.length > 0 || totalChars > FILE_VALIDATION_LIMITS.MAX_TOTAL_CHARACTERS
    }
  }, [files])

  if (stats.totalFiles === 0) {
    return null
  }

  return (
    <div className={cn("border-t border-slate-700/50 bg-slate-900/50", className)}>
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Context Stats</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileText className="h-3 w-3" />
            <span>{stats.totalFiles} {stats.totalFiles === 1 ? 'file' : 'files'}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className={cn(
            "px-2 py-1.5 rounded-lg border transition-colors",
            stats.totalLines > FILE_VALIDATION_LIMITS.MAX_LINES_PER_FILE * 2
              ? "bg-orange-900/20 border-orange-500/30"
              : "bg-slate-800/50 border-slate-700/50"
          )}>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total Lines</div>
            <div className={cn(
              "text-sm font-semibold",
              stats.totalLines > FILE_VALIDATION_LIMITS.MAX_LINES_PER_FILE * 2
                ? "text-orange-400"
                : "text-slate-300"
            )}>
              {stats.totalLines.toLocaleString()}
            </div>
          </div>

          <div className={cn(
            "px-2 py-1.5 rounded-lg border transition-colors",
            stats.totalChars > FILE_VALIDATION_LIMITS.MAX_TOTAL_CHARACTERS
              ? "bg-red-900/20 border-red-500/30"
              : "bg-slate-800/50 border-slate-700/50"
          )}>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total Chars</div>
            <div className={cn(
              "text-sm font-semibold",
              stats.totalChars > FILE_VALIDATION_LIMITS.MAX_TOTAL_CHARACTERS
                ? "text-red-400"
                : "text-slate-300"
            )}>
              {(stats.totalChars / 1000).toFixed(1)}K
            </div>
          </div>
        </div>

        {/* Warnings */}
        {stats.invalidFiles.length > 0 && (
          <div className="mt-2 px-2 py-1.5 rounded-lg bg-red-900/20 border border-red-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-red-400 mb-1">
                  {stats.invalidFiles.length} {stats.invalidFiles.length === 1 ? 'file' : 'files'} exceed {FILE_VALIDATION_LIMITS.MAX_LINES_PER_FILE} lines
                </div>
                <div className="space-y-0.5 max-h-20 overflow-y-auto custom-scrollbar">
                  {stats.invalidFiles.map((file, idx) => (
                    <div key={idx} className="text-[10px] text-red-300/80 truncate" title={file.path}>
                      • {file.name} ({file.lineCount} lines)
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {stats.totalChars > FILE_VALIDATION_LIMITS.MAX_TOTAL_CHARACTERS && (
          <div className="mt-2 px-2 py-1.5 rounded-lg bg-red-900/20 border border-red-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-[10px] text-red-300">
                Total context exceeds {FILE_VALIDATION_LIMITS.MAX_TOTAL_CHARACTERS / 1000}K character limit.
                Consider splitting large files or removing unused code.
              </div>
            </div>
          </div>
        )}

        {/* Info hint */}
        {!stats.hasWarnings && (
          <div className="text-[10px] text-slate-500 text-center">
            Files under {FILE_VALIDATION_LIMITS.MAX_LINES_PER_FILE} lines each
          </div>
        )}
      </div>
    </div>
  )
}
