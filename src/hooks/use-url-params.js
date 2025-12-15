import { useEffect, useState } from "react"

/**
 * Hook to manage URL parameters for auto-generation
 * @param {boolean} hasProcessedAutoGenerate - Whether auto-generate has been processed
 * @returns {Object} - Auto-generate state and handlers
 */
export function useAutoGenerateParams(hasProcessedAutoGenerate) {
  const [autoGeneratePrompt, setAutoGeneratePrompt] = useState(null)

  // Check for autoGenerate prompt in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const autoGenerateFromUrl = urlParams.get('autoGenerate')
      
      if (autoGenerateFromUrl) {
        try {
          setAutoGeneratePrompt(decodeURIComponent(autoGenerateFromUrl))
        } catch (error) {
          // If URI is malformed, use the original value
          console.warn('Failed to decode autoGenerate URL parameter:', error)
          setAutoGeneratePrompt(autoGenerateFromUrl)
        }
      }
    }
  }, [])

  // Clear autoGenerate URL parameter after successful generation
  useEffect(() => {
    if (hasProcessedAutoGenerate && autoGeneratePrompt === null && typeof window !== 'undefined') {
      const url = new URL(window.location)
      if (url.searchParams.has('autoGenerate')) {
        url.searchParams.delete('autoGenerate')
        window.history.replaceState({}, '', url.pathname)
      }
    }
  }, [autoGeneratePrompt, hasProcessedAutoGenerate])

  const handleAutoGenerateComplete = () => {
    setAutoGeneratePrompt(null)
  }

  return {
    autoGeneratePrompt,
    setAutoGeneratePrompt,
    handleAutoGenerateComplete
  }
}

/**
 * Hook to manage project URL parameters
 * @param {string} projectId - Current project ID
 * @param {boolean} isSettingUpProject - Whether project is being set up
 */
export function useProjectParams(projectId, isSettingUpProject) {
  useEffect(() => {
    if (projectId && !isSettingUpProject) {
      const url = new URL(window.location)
      let hasChanges = false
      
      if (url.searchParams.has('project')) {
        url.searchParams.delete('project')
        hasChanges = true
      }
      
      if (hasChanges) {
        window.history.replaceState({}, '', url.pathname)
      }
    }
  }, [projectId, isSettingUpProject])
}

