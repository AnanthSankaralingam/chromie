"use client"

import { useState, useEffect } from "react"
import { X, RefreshCw, ExternalLink, AlertCircle, CheckCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function TestModal({ isOpen, onClose, sessionData, onRefresh, isLoading = false }) {
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [sessionStatus, setSessionStatus] = useState("loading")

  // Store session data for the embed page to access
  useEffect(() => {
    if (sessionData && sessionData.sessionId) {
      console.log('Storing session data:', sessionData)
      sessionStorage.setItem(`session_${sessionData.sessionId}`, JSON.stringify(sessionData))
    }
  }, [sessionData])

  useEffect(() => {
    if (isOpen && sessionData) {
      setIframeLoaded(false)
      setSessionStatus("loading")
    }
  }, [isOpen, sessionData])

  const handleIframeLoad = () => {
    setIframeLoaded(true)
    setSessionStatus("ready")
  }

  const handleIframeError = () => {
    setSessionStatus("error")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="fixed inset-4 bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  sessionStatus === "ready" && "bg-green-500",
                  sessionStatus === "loading" && "bg-yellow-500 animate-pulse",
                  sessionStatus === "error" && "bg-red-500",
                )}
              />
              <h2 className="text-lg font-semibold text-gray-900">Extension Test Environment</h2>
            </div>

            {sessionData && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Session: {sessionData.sessionId?.slice(-8)}</span>
                {sessionData.expiresAt && (
                  <span>• Expires: {new Date(sessionData.expiresAt).toLocaleTimeString()}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {sessionData?.iframeUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            )}

            {sessionData?.iframeUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(sessionData.iframeUrl, "_blank")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-600 hover:text-gray-900">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Setting up test environment...</h3>
                <p className="text-gray-600">Loading your Chrome extension in BrowserBase</p>
              </div>
            </div>
          ) : sessionData?.iframeUrl ? (
            <>
              {/* Loading overlay */}
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-3" />
                    <p className="text-gray-600">Loading browser environment...</p>
                  </div>
                </div>
              )}

              {/* BrowserBase iframe */}
              <iframe
                src={sessionData.iframeUrl}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title="Extension Test Environment"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </>
          ) : sessionStatus === "error" ? (
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

        {/* Instructions Panel */}
        {sessionStatus === "ready" && sessionData && (
          <div className="p-4 border-t border-gray-200 bg-blue-50">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-2">How to test your extension:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Extension Icon:</strong> Look for your extension icon in the browser toolbar</li>
                  <li>• <strong>Popup:</strong> Click the extension icon to open the popup interface</li>
                  <li>• <strong>Content Scripts:</strong> Navigate to matching websites to see content script effects</li>
                  <li>• <strong>Developer Tools:</strong> Right-click → Inspect → Console tab to see any errors</li>
                </ul>
                <div className="mt-2 flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    onClick={() => window.open('chrome://extensions/', '_blank')}
                  >
                    Open Extensions Page
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    onClick={() => window.open(sessionData.iframeUrl, '_blank')}
                  >
                    Open in New Tab
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  {sessionData.browserInfo.viewport.width}x{sessionData.browserInfo.viewport.height}
                </span>
              )}
            </div>

            <div className="text-sm text-gray-500">Powered by BrowserBase</div>
          </div>
        </div>
      </div>
    </div>
  )
}
