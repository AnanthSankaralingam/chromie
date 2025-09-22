"use client"

import { useState, useEffect } from "react"
import { X, RefreshCw, ExternalLink, AlertCircle, CheckCircle, Monitor, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import SessionTimer from "@/components/ui/timer/session-timer"
import BrowserTestingTutorial from "./browser-testing-tutorial"

export default function SideBySideTestModal({ 
  isOpen, 
  onClose, 
  sessionData, 
  onRefresh, 
  isLoading = false,
  projectId,
  extensionFiles = []
}) {
  const [sessionStatus, setSessionStatus] = useState("loading")
  const [isRunningHyperAgent, setIsRunningHyperAgent] = useState(false)
  const [hyperAgentResult, setHyperAgentResult] = useState(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  // Store session data for the embed page to access
  useEffect(() => {
    if (sessionData && sessionData.sessionId) {
      console.log('Storing session data:', sessionData)
      sessionStorage.setItem('session_' + sessionData.sessionId, JSON.stringify(sessionData))
    }
  }, [sessionData])

  if (!isOpen) return null

  const liveUrl = sessionData?.liveViewUrl || sessionData?.iframeUrl || sessionData?.browserUrl
  const error = sessionData?.error

  // Handle session expiry
  const handleSessionExpire = () => {
    setSessionExpired(true)
    // Auto-close modal after a brief delay to show expiry message
    setTimeout(() => {
      handleClose()
    }, 2000)
  }

  // Handle cleanup when modal is closed
  const handleClose = () => {
    console.log("🚪 Side-by-side test modal closing, triggering cleanup")
    onClose()
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
      console.log("🤖 Starting HyperAgent test execution")
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

      console.log("✅ HyperAgent test completed:", result)
      setHyperAgentResult(result)
    } catch (error) {
      console.error("❌ HyperAgent test error:", error)
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
  console.log('Modal dimensions:', {
    viewportWidth,
    viewportHeight,
    modalExtraHeight,
    totalHeight: viewportHeight + modalExtraHeight,
    sessionData: sessionData?.browserInfo
  })


  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
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
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ExternalLink 
                className={cn(
                  "h-5 w-5", 
                  sessionData?.status === 'active' ? "text-green-600" : "text-gray-400"
                )}
              />
              <h2 className="text-lg font-semibold text-gray-900">Extension Test Environment</h2>
            </div>

            {sessionData && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
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
              <Button variant="ghost" size="sm" onClick={onRefresh} className="text-gray-600 hover:text-gray-900">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-600 hover:text-gray-900">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content - Single Browser Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center space-x-2 flex-shrink-0">
            <Monitor className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Live Browser Session</span>
          </div>
          
          <div className="flex-1 relative overflow-hidden">
            {sessionExpired ? (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Session Expired</h3>
                  <p className="text-gray-600">This session has reached its 1-minute limit and will close automatically.</p>
                </div>
              </div>
            ) : isLoading ? (
              <BrowserTestingTutorial />
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load test environment</h3>
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
                sandbox="allow-same-origin allow-scripts"
                allow="clipboard-read; clipboard-write"
                title="BrowserBase Session"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No test session available</h3>
                  <p className="text-gray-600">Click the Test button to start a new testing session.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
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

            <div className="flex items-center space-x-4">
              {/* HyperAgent Test Results */}
              {hyperAgentResult && (
                <div className={cn(
                  "flex items-center space-x-1 text-sm",
                  hyperAgentResult.success ? "text-green-600" : "text-red-600"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    hyperAgentResult.success ? "bg-green-500" : "bg-red-500"
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
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunningHyperAgent ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-2" />
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