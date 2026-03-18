import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

/**
 * Hook to manage URL parameters for auto-generation
 * Uses useSearchParams for reliable client-side navigation (router.push from home)
 * @param {boolean} hasProcessedAutoGenerate - Whether auto-generate has been processed
 * @returns {Object} - Auto-generate state and handlers
 */
export function useAutoGenerateParams(hasProcessedAutoGenerate) {
  const searchParams = useSearchParams()
  const [autoGeneratePrompt, setAutoGeneratePrompt] = useState(null)

  // Check for autoGenerate prompt in URL — useSearchParams ensures we get it on client-side nav
  useEffect(() => {
    const autoGenerateFromUrl = searchParams.get('autoGenerate')
    if (autoGenerateFromUrl) {
      try {
        setAutoGeneratePrompt(decodeURIComponent(autoGenerateFromUrl))
      } catch (error) {
        console.warn('Failed to decode autoGenerate URL parameter:', error)
        setAutoGeneratePrompt(autoGenerateFromUrl)
      }
    }
  }, [searchParams])

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

