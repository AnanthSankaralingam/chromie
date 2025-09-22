import { useState, useEffect, useRef } from "react"

export default function useTestExtension(currentProjectId) {
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testSessionData, setTestSessionData] = useState(null)
  const [isTestLoading, setIsTestLoading] = useState(false)
  const cleanupAttempted = useRef(false)

  // Session cleanup function
  const cleanupSession = async (sessionId, projectId) => {
    if (!sessionId || !projectId || cleanupAttempted.current) {
      return
    }
    
    cleanupAttempted.current = true
    console.log("🧹 Cleaning up browser session:", sessionId)
    
    try {
      const response = await fetch(`/api/projects/${projectId}/test-extension`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log("✅ Session cleanup successful", result)
        
        // Update browser usage indicator if available
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('browserUsageUpdated'))
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.warn("⚠️ Session cleanup failed:", response.status, errorData)
      }
    } catch (error) {
      console.error("❌ Error during session cleanup:", error)
    }
  }

  // Handle browser window close and navigation
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (testSessionData?.sessionId && currentProjectId) {
        // Use sendBeacon for reliable cleanup on page unload
        const cleanupData = JSON.stringify({ 
          sessionId: testSessionData.sessionId 
        })
        
        // Try to send cleanup request via sendBeacon
        if (navigator.sendBeacon) {
          const blob = new Blob([cleanupData], { type: 'application/json' })
          navigator.sendBeacon(`/api/projects/${currentProjectId}/test-extension`, blob)
          console.log("📡 Sent cleanup request via sendBeacon")
        }
        
        // Also try synchronous cleanup as fallback
        cleanupSession(testSessionData.sessionId, currentProjectId)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && testSessionData?.sessionId && currentProjectId) {
        console.log("👁️ Page hidden, cleaning up session")
        cleanupSession(testSessionData.sessionId, currentProjectId)
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [testSessionData?.sessionId, currentProjectId])

  const handleTestExtension = async () => {
    if (!currentProjectId) {
      console.error("No project ID available")
      return
    }

    // Clean up any existing session before creating a new one
    if (testSessionData?.sessionId) {
      console.log("🔄 Cleaning up existing session before creating new one")
      await cleanupSession(testSessionData.sessionId, currentProjectId)
    }

    setIsTestLoading(true)
    setIsTestModalOpen(true)
    cleanupAttempted.current = false // Reset cleanup flag for new session

    try {
      const response = await fetch(`/api/projects/${currentProjectId}/test-extension`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create test session")
      }

      console.log("Session data:", data.session)
      setTestSessionData(data.session)
      console.log("Test session created:", data.session.sessionId)
    } catch (error) {
      console.error("Error creating test session:", error)
      // Keep modal open but show error state
      setTestSessionData(null)
    } finally {
      setIsTestLoading(false)
    }
  }

  const handleCloseTestModal = async () => {
    // Terminate session if active
    if (testSessionData?.sessionId && currentProjectId) {
      await cleanupSession(testSessionData.sessionId, currentProjectId)
    }

    setIsTestModalOpen(false)
    setTestSessionData(null)
    cleanupAttempted.current = false // Reset for next session
  }

  // Handle session expiry
  const handleSessionExpire = async () => {
    console.log("⏰ Session expired, cleaning up and closing modal")
    if (testSessionData?.sessionId && currentProjectId) {
      await cleanupSession(testSessionData.sessionId, currentProjectId)
    }
    setIsTestModalOpen(false)
    setTestSessionData(null)
    cleanupAttempted.current = false
  }

  const handleRefreshTest = () => {
    if (testSessionData) {
      handleTestExtension()
    }
  }

  return {
    isTestModalOpen,
    testSessionData,
    isTestLoading,
    handleTestExtension,
    handleCloseTestModal,
    handleRefreshTest,
    handleSessionExpire
  }
} 