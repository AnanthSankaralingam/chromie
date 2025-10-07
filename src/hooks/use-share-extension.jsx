import { useState, useCallback } from 'react'

export function useShareExtension() {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const openShareModal = useCallback(() => {
    setError(null)
    setSuccessMessage(null)
    setShareUrl('')
    setIsShareModalOpen(true)
  }, [])

  const closeShareModal = useCallback(() => {
    setIsShareModalOpen(false)
    setShareUrl('')
    setError(null)
    setSuccessMessage(null)
    setIsGenerating(false)
  }, [])

  const generateShareLink = useCallback(async (projectId) => {
    if (!projectId) {
      setError('No project selected')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate share link')
      }

      if (data.share?.share_url) {
        setShareUrl(data.share.share_url)
        setSuccessMessage('Share link created successfully!')
        console.log('[share] Generated share URL:', data.share.share_url)
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (err) {
      console.error('[share] Error generating share link:', err)
      setError(err.message || 'Failed to generate share link')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const revokeShareLink = useCallback(async (projectId) => {
    if (!projectId) return

    try {
      const response = await fetch(`/api/projects/${projectId}/share`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to revoke share link')
      }

      setShareUrl('')
      console.log('[share] Share link revoked')
    } catch (err) {
      console.error('[share] Error revoking share link:', err)
      setError(err.message || 'Failed to revoke share link')
    }
  }, [])

  return {
    // State
    isShareModalOpen,
    shareUrl,
    isGenerating,
    error,
    successMessage,
    
    // Actions
    openShareModal,
    closeShareModal,
    generateShareLink,
    revokeShareLink,
  }
}
