import { useState, useEffect, useRef } from "react"

const SESSION_STORAGE_KEY = "chromie_active_session"

export default function useTestExtension(currentProjectId) {
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testSessionData, setTestSessionData] = useState(null)
  const [createOptions, setCreateOptions] = useState(null)
  const [isTestLoading, setIsTestLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const cleanupAttempted = useRef(false)
  const pendingCreateRef = useRef(null)
  const cleanupAfterCreateRef = useRef(false)
  const isModalOpenRef = useRef(false)
  const lastCreateOptionsRef = useRef({})
  const orphanCleanupDone = useRef(false)

  // Session cleanup function
  const cleanupSession = async (sessionId, projectId, startedAt = null) => {
    if (!sessionId || !projectId || cleanupAttempted.current) {
      return
    }

    cleanupAttempted.current = true

    // Clear from sessionStorage
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    } catch (e) {
      // sessionStorage may not be available
    }

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
        // Update browser usage indicator if available
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('browserUsageUpdated'))
        }
      }
    } catch (error) {
      // Cleanup failed
    }
  }

  // Clean up orphaned sessions on mount (fire-and-forget, doesn't block)
  useEffect(() => {
    if (orphanCleanupDone.current || !currentProjectId) return
    orphanCleanupDone.current = true

    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (stored) {
        const { sessionId, projectId } = JSON.parse(stored)
        if (sessionId && projectId) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY)
          // Use sendBeacon for reliable delivery (survives any navigation edge cases)
          if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify({ action: "terminate", sessionId })], { type: 'application/json' })
            navigator.sendBeacon(`/api/projects/${projectId}/test-extension`, blob)
          } else {
            // Fallback to fetch with keepalive
            fetch(`/api/projects/${projectId}/test-extension`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "terminate", sessionId }),
              keepalive: true,
            }).catch(() => {})
          }
        }
      }
    } catch (e) {
      // sessionStorage may not be available or JSON parse failed
    }
  }, [currentProjectId])

  // Handle browser window close and navigation
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (testSessionData?.sessionId && currentProjectId) {
        // Clear sessionStorage immediately
        try {
          sessionStorage.removeItem(SESSION_STORAGE_KEY)
        } catch (e) {}

        // Use sendBeacon with POST action for reliable cleanup on page unload
        // (sendBeacon only supports POST, so we use action: "terminate")
        const cleanupData = JSON.stringify({
          action: "terminate",
          sessionId: testSessionData.sessionId
        })

        if (navigator.sendBeacon) {
          const blob = new Blob([cleanupData], { type: 'application/json' })
          navigator.sendBeacon(`/api/projects/${currentProjectId}/test-extension`, blob)
        }
      }
    }

    // Only add beforeunload listener - remove visibilitychange to allow tab switching
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [testSessionData?.sessionId, currentProjectId])

  const handleTestExtension = async (options = {}) => {
    if (!currentProjectId) {
      return
    }

    lastCreateOptionsRef.current = options || {}
    setCreateOptions(options || null)

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

      // Use mobile-friendly viewport when client is on mobile for vertical testing (Hyperbrowser min width: 500)
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768
      const viewport = isMobile ? { width: 800, height: 1280 } : null

      const createPromise = fetch(`/api/projects/${currentProjectId}/test-extension`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          awaitPinExtension: options?.awaitPinExtension === true,
          isRunTests: options?.autoRunHyperAgent === true,
          viewport,
        }),
      })
      pendingCreateRef.current = createPromise
      const response = await createPromise

      clearInterval(progressInterval)
      setLoadingProgress(90)
      
      const data = await response.json()

      if (!response.ok) {
        // Store rich error data for UI consumption
        const errorData = {
          message: data.error || "Failed to create test session",
          code: data.errorCode,
          type: data.errorType,
          category: data.errorCategory,
        }

        setTestSessionData({ error: errorData })
        setLoadingProgress(100)
        return // Don't throw - error is stored in state for UI to display
      }

      // Persist session info to survive page reloads
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          sessionId: data.session?.sessionId,
          projectId: currentProjectId,
          startedAt: data.session?.startedAt,
        }))
      } catch (e) {
        // sessionStorage may not be available
      }

      setTestSessionData({
        ...data.session,
        autoRunHyperAgent: options?.autoRunHyperAgent === true,
        autoRunPuppeteerTests: options?.autoRunPuppeteerTests === true,
        runTestSequence: options?.runTestSequence === true,
        sequenceId: options?.sequenceId || null,
      })
      setLoadingProgress(100)

      // If user closed the modal before creation finished, immediately clean up
      if (cleanupAfterCreateRef.current || !isModalOpenRef.current) {
        await cleanupSession(data.session.sessionId, currentProjectId, data.session.startedAt)
        setIsTestModalOpen(false)
        setTestSessionData(null)
        cleanupAttempted.current = false
      }
    } catch (error) {
      // Store the error in state for UI to display instead of clearing it
      setTestSessionData({
        error: {
          message: error.message || "Failed to create test session",
          type: 'general',
          category: 'unknown'
        }
      })
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
        cleanupAfterCreateRef.current = true
      }
    }

    setIsTestModalOpen(false)
    isModalOpenRef.current = false
    setTestSessionData(null)
    setCreateOptions(null)
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
      setCreateOptions(null)
      cleanupAttempted.current = false
    }
  }

  const handleRefreshTest = () => {
    if (testSessionData) {
      handleTestExtension(lastCreateOptionsRef.current || {})
    }
  }

  return {
    isTestModalOpen,
    testSessionData,
    createOptions,
    isTestLoading,
    loadingProgress,
    handleTestExtension,
    handleCloseTestModal,
    handleRefreshTest,
    handleSessionExpire
  }
} 