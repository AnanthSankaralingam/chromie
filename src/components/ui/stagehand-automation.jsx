"use client"

import { useState, useEffect } from "react"
import { Play, Bot, CheckCircle, AlertCircle, Loader2, Zap, Terminal, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function StagehandAutomation({ 
  sessionId, 
  extensionConfig, 
  onAutomationComplete,
  projectId 
}) {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [logs, setLogs] = useState([])

  const stagehandScript = extensionConfig?.stagehandScript
  const extensionName = extensionConfig?.name || "Extension"
  const extensionDescription = extensionConfig?.description || "Chrome extension"
  const extensionType = extensionConfig?.type || "generic"

  const handleRunAutomation = async () => {
    if (!sessionId) {
      setError("No active session found")
      return
    }

    setIsRunning(true)
    setError(null)
    setResults(null)
    setLogs([])

    try {
      // Add initial log
      addLog("🤖 Starting Stagehand automation...", "info")

      const response = await fetch(`/api/projects/${projectId}/test-extension/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          action: {
            id: "stagehand_automation",
            type: "stagehand_automation",
            label: "Stagehand Automation",
            description: "Run automated tests using Stagehand",
            extensionConfig: {
              ...extensionConfig,
              projectId: extensionConfig.projectId
            }
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to run automation")
      }

      addLog("✅ Automation script prepared successfully", "success")
      
      // Handle different execution methods
      if (data.result.method === 'direct_execution') {
        addLog("🚀 Stagehand automation executed directly in browser", "success")
        addLog("✅ Automation is running automatically in the BrowserBase session", "success")
        addLog("🎯 Check the browser window to see the automation in action", "info")
        setResults({
          ...data.result,
          method: 'direct_execution',
          message: 'Automation running in browser!',
          note: 'Stagehand automation is now executing in the BrowserBase session'
        })
      } else if (data.result.method === 'data_url_creation') {
        addLog("📋 Data URL created for browser execution", "info")
        addLog("🔗 Copy the data URL and paste it in the browser address bar", "info")
        setResults({
          ...data.result,
          dataUrl: data.result.dataUrl,
          instructions: data.result.instructions
        })
      } else {
        addLog("✅ Automation executed successfully", "success")
        setResults(data.result)
      }
      
      if (onAutomationComplete) {
        onAutomationComplete(data.result)
      }

    } catch (err) {
      console.error("Stagehand automation error:", err)
      setError(err.message)
      addLog(`❌ Automation failed: ${err.message}`, "error")
    } finally {
      setIsRunning(false)
    }
  }

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { message, type, timestamp }])
  }



  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Stagehand Automation</h3>
          <Badge variant="secondary" className="ml-2">
            {stagehandScript ? "Script Ready" : "No Script"}
          </Badge>
        </div>
        
        <Button
          onClick={handleRunAutomation}
          disabled={isRunning || !sessionId}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Preparing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Prepare & Run Automation
            </>
          )}
        </Button>
      </div>

      {/* Extension Info */}
      <Card className="p-4">
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Extension Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>
              <span className="ml-2 font-medium">{extensionName}</span>
            </div>
            <div>
              <span className="text-gray-500">Type:</span>
              <span className="ml-2 font-medium capitalize">{extensionType}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Description:</span>
              <span className="ml-2">{extensionDescription}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stagehand Script */}
      {stagehandScript && (
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">Stagehand Script</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
              <Bot className="h-4 w-4 text-purple-600" />
              <div className="flex-1">
                <div className="font-medium text-sm">Automation Script</div>
                <div className="text-xs text-gray-600">{stagehandScript.length} characters</div>
              </div>
              <Badge variant="outline" className="text-xs">
                Script
              </Badge>
            </div>
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-x-auto max-h-32">
              {stagehandScript.substring(0, 300)}...
            </div>
          </div>
        </Card>
      )}

      {/* Results and Logs */}
      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs">Execution Logs</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="logs" className="space-y-2">
          <Card className="p-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No logs yet. Run automation to see execution details.</p>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <span className="text-gray-400 font-mono">{log.timestamp}</span>
                    <span className={`flex-1 ${
                      log.type === 'error' ? 'text-red-600' :
                      log.type === 'success' ? 'text-green-600' :
                      'text-gray-700'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="space-y-2">
          <Card className="p-4">
            {error ? (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>Error: {error}</span>
              </div>
            ) : results ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">
                    {results.method === 'direct_execution' ? 'Automation running in browser!' : 
                     results.dataUrl ? 'Automation ready for execution!' : 'Automation completed successfully!'}
                  </span>
                </div>
                
                {results.method === 'direct_execution' ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">🎉 Automation Running!</h4>
                    <p className="text-green-700 mb-3">
                      Stagehand automation is now running automatically in the BrowserBase session. 
                      You can see the automation in action in the browser window.
                    </p>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-blue-800 text-sm">
                        <strong>What's happening:</strong> The automation script has been executed directly in the browser 
                        and is now running the Stagehand commands to test your extension.
                      </p>
                    </div>
                    
                    <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded">
                      <p className="text-purple-800 text-sm">
                        <strong>Stagehand Script:</strong>
                      </p>
                      <div className="text-purple-700 text-sm mt-2">
                        {stagehandScript ? (
                          <div className="bg-purple-100 p-2 rounded text-xs font-mono overflow-x-auto">
                            {stagehandScript.substring(0, 200)}...
                          </div>
                        ) : (
                          <span className="text-purple-600">No script available</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : results.dataUrl ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">🚀 Automation Ready</h4>
                    <p className="text-blue-700 mb-3">{results.instructions}</p>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-blue-800">Data URL:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={results.dataUrl}
                          readOnly
                          className="flex-1 p-2 border border-blue-300 rounded text-sm bg-white"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(results.dataUrl)
                            addLog("📋 Data URL copied to clipboard", "success")
                          }}
                          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-yellow-800 text-sm">
                        <strong>Next Steps:</strong> Paste this URL in the browser address bar within the BrowserBase session to execute the automation.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(results, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results yet. Run automation to see test results.</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Automation Error</span>
          </div>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </Card>
      )}
    </div>
  )
}
