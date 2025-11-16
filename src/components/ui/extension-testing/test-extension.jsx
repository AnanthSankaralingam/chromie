import { useState, useEffect, useRef } from "react"

export default function useTestExtension(currentProjectId) {
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testSessionData, setTestSessionData] = useState(null)
  const [isTestLoading, setIsTestLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const cleanupAttempted = useRef(false)
  const pendingCreateRef = useRef(null)
  const cleanupAfterCreateRef = useRef(false)
  const isModalOpenRef = useRef(false)

  // Session cleanup function
  const cleanupSession = async (sessionId, projectId, startedAt = null) => {
    if (!sessionId || !projectId || cleanupAttempted.current) {
      return
    }

    cleanupAttempted.current = true
    console.log("🧹 Cleaning up session:", sessionId)

    try {
      const response = await fetch(`/api/projects/${projectId}/test-extension`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          startedAt: startedAt || testSessionData?.startedAt
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log("✅ Session cleaned up")
        
        // Update browser usage indicator if available
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('browserUsageUpdated'))
        }
      } else {
        console.warn("⚠️  Cleanup failed:", response.status)
      }
    } catch (error) {
      console.error("❌ Cleanup error:", error.message)
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
    console.log("🚀 Test Extension clicked")
    
    if (!currentProjectId) {
      console.error("❌ No project ID available")
      return
    }

    // Clean up any existing session before creating a new one
    if (testSessionData?.sessionId) {
      await cleanupSession(testSessionData.sessionId, currentProjectId, testSessionData.startedAt)
    }

    setIsTestLoading(true)
    setLoadingProgress(0)
    setIsTestModalOpen(true)
    isModalOpenRef.current = true
    cleanupAttempted.current = false
    cleanupAfterCreateRef.current = false

    try {
      // Simulate progress updates during session creation
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 80) {
            return prev + Math.random() * 15
          }
          return prev
        })
      }, 1000)

      console.log("📡 Creating test session...")
      
      const createPromise = fetch(`/api/projects/${currentProjectId}/test-extension`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      pendingCreateRef.current = createPromise
      const response = await createPromise

      clearInterval(progressInterval)
      setLoadingProgress(90)
      
      const data = await response.json()

      if (!response.ok) {
        console.error("❌ API Error:", data.error || data)
        throw new Error(data.error || "Failed to create test session")
      }

      console.log("✅ Session created:", data.session?.sessionId)
      console.log("📌 Automatic pinning initiated on server")
      console.log("   Session ID:", data.session?.sessionId)
      console.log("   Live URL:", data.session?.liveViewUrl ? "✓" : "✗")
      
      setTestSessionData(data.session)
      setLoadingProgress(100)

      // If user closed the modal before creation finished, immediately clean up
      if (cleanupAfterCreateRef.current || !isModalOpenRef.current) {
        await cleanupSession(data.session.sessionId, currentProjectId, data.session.startedAt)
        setIsTestModalOpen(false)
        setTestSessionData(null)
        cleanupAttempted.current = false
      }
    } catch (error) {
      console.error("❌ Error:", error.message)
      setTestSessionData(null)
    } finally {
      setIsTestLoading(false)
      pendingCreateRef.current = null
    }
  }

  const handleCloseTestModal = async () => {
    // Terminate session if active
    if (testSessionData?.sessionId && currentProjectId) {
      await cleanupSession(testSessionData.sessionId, currentProjectId, testSessionData.startedAt)
    } else {
      // If creation is still in-flight, mark for cleanup when it completes
      if (pendingCreateRef.current) {
        console.log("⏳ Modal closed while session creation in progress. Will cleanup after creation.")
        cleanupAfterCreateRef.current = true
      }
    }

    setIsTestModalOpen(false)
    isModalOpenRef.current = false
    setTestSessionData(null)
    cleanupAttempted.current = false // Reset for next session
  }

  // Handle session expiry - close modal and cleanup server session
  const handleSessionExpire = async () => {
    try {
      if (testSessionData?.sessionId && currentProjectId) {
        await cleanupSession(testSessionData.sessionId, currentProjectId, testSessionData.startedAt)
      }
    } finally {
      setIsTestModalOpen(false)
      setTestSessionData(null)
      cleanupAttempted.current = false
    }
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