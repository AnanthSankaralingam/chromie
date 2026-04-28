"use client"

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react"
import { X, RefreshCw, ExternalLink, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import SessionTimer from "@/components/ui/timer/session-timer"
import { nextLoadingEducationIndex } from "@/lib/utils/loading-education-index"
import { buildBrowserTestLoadingArrays } from "@/lib/utils/extension-loading-messages"
import BrowserTestLoadingOverlay from "@/components/ui/extension-testing/browser-test-loading-overlay"
import ConsoleLogViewer from "@/components/ui/extension-testing/console-log-viewer"

export default function TestModal({
  isOpen,
  onClose,
  sessionData,
  onRefresh,
  isLoading = false,
  loadingProgress = 0,
  projectId,
  extensionFiles = [],
}) {
  const [sessionStatus, setSessionStatus] = useState("loading")
  const [sessionExpired, setSessionExpired] = useState(false)
  const [loadingStage, setLoadingStage] = useState(0)
  const loadingOverlaySessionRef = useRef(false)

  const { loadingStages, instructionBoxes } = useMemo(
    () => buildBrowserTestLoadingArrays(extensionFiles, "embed"),
    [extensionFiles]
  )

  // Reset expired state when a new session opens or modal re-opens with a fresh session
  useEffect(() => {
    if (isOpen && sessionData?.sessionId) {
      setSessionExpired(false)
    }
  }, [isOpen, sessionData?.sessionId])

  // Store session data for the embed page to access
  useEffect(() => {
    if (sessionData && sessionData.sessionId) {
      sessionStorage.setItem(`session_${sessionData.sessionId}`, JSON.stringify(sessionData))
    }
  }, [sessionData])

  useEffect(() => {
    if (isOpen && sessionData) {
      setSessionStatus("ready")
    }
  }, [isOpen, sessionData])

  const liveUrl = sessionData?.liveViewUrl || sessionData?.iframeUrl || sessionData?.browserUrl
  const showLoadingOverlay = isLoading || (Boolean(isOpen && sessionData && !liveUrl))

  useLayoutEffect(() => {
    if (!showLoadingOverlay) {
      loadingOverlaySessionRef.current = false
      return
    }
    if (loadingStages.length === 0) return
    if (!loadingOverlaySessionRef.current) {
      loadingOverlaySessionRef.current = true
      setLoadingStage(nextLoadingEducationIndex(loadingStages.length))
    }
  }, [showLoadingOverlay, loadingStages.length])

  if (!isOpen) return null

  

  // Handle session expiry - just show warning, don't auto-close
  const handleSessionExpire = () => {
    setSessionExpired(true)
    // Don't auto-close modal - let user manually close when ready
  }

  // Handle cleanup when modal is closed
  const handleClose = () => {
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div className="fixed inset-4 bg-slate-800/95 border border-slate-700 rounded-lg shadow-2xl flex flex-col backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-600">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  sessionStatus === "ready" && "bg-green-400",
                  sessionStatus === "loading" && "bg-yellow-400 animate-pulse",
                  sessionStatus === "error" && "bg-red-400",
                )}
              />
              <h2 className="text-lg font-semibold text-white">Extension Test Environment</h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Session Timer */}
            {sessionData?.expiresAt && !sessionExpired && (
              <SessionTimer 
                expiresAt={sessionData.expiresAt}
                onExpire={handleSessionExpire}
                warningThreshold={30}
              />
            )}

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handleClose} className="text-slate-400 hover:text-white hover:bg-slate-700">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {sessionExpired ? (
            <div className="absolute inset-0 flex items-center justify-center bg-yellow-500/10">
              <div className="text-center max-w-md">
                <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Session Time Limit Reached</h3>
                <p className="text-slate-300 mb-4">This session has reached time limit, but you can continue using it. Close the modal when you're done testing.</p>
                <Button
                  onClick={handleClose}
                  className="bg-gradient-to-r from-black to-gray-800 hover:from-gray-900 hover:to-black text-white"
                >
                  Close Session
                </Button>
              </div>
            </div>
          ) : isLoading || (isOpen && sessionData && !liveUrl) ? (
            <BrowserTestLoadingOverlay
              stageTitle={loadingStages[loadingStage]?.title ?? "initializing"}
              tip={instructionBoxes[loadingStage]}
            />
          ) : liveUrl ? (
            <iframe
              src={liveUrl}
              className="absolute inset-0 w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts"
              allow="clipboard-read; clipboard-write"
              title="Browserbase Live View"
            />
          ) : sessionStatus === "error" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-700/50">
              <div className="text-center max-w-md">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Failed to load test environment</h3>
                <p className="text-slate-300 mb-4">
                  There was an error setting up the browser testing environment. Please try again.
                </p>
                <Button onClick={onRefresh} disabled={isLoading} className="bg-gradient-to-r from-black to-gray-800 hover:from-gray-900 hover:to-black text-white">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-700/50">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No test session available</h3>
                <p className="text-slate-300">Click the Test button to start a new testing session.</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions Panel */}
        {sessionStatus === "ready" && sessionData && (
          <div className="p-4 border-t border-slate-600 bg-blue-500/10">
            <div className="flex items-start space-x-3">
              {/* //TODO add instructions/render html */}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-600 bg-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-slate-300">
              <ConsoleLogViewer
                sessionId={sessionData?.sessionId}
                projectId={projectId}
                isSessionActive={sessionStatus === "ready" && !sessionExpired}
              />
            </div>
            <div className="flex items-center space-x-4 text-sm text-slate-300">
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Extension loaded</span>
              </div>
              {sessionData?.browserInfo && (
                <span>
                  {sessionData.browserInfo.viewport.width}x{sessionData.browserInfo.viewport.height}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
