"use client"

import React, { useState, useEffect } from "react"
import { X, RefreshCw, ExternalLink, AlertCircle, CheckCircle, Info, Navigation, Monitor, MousePointer, Keyboard, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import SessionTimer from "@/components/ui/timer/session-timer"
import ProgressSpinner from "@/components/ui/loading/progress-spinner"

export default function TestModal({ isOpen, onClose, sessionData, onRefresh, isLoading = false, loadingProgress = 0, projectId }) {
  const [sessionStatus, setSessionStatus] = useState("loading")
  const [sessionExpired, setSessionExpired] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigationError, setNavigationError] = useState(null)
  const [loadingStage, setLoadingStage] = useState(0)

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
      icon: Navigation,
      iconColor: "blue",
      title: "navigation & testing",
      items: [
        "• use url input to navigate",
        "• click and interact naturally",
        "• test on different websites",
        "• use keyboard shortcuts"
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
        "• use \"test extension\" button for ai-powered testing",
        "• close when done"
      ]
    }
  ]

  // Store session data for the embed page to access
  useEffect(() => {
    if (sessionData && sessionData.sessionId) {
      console.log('Storing session data:', sessionData)
      sessionStorage.setItem(`session_${sessionData.sessionId}`, JSON.stringify(sessionData))
    }
  }, [sessionData])

  useEffect(() => {
    console.log("TestModal received sessionData:", sessionData)
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

  console.log("TestModal render - isOpen:", isOpen, "sessionData:", sessionData, "isLoading:", isLoading)
  if (!isOpen) return null

  const liveUrl = sessionData?.liveViewUrl || sessionData?.iframeUrl || sessionData?.browserUrl
  console.log("TestModal liveUrl:", liveUrl, "sessionData keys:", sessionData ? Object.keys(sessionData) : null)
  console.log("URL input should be visible:", sessionData && sessionData.sessionId)

  // Handle session expiry - just show warning, don't auto-close
  const handleSessionExpire = () => {
    setSessionExpired(true)
    console.log("⏰ Session timer expired - showing warning but keeping session alive")
    // Don't auto-close modal - let user manually close when ready
  }

  // Handle cleanup when modal is closed
  const handleClose = () => {
    onClose()
  }

  // Handle URL navigation
  const handleNavigate = async () => {
    if (!urlInput.trim() || !sessionData?.sessionId || !projectId) {
      setNavigationError("Missing URL, session, or project ID")
      return
    }

    setIsNavigating(true)
    setNavigationError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/test-extension/navigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          url: urlInput.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        setUrlInput("") // Clear input on success
        console.log("Navigation successful:", result)
      } else {
        setNavigationError(result.error || "Navigation failed")
      }
    } catch (error) {
      console.error("Navigation error:", error)
      setNavigationError("Failed to navigate to URL")
    } finally {
      setIsNavigating(false)
    }
  }

  // Handle Enter key in URL input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isNavigating) {
      handleNavigate()
    }
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

        {/* URL Navigation Section */}
        {sessionData && sessionData.sessionId && !sessionExpired && (
          <div className="p-4 border-b border-slate-600 bg-slate-700/30">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Paste URL to navigate..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isNavigating}
                />
                {navigationError && (
                  <p className="text-red-400 text-xs mt-1">{navigationError}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="group relative">
                  <Info className="h-4 w-4 text-slate-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    You cannot directly paste into the testing browser from your local clipboard, so paste URLs here to navigate.
                  </div>
                </div>
                <Button
                  onClick={handleNavigate}
                  disabled={!urlInput.trim() || isNavigating}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isNavigating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  {isNavigating ? "Navigating..." : "Navigate"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 relative">
          {sessionExpired ? (
            <div className="absolute inset-0 flex items-center justify-center bg-yellow-500/10">
              <div className="text-center max-w-md">
                <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Session Time Limit Reached</h3>
                <p className="text-slate-300 mb-4">This session has reached its 1-minute limit, but you can continue using it. Close the modal when you're done testing.</p>
                <Button
                  onClick={handleClose}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                >
                  Close Session
                </Button>
              </div>
            </div>
          ) : isLoading || (isOpen && sessionData && !liveUrl) ? (
            <div className="absolute inset-0 bg-white flex items-center justify-center p-8">
              <div className="text-center max-w-4xl w-full">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${((loadingStage + 1) / loadingStages.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    {loadingStage + 1} of {loadingStages.length} steps
                  </p>
                </div>

                {/* Current Stage */}
                <div className="mb-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {loadingStages[loadingStage]?.title || "Initializing..."}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {loadingStages[loadingStage]?.description || "Please wait while we prepare your testing environment"}
                  </p>
                </div>

                {/* Dynamic Instructions - Show one box per stage */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 text-center">testing tips</h4>
                  <div className="flex justify-center">
                    {instructionBoxes[loadingStage] && (
                      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-500 max-w-sm w-full">
                        <div className="flex items-center mb-4">
                          <div className={`w-10 h-10 bg-${instructionBoxes[loadingStage].iconColor}-100 rounded-lg flex items-center justify-center mr-4`}>
                            {React.createElement(instructionBoxes[loadingStage].icon, {
                              className: `h-5 w-5 text-${instructionBoxes[loadingStage].iconColor}-600`
                            })}
                          </div>
                          <h5 className="font-medium text-gray-900 text-lg">{instructionBoxes[loadingStage].title}</h5>
                        </div>
                        <ul className="text-base text-gray-600 space-y-2 text-left">
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
                <Button onClick={onRefresh} disabled={isLoading} className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white">
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
