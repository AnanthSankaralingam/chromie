"use client"

import React, { useState, useEffect } from "react"
import { X, RefreshCw, ExternalLink, AlertCircle, CheckCircle, Monitor, Play, Navigation, Info, MousePointer, Keyboard, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import SessionTimer from "@/components/ui/timer/session-timer"
import BrowserTestingTutorial from "./browser-testing-tutorial"
import ProgressSpinner from "@/components/ui/loading/progress-spinner"
import ConsoleLogViewer from "./console-log-viewer"

export default function SideBySideTestModal({
  isOpen,
  onClose,
  sessionData,
  onRefresh,
  isLoading = false,
  loadingProgress = 0,
  projectId,
  extensionFiles = []
}) {
  const [sessionStatus, setSessionStatus] = useState("loading")
  const [isRunningHyperAgent, setIsRunningHyperAgent] = useState(false)
  const [hyperAgentResult, setHyperAgentResult] = useState(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigationError, setNavigationError] = useState(null)
  const [loadingStage, setLoadingStage] = useState(0)

  // Reset expired state when a new session opens or modal re-opens with a fresh session
  useEffect(() => {
    if (isOpen && sessionData?.sessionId) {
      setSessionExpired(false)
      setNavigationError(null)
      setUrlInput("")
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
        "• use \"test extension\" button for automated ai-agent testing",
        "• close when done"
      ]
    }
  ]

  // Store session data for the embed page to access
  useEffect(() => {
    if (sessionData && sessionData.sessionId) {
      sessionStorage.setItem('session_' + sessionData.sessionId, JSON.stringify(sessionData))
    }
  }, [sessionData])

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
  const error = sessionData?.error



  // Handle session expiry - just show warning, don't auto-close
  const handleSessionExpire = () => {
    setSessionExpired(true)
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
      } else {
        setNavigationError(result.error || "Navigation failed")
      }
    } catch (error) {
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

  // Handle HyperAgent test execution
  const handleRunHyperAgentTest = async () => {
    if (!sessionData?.sessionId || !projectId) {
      console.error("Missing session ID or project ID for HyperAgent test")
      return
    }

    setIsRunningHyperAgent(true)
    setHyperAgentResult(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/hyperagent-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "HyperAgent test failed")
      }

      setHyperAgentResult(result)
    } catch (error) {
      setHyperAgentResult({
        success: false,
        error: error.message,
      })
    } finally {
      setIsRunningHyperAgent(false)
    }
  }

  // Get viewport dimensions from sessionData, with fallbacks
  const viewportWidth = sessionData?.browserInfo?.viewport?.width || 1920;
  const viewportHeight = sessionData?.browserInfo?.viewport?.height || 1080;

  // Estimate extra height for modal header and footer
  // Header: h-14 (56px)
  // Footer: p-4 (16px top + 16px bottom) + content height (e.g., 18px) = ~50px
  const modalExtraHeight = 56 + 50; // Total ~106px

  // Log dimensions for debugging



  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div
        className="bg-background rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border/50"
        style={{
          width: `${viewportWidth}px`,
          height: `${viewportHeight + modalExtraHeight}px`,
          minWidth: '320px',
          minHeight: '200px',
          maxWidth: '95vw',
          maxHeight: '95vh',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between flex-shrink-0 bg-card/50 backdrop-blur-md">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ExternalLink
                className={cn(
                  "h-5 w-5",
                  sessionData?.status === 'active' ? "text-green-500" : "text-muted-foreground"
                )}
              />
              <h2 className="text-lg font-bold text-foreground">Extension Test Environment</h2>
            </div>

            {sessionData && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
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
              <Button variant="ghost" size="sm" onClick={onRefresh} className="text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* URL Navigation Section */}
        {sessionData && sessionData.sessionId && !sessionExpired && (
          <div className="px-6 py-4 border-b border-border/50 bg-secondary/20">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Paste any URL, search term, or content to open in new tab..."
                  className="w-full px-4 py-2 bg-card border border-border/50 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm"
                  disabled={isNavigating}
                />
                {navigationError && (
                  <p className="text-destructive text-xs mt-1 ml-1">{navigationError}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="group relative">
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 border border-border">
                    Paste any URL, search term, or content here. It will open in a new tab automatically.
                  </div>
                </div>
                <Button
                  onClick={handleNavigate}
                  disabled={!urlInput.trim() || isNavigating}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isNavigating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  {isNavigating ? "Opening..." : "Open in New Tab"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Single Browser Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center space-x-2 flex-shrink-0">
            <Monitor className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Live Browser Session</span>
          </div>

          <div className="flex-1 relative overflow-hidden">
            {sessionExpired ? (
              <div className="absolute inset-0 flex items-center justify-center bg-yellow-50">
                <div className="text-center max-w-md">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Session Time Limit Reached</h3>
                  <p className="text-gray-600 mb-4">This session has reached its time limit, but you can continue using it. Close the modal when you're done testing.</p>
                  <Button
                    onClick={handleClose}
                    className="bg-gradient-to-r from-black to-gray-800 hover:from-gray-900 hover:to-black text-white"
                  >
                    Close Session
                  </Button>
                </div>
              </div>
            ) : isLoading ? (
              <div className="absolute inset-0 bg-card flex items-center justify-center p-8">
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
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {loadingStages[loadingStage]?.title || "Initializing..."}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {loadingStages[loadingStage]?.description || "Please wait while we prepare your testing environment"}
                    </p>
                  </div>

                  {/* Dynamic Instructions - Show one box per stage */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground text-center">testing tips</h4>
                    <div className="flex justify-center">
                      {instructionBoxes[loadingStage] && (
                        <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-500 max-w-sm w-full">
                          <div className="flex items-center mb-4">
                            <div className={`w-10 h-10 bg-${instructionBoxes[loadingStage].iconColor}-100 rounded-lg flex items-center justify-center mr-4`}>
                              {React.createElement(instructionBoxes[loadingStage].icon, {
                                className: `h-5 w-5 text-${instructionBoxes[loadingStage].iconColor}-600`
                              })}
                            </div>
                            <h5 className="font-medium text-foreground text-lg">{instructionBoxes[loadingStage].title}</h5>
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
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Failed to load test environment</h3>
                  <p className="text-gray-600 mb-4">
                    There was an error setting up the browser testing environment. Please try again.
                  </p>
                  <Button onClick={onRefresh} disabled={isLoading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            ) : sessionData?.iframeUrl ? (
              <iframe
                src={sessionData.iframeUrl}
                className="absolute inset-0 w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
                allow="clipboard-read; clipboard-write; autoplay; fullscreen; camera; microphone"
                loading="eager"
                title="BrowserBase Session"
                style={{
                  transform: 'translateZ(0)',
                  willChange: 'transform',
                  backfaceVisibility: 'hidden'
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No test session available</h3>
                  <p className="text-gray-600">Click the Test button to start a new testing session.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-secondary/20">
          <div className="flex items-center justify-between gap-4">
            {/* Console Log Viewer on the Left */}
            <ConsoleLogViewer
              sessionId={sessionData?.sessionId}
              projectId={projectId}
              isSessionActive={!sessionExpired && !isLoading && sessionData?.sessionId}
            />

            {/* Right Side - Status and Test Button */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              {/* Extension Status */}
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Extension loaded</span>
                </div>
                {sessionData?.browserInfo && (
                  <span>
                    {sessionData.browserInfo.viewport.width + 'x' + sessionData.browserInfo.viewport.height}
                  </span>
                )}
              </div>

              {/* HyperAgent Test Results */}
              {hyperAgentResult && (
                <div className={cn(
                  "flex items-center space-x-1 text-sm",
                  hyperAgentResult.success ? "text-green-600" : "text-destructive"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    hyperAgentResult.success ? "bg-green-500" : "bg-destructive"
                  )} />
                  <span>
                    {hyperAgentResult.success ? "Test passed" : "Test failed"}
                  </span>
                </div>
              )}

              {/* HyperAgent Test Button */}
              <Button
                onClick={handleRunHyperAgentTest}
                disabled={isRunningHyperAgent || !sessionData?.sessionId}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isRunningHyperAgent ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-foreground border-t-transparent mr-2" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-2 fill-current" />
                    Test Extension
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}