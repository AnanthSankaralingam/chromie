"use client"

import { X, Video, CheckCircle, AlertCircle, Copy, Check } from "lucide-react"
import { useState } from "react"

export default function AITestResultModal({ isOpen, onClose, result }) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !result) return null

  const handleCopyUrl = async () => {
    if (result.videoUrl) {
      try {
        await navigator.clipboard.writeText(result.videoUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Failed to copy URL:', error)
      }
    }
  }

  const handleOpenVideo = () => {
    if (result.videoUrl) {
      window.open(result.videoUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Video className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Test Results</h2>
              <p className="text-sm text-slate-400">Session Recording Available</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-start space-x-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-400">Test Completed Successfully</h3>
              <p className="text-sm text-slate-300 mt-1">{result.message}</p>
            </div>
          </div>

          {/* Task */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Test Task</h3>
            <p className="text-white bg-slate-800/50 p-4 rounded-lg border border-white/5">
              {result.task}
            </p>
          </div>

          {/* Result */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Result</h3>
            <p className="text-white bg-slate-800/50 p-4 rounded-lg border border-white/5">
              {result.result}
            </p>
          </div>

          {/* Video URL */}
          {result.videoUrl && result.recordingStatus === 'completed' ? (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Video Recording</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-3 bg-slate-800/50 rounded-lg border border-white/5">
                  <input
                    type="text"
                    readOnly
                    value={result.videoUrl}
                    className="flex-1 bg-transparent text-slate-300 text-sm outline-none"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="p-2 hover:bg-white/10 rounded transition-colors"
                    title="Copy URL"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </div>
                <button
                  onClick={handleOpenVideo}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/20"
                >
                  <Video className="h-5 w-5" />
                  <span>Watch Test Recording</span>
                </button>
              </div>
            </div>
          ) : result.recordingStatus === 'not_enabled' ? (
            <div className="flex items-start space-x-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-400">Recording Not Enabled</h3>
                <p className="text-sm text-slate-300 mt-1">
                  Video recording was not enabled for this session. This might be a configuration issue. Please contact support or try again.
                </p>
              </div>
            </div>
          ) : result.recordingStatus === 'failed' ? (
            <div className="flex items-start space-x-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-400">Recording Failed</h3>
                <p className="text-sm text-slate-300 mt-1">
                  The video recording failed to process. The test completed successfully, but the recording could not be generated.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-400">Video Still Processing</h3>
                <p className="text-sm text-slate-300 mt-1">
                  {result.note || 'The video recording is still being processed. This can take 1-2 minutes. Try running the test again in a moment to get the video URL.'}
                </p>
              </div>
            </div>
          )}

          {/* Session Info */}
          {result.sessionId && (
            <div className="text-xs text-slate-500 pt-4 border-t border-white/5">
              <span className="font-mono">Session ID: {result.sessionId}</span>
              {result.recordingStatus && (
                <span className="ml-4">Status: <span className="text-purple-400">{result.recordingStatus}</span></span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

