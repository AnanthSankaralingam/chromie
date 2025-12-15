"use client"

import { X, Github, AlertCircle, CheckCircle2 } from "lucide-react"
import { createPortal } from "react-dom"

export default function GithubExportStatusModal({
  isOpen,
  onClose,
  status = "idle", // 'idle' | 'success' | 'error'
  message = "",
  repoUrl = "",
  repoName = "",
}) {
  if (!isOpen) return null

  const isSuccess = status === "success"
  const isError = status === "error"

  const handleOpenRepo = () => {
    if (repoUrl) {
      window.open(repoUrl, "_blank")
    }
  }

  const content = (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-slate-900/95 border border-slate-700 rounded-xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
            {isSuccess ? (
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            ) : isError ? (
              <AlertCircle className="h-6 w-6 text-red-400" />
            ) : (
              <Github className="h-6 w-6 text-slate-200" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {isSuccess ? "Exported to GitHub" : isError ? "GitHub Export Failed" : "GitHub Export"}
            </h2>
            {repoName && isSuccess && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Repository: <span className="font-mono">{repoName}</span>
              </p>
            )}
          </div>
        </div>

        {message && (
          <p className={`text-sm mb-4 ${isError ? "text-red-300" : "text-slate-200"}`}>
            {message}
          </p>
        )}

        <div className="flex justify-end space-x-2 pt-2">
          {isSuccess && repoUrl && (
            <button
              onClick={handleOpenRepo}
              className="inline-flex items-center px-3 py-2 rounded-md bg-slate-800 text-slate-100 text-sm hover:bg-slate-700 transition-colors"
            >
              <Github className="h-4 w-4 mr-2" />
              Open on GitHub
            </button>
          )}
          <button
            onClick={onClose}
            className="inline-flex items-center px-3 py-2 rounded-md bg-slate-800/80 text-slate-200 text-sm hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === "undefined") {
    return content
  }

  return createPortal(content, document.body)
}


