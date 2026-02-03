"use client"

import { useState, useEffect } from "react"
import { Play, Calendar, Video, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export default function TestingReplaysModal({ isOpen, onClose, projectId }) {
  const [replays, setReplays] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReplay, setSelectedReplay] = useState(null)
  const [error, setError] = useState(null)

  const fetchReplays = async () => {
    if (!projectId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/testing-replays`)

      if (!response.ok) {
        throw new Error("Failed to fetch testing replays")
      }

      const data = await response.json()
      setReplays(data.replays || [])
    } catch (err) {
      console.error("Error fetching replays:", err)
      setError(err.message || "Failed to load testing replays")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && projectId) {
      fetchReplays()
    } else if (!isOpen) {
      setReplays([])
      setSelectedReplay(null)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId])

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date"
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTestTypeLabel = (type) => {
    const labels = {
      ai: "AI Test",
      puppeteer: "Puppeteer Test",
      hyperagent: "HyperAgent Test",
    }
    return labels[type] || type
  }

  const getTestTypeColor = (type) => {
    const colors = {
      ai: "text-orange-400",
      puppeteer: "text-emerald-400",
      hyperagent: "text-blue-400",
    }
    return colors[type] || "text-slate-400"
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="sm:max-w-6xl w-full sm:h-[80vh] max-h-[90dvh] bg-slate-900 border-slate-700 text-slate-50 flex flex-col overflow-hidden p-0"
      >
        <DialogHeader className="border-b border-slate-800 px-6 py-4">
          <DialogTitle className="text-xl font-semibold text-white">
            Testing Replays
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            View and playback past automated test recordings.
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Replay List */}
          <div className="w-80 border-r border-slate-800 overflow-y-auto bg-slate-950/60">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-red-400">{error}</p>
                <button
                  onClick={fetchReplays}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  Retry
                </button>
              </div>
            ) : replays.length === 0 ? (
              <div className="p-6 text-center">
                <Video className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No testing replays found</p>
                <p className="text-sm text-slate-500 mt-2">Run tests to create replays</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {replays.map((replay) => (
                  <button
                    key={replay.id}
                    onClick={() => setSelectedReplay(replay)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedReplay?.id === replay.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-700 bg-slate-800/50 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`text-sm font-medium ${getTestTypeColor(replay.test_type)}`}>
                        {getTestTypeLabel(replay.test_type)}
                      </span>
                      {replay.video_url && (
                        <Video className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(replay.created_at)}</span>
                    </div>
                    {replay.test_result?.success !== undefined && (
                      <div className={`text-xs mt-1 ${
                        replay.test_result.success ? "text-green-400" : "text-red-400"
                      }`}>
                        {replay.test_result.success ? "✓ Passed" : "✗ Failed"}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Video Player */}
          <div className="flex-1 flex flex-col bg-slate-900">
            {selectedReplay ? (
              <>
                <div className="px-6 py-4 border-b border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {getTestTypeLabel(selectedReplay.test_type)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(selectedReplay.created_at)}</span>
                    </div>
                    {selectedReplay.test_result?.success !== undefined && (
                      <div className={`${
                        selectedReplay.test_result.success ? "text-green-400" : "text-red-400"
                      }`}>
                        {selectedReplay.test_result.success ? "✓ Passed" : "✗ Failed"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  {selectedReplay.video_url ? (
                    <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                      {selectedReplay.video_url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) ? (
                        <video
                          src={selectedReplay.video_url}
                          controls
                          className="w-full h-auto max-h-[70vh]"
                          style={{ display: "block" }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <iframe
                          src={selectedReplay.video_url}
                          className="w-full h-[70vh] border-0"
                          title="Test Recording Video"
                          allow="autoplay; encrypted-media"
                          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        />
                      )}
                    </div>
                  ) : selectedReplay.live_url ? (
                    <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                      <iframe
                        src={selectedReplay.live_url}
                        className="w-full h-[70vh] border-0"
                        title="Live Browser View"
                        allow="autoplay; encrypted-media"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-12">
                      <Video className="h-16 w-16 text-slate-600 mb-4" />
                      <p className="text-slate-400 mb-2">No video recording available</p>
                      <p className="text-sm text-slate-500">
                        This test run did not include video recording
                      </p>
                    </div>
                  )}

                  {/* Test Result Details */}
                  {selectedReplay.test_result && (
                    <div className="mt-6 p-4 bg-slate-800/60 rounded-lg border border-slate-700">
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">Test Details</h4>
                      {selectedReplay.test_result.message && (
                        <p className="text-sm text-slate-400 mb-2">
                          {selectedReplay.test_result.message}
                        </p>
                      )}
                      {selectedReplay.test_result.result && (
                        <div className="mt-3">
                          <p className="text-xs text-slate-500 mb-1">Result:</p>
                          <pre className="text-xs text-slate-300 bg-slate-900 p-3 rounded overflow-x-auto">
                            {typeof selectedReplay.test_result.result === 'string' 
                              ? selectedReplay.test_result.result 
                              : JSON.stringify(selectedReplay.test_result.result, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedReplay.test_result.logAnalysis && (
                        <div className="mt-3 text-xs text-slate-400">
                          <p>
                            Errors: {selectedReplay.test_result.logAnalysis.errorCount || 0} | 
                            Warnings: {selectedReplay.test_result.logAnalysis.warningCount || 0} | 
                            Total Logs: {selectedReplay.test_result.logAnalysis.totalLogs || 0}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-12">
                <Play className="h-16 w-16 text-slate-600 mb-4" />
                <p className="text-slate-400 mb-2">Select a replay to view</p>
                <p className="text-sm text-slate-500">
                  Choose a test replay from the list to watch the recording
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
