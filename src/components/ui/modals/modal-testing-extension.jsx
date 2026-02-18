"use client"

import React, { useState, useEffect } from "react"
import { X, RefreshCw, ExternalLink, AlertCircle, CheckCircle, Info, Navigation, Monitor, MousePointer, Keyboard, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import SessionTimer from "@/components/ui/timer/session-timer"
import ProgressSpinner from "@/components/ui/loading/progress-spinner"
import ConsoleLogViewer from "@/components/ui/extension-testing/console-log-viewer"

export default function TestModal({ isOpen, onClose, sessionData, onRefresh, isLoading = false, loadingProgress = 0, projectId }) {
  const [sessionStatus, setSessionStatus] = useState("loading")
  const [sessionExpired, setSessionExpired] = useState(false)
  const [loadingStage, setLoadingStage] = useState(0)

  // Reset expired state when a new session opens or modal re-opens with a fresh session
  useEffect(() => {
    if (isOpen && sessionData?.sessionId) {
      setSessionExpired(false)
      console.log("🔄 New test session detected, resetting expired state")
    }
  }, [isOpen, sessionData?.sessionId])

  // Ensure loading transitions restart on each new load or session
  useEffect(() => {
    if (isLoading || sessionData?.sessionId) {
      setLoadingStage(0)
    }
  }, [isLoading, sessionData?.sessionId])

  // Define loading stages for browser initialization
  const loadingStages = [
    {
      title: "setting up browser",
      description: "creating a new browser session for testing your extension"
    },
    {
      title: "installing extension",
      description: "preparing and uploading your extension files to the browser"
    },
    {
      title: "ready for testing",
      description: "your extension is loaded and ready to test!"
    }
  ]

  // Define instruction boxes for each stage
  const instructionBoxes = [
    {
      icon: Monitor,
      iconColor: "blue",
      title: "interactive testing",
      items: [
        "• click and interact naturally",
        "• test on different websites",
        "• use keyboard shortcuts",
        "• type directly in the browser"
      ]
    },
    {
      icon: Eye,
      iconColor: "green",
      title: "extension features",
      items: [
        "• extension is automatically loaded",
        "• test popups and content scripts",
        "• check behavior on different pages",
        "• verify permissions work"
      ]
    },
    {
      icon: Info,
      iconColor: "purple",
      title: "session info",
      items: [
        "• 3-minute session limit",
        "• use \"test extension\" button for automated ai-agent testing",
        "• close when done"
      ]
    }
  ]

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

  // Animate through stages like the original ProgressSpinner
  useEffect(() => {
    if (!isLoading) {
      setLoadingStage(0)
      return
    }

    const interval = setInterval(() => {
      setLoadingStage(prev => {
        if (prev < loadingStages.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 2000) // Progress every 2 seconds

    return () => clearInterval(interval)
  }, [isLoading, loadingStages.length])

  if (!isOpen) return null

  const liveUrl = sessionData?.liveViewUrl || sessionData?.iframeUrl || sessionData?.browserUrl
  

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

            {sessionData && (
              <div className="flex items-center space-x-2 text-sm text-slate-400">
                <span>Session: {sessionData.sessionId?.slice(-8)}</span>
              </div>
            )}
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
            <div className="absolute inset-0 bg-[#0a0a0a] flex items-center justify-center p-8">
              <div className="text-center max-w-4xl w-full">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="w-full bg-neutral-800 rounded-full h-1 mb-3">
                    <div 
                      className="bg-neutral-600 h-1 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${((loadingStage + 1) / loadingStages.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500">
                    {loadingStage + 1} of {loadingStages.length}
                  </p>
                </div>

                {/* Current Stage */}
                <div className="mb-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-700 border-t-neutral-500 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-neutral-300 mb-2">
                    {loadingStages[loadingStage]?.title || "Initializing"}
                  </h3>
                  <p className="text-neutral-500 text-sm">
                    {loadingStages[loadingStage]?.description || "Please wait"}
                  </p>
                </div>

                {/* Dynamic Instructions - Show one box per stage */}
                <div className="space-y-4">
                  <h4 className="font-medium text-neutral-500 text-center text-xs uppercase tracking-wider">tips</h4>
                  <div className="flex justify-center">
                    {instructionBoxes[loadingStage] && (
                      <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-6 max-w-sm w-full">
                        <div className="flex items-center mb-4">
                          <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center mr-4">
                            {React.createElement(instructionBoxes[loadingStage].icon, {
                              className: "h-5 w-5 text-neutral-400"
                            })}
                          </div>
                          <h5 className="font-medium text-neutral-300 text-sm">{instructionBoxes[loadingStage].title}</h5>
                        </div>
                        <ul className="text-sm text-neutral-500 space-y-2 text-left">
                          {instructionBoxes[loadingStage].items.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
