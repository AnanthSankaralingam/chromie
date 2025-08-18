"use client"

import { useState, useEffect, useRef } from "react"
import { X, RefreshCw, ExternalLink, AlertCircle, CheckCircle, Info, MessageSquare, Monitor, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import ExtensionPopupRenderer, { ExtensionActionButtons } from "./extension-popup-renderer"

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
  const [communicationLog, setCommunicationLog] = useState([])
  const [popupActions, setPopupActions] = useState([])
  const [isPopupRendered, setIsPopupRendered] = useState(false)

  // Store session data for the embed page to access
  useEffect(() => {
    if (sessionData && sessionData.sessionId) {
      console.log('Storing session data:', sessionData)
      sessionStorage.setItem('session_' + sessionData.sessionId, JSON.stringify(sessionData))
    }
  }, [sessionData])

  // Debug: Monitor communication log changes
  useEffect(() => {
    console.log('Communication log updated, length:', communicationLog.length, communicationLog)
  }, [communicationLog])

  useEffect(() => {
    console.log("SideBySideTestModal received sessionData:", sessionData)
    console.log("SideBySideTestModal received extensionFiles:", extensionFiles)
    
    if (extensionFiles && extensionFiles.length > 0) {
      console.log("Processing extension files for action generation...")
      
      // Find manifest.json
      const manifestFile = extensionFiles.find(file => file.file_path === 'manifest.json')
      console.log("Found manifest file:", manifestFile)
      
      if (manifestFile) {
        try {
          const manifest = JSON.parse(manifestFile.content)
          console.log("Parsed manifest:", manifest)
          
          // Extract extension info
          const extensionInfo = {
            hasPopup: !!manifest.action?.default_popup,
            hasSidePanel: !!manifest.side_panel,
            hasContentScript: extensionFiles.some(file => file.file_path.includes('content.js')),
            contentScript: extensionFiles.find(file => file.file_path.includes('content.js'))?.content
          }
          
          console.log("Extension info:", extensionInfo)
          
          // Generate actions based on manifest and extension type
          const actions = generateActionsFromExtension(manifest, extensionInfo)
          console.log("Generated actions:", actions)
          setPopupActions(actions)
        } catch (error) {
          console.error("Error parsing manifest:", error)
        }
      } else {
        console.log("No manifest.json found, using default actions")
        setPopupActions([
          { 
            id: 'test_connection', 
            label: 'Test Connection', 
            type: 'test_action',
            description: 'Tests the communication bridge with detailed logging'
          },
          { 
            id: 'trigger_extension', 
            label: 'Trigger Action', 
            type: 'extension_action',
            description: 'Executes the main extension functionality'
          }
        ])
      }
    } else {
      console.log("No extension files provided")
    }
  }, [extensionFiles])

  const generateActionsFromExtension = (manifest, extensionInfo) => {
    // SIMPLIFIED: Only 2 buttons
    const actions = [
      { 
        id: 'test_connection', 
        label: 'Test Connection', 
        type: 'test_action',
        description: 'Tests the communication bridge with detailed logging'
      },
      { 
        id: 'trigger_extension', 
        label: 'Trigger Action', 
        type: 'extension_action',
        description: 'Executes the main extension functionality'
      }
    ]
    
    return actions
  }

  const addCommunicationLog = (message, type = 'info') => {
    setCommunicationLog(prev => [...prev, {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }])
  }

  const clearCommunicationLog = () => {
    console.log("clearCommunicationLog called, current log length:", communicationLog.length)
    setCommunicationLog([])
    console.log("setCommunicationLog([]) called")
  }

  const handlePopupAction = async (action) => {
    console.log("Popup action triggered:", action)
    
    // DETAILED LOGGING: Show every step
    addCommunicationLog('USER: Clicked "' + action.label + '"', 'user_action')
    addCommunicationLog('SYSTEM: Preparing API request...', 'info')
    addCommunicationLog('SYSTEM: Session ID: ' + (sessionData?.sessionId || 'N/A'), 'info')
    addCommunicationLog('SYSTEM: Action payload: ' + JSON.stringify({id: action.id, type: action.type}), 'info')
    
    try {
      addCommunicationLog('NETWORK: Sending POST to /api/projects/' + projectId + '/test-extension/action', 'info')
      
      const startTime = Date.now()
      
      // Send action to BrowserBase session via our backend
      const response = await fetch('/api/projects/' + projectId + '/test-extension/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionData?.sessionId,
          action: action
        })
      })
      
      const duration = Date.now() - startTime
      addCommunicationLog('NETWORK: Response received in ' + duration + 'ms', 'info')
      addCommunicationLog('NETWORK: Status ' + response.status + ' ' + response.statusText, 'info')
      
      const result = await response.json()
      addCommunicationLog('RESPONSE: ' + JSON.stringify(result, null, 2), 'info')
      
      if (response.ok) {
        addCommunicationLog('SUCCESS: ' + (result.message || 'Action completed successfully'), 'bridge_action')
        
        // Log all response details
        Object.keys(result).forEach(key => {
          if (key !== 'message' && result[key]) {
            addCommunicationLog('DETAIL: ' + key + ' = ' + result[key], 'info')
          }
        })
        
        addCommunicationLog('COMPLETE: Extension action processing finished', 'bridge_action')
      } else {
        addCommunicationLog('ERROR: ' + (result.error || 'Unknown error'), 'error')
        addCommunicationLog('DEBUG: Check server logs for more details', 'error')
      }
    } catch (error) {
      console.error("Error sending popup action:", error)
      addCommunicationLog('EXCEPTION: ' + error.message, 'error')
      addCommunicationLog('DEBUG: ' + (error.stack || 'No stack trace'), 'error')
    }
  }

  console.log("SideBySideTestModal render - isOpen:", isOpen, "sessionData:", sessionData, "isLoading:", isLoading)
  if (!isOpen) return null

  const liveUrl = sessionData?.liveViewUrl || sessionData?.iframeUrl || sessionData?.browserUrl
  const error = sessionData?.error

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
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
              <h2 className="text-lg font-semibold text-gray-900">Side-by-Side Extension Test</h2>
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
            <Button variant="ghost" size="sm" onClick={onRefresh} className="text-gray-600 hover:text-gray-900">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-600 hover:text-gray-900">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - BrowserBase Session */}
          <div className="flex-1 border-r border-gray-200 flex flex-col overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center space-x-2 flex-shrink-0">
                <Monitor className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Live Browser Session</span>
              </div>
              
              <div className="flex-1 relative overflow-hidden">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Starting session...</h3>
                      <p className="text-gray-600">This may take a few moments</p>
                    </div>
                  </div>
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

          {/* Right Side - Extension Popup & Communication */}
          <div className="w-[480px] flex flex-col overflow-hidden">
            {/* Extension Popup Section */}
            <div className="flex-1 border-b border-gray-200 flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-800">Extension Popup</span>
                </div>
                <ExtensionActionButtons 
                  popupActions={popupActions}
                  onAction={handlePopupAction}
                />
              </div>
              
              <div className="flex-1 relative overflow-hidden">
                <ExtensionPopupRenderer
                  extensionFiles={extensionFiles}
                  onRenderStateChange={setIsPopupRendered}
                />
              </div>
            </div>

            {/* Communication Log Section */}
            <div className="h-80 flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-gray-800">Communication Bridge</span>
                </div>
                {communicationLog.length > 0 && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      clearCommunicationLog()
                    }}
                    className="text-xs text-gray-600 hover:text-gray-900 hover:bg-red-50 hover:border-red-300 px-2 py-1 h-auto transition-colors border border-gray-300 rounded-md"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              <div className="flex-1 p-3 overflow-y-auto bg-gray-50">
                {communicationLog.length === 0 ? (
                  <div className="text-center text-gray-500 mt-4">
                    <Info className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <p className="text-xs">Interact with the popup above to see communication logs</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {communicationLog.map((log) => (
                      <div 
                        key={log.id}
                        className={cn(
                          "text-xs p-2 rounded-md border-l-2",
                          log.type === 'user_action' && "bg-blue-50 text-blue-900 border-blue-300",
                          log.type === 'bridge_action' && "bg-green-50 text-green-900 border-green-300",
                          log.type === 'error' && "bg-red-50 text-red-900 border-red-300",
                          log.type === 'warning' && "bg-yellow-50 text-yellow-900 border-yellow-300",
                          log.type === 'info' && "bg-gray-100 text-gray-800 border-gray-300"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-medium leading-relaxed flex-1 pr-2">{log.message}</span>
                          <span className="text-xs opacity-75 flex-shrink-0">{log.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
              {isPopupRendered && (
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Popup rendered</span>
                </div>
              )}
              {sessionData?.browserInfo && (
                <span>
                  {sessionData.browserInfo.viewport.width + 'x' + sessionData.browserInfo.viewport.height}
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