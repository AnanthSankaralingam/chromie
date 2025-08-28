import { useState } from "react"

export default function useTestExtension(currentProjectId) {
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testSessionData, setTestSessionData] = useState(null)
  const [isTestLoading, setIsTestLoading] = useState(false)
  const [extensionConfig, setExtensionConfig] = useState(null)
  const [stagehandScript, setStagehandScript] = useState(null)

  const handleTestExtension = async () => {
    if (!currentProjectId) {
      console.error("No project ID available")
      return
    }

    setIsTestLoading(true)
    setIsTestModalOpen(true)

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
      setExtensionConfig(data.extensionConfig || null)
      setStagehandScript(data.stagehandScript || null)
      console.log("Test session created:", data.session.sessionId)
      console.log("Extension config:", data.extensionConfig)
      console.log("Stagehand script:", data.stagehandScript ? data.stagehandScript.length + " characters" : "not found")
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
    if (testSessionData?.sessionId) {
      try {
        await fetch(`/api/projects/${currentProjectId}/test-extension`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: testSessionData.sessionId }),
        })
      } catch (error) {
        console.error("Error terminating test session:", error)
      }
    }

    setIsTestModalOpen(false)
    setTestSessionData(null)
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
    extensionConfig,
    stagehandScript,
    handleTestExtension,
    handleCloseTestModal,
    handleRefreshTest
  }
} 