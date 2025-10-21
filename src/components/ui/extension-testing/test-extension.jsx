import { useState, useEffect, useRef } from "react"

export default function useTestExtension(currentProjectId) {
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testSessionData, setTestSessionData] = useState(null)
  const [isTestLoading, setIsTestLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
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

    // Only add beforeunload listener - remove visibilitychange to allow tab switching
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
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
    setLoadingProgress(0)
    setIsTestModalOpen(true)
    cleanupAttempted.current = false // Reset cleanup flag for new session

    try {
      // Simulate progress updates during session creation
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 80) { // Don't go to 100% until we get the response
            return prev + Math.random() * 15
          }
          return prev
        })
      }, 1000)

      const response = await fetch(`/api/projects/${currentProjectId}/test-extension`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      clearInterval(progressInterval)
      setLoadingProgress(90)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create test session")
      }

      console.log("Session data:", data.session)
      setTestSessionData(data.session)
      setLoadingProgress(100)
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

  // Handle session expiry - just close modal, don't auto-cleanup
  const handleSessionExpire = async () => {
    console.log("⏰ Session timer expired - closing modal but keeping session alive")
    // Don't automatically cleanup session - let user manually close when ready
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
    loadingProgress,
    handleTestExtension,
    handleCloseTestModal,
    handleRefreshTest,
    handleSessionExpire
  }
} 