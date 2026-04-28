"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Download, AlertCircle, Loader2, ExternalLink, CheckCircle, Play, GitFork, Star, Copy, User } from "lucide-react"
import Link from "next/link"
import { useSession } from '@/components/SessionProviderClient'
import TestModal from '@/components/ui/modals/modal-testing-extension'
import AuthModal from '@/components/ui/modals/modal-auth'

export default function ShareExtensionPage({ token }) {
  const { user } = useSession()
  const router = useRouter()
  const [projectData, setProjectData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)

  // Test extension state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testSessionData, setTestSessionData] = useState(null)
  const [isTestLoading, setIsTestLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [testError, setTestError] = useState(null)

  // Fork state
  const [isForkLoading, setIsForkLoading] = useState(false)
  const [forkError, setForkError] = useState(null)
  const [forkSuccess, setForkSuccess] = useState(false)

  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [selectedFileIndex, setSelectedFileIndex] = useState(0)

  useEffect(() => {
    if (token) {
      fetchProjectData()
    }
  }, [token])

  const fetchProjectData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/share/${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load project')
      }

      setProjectData(data)
      setSelectedFileIndex(0)
    } catch (err) {
      console.error('[share page] Error fetching project:', err)
      setError(err.message || 'Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!user) {
      setIsAuthModalOpen(true)
      return
    }

    try {
      setIsDownloading(true)
      setDownloadError(null)
      
      const response = await fetch(`/api/share/${token}/download`, {
        method: 'GET',
        credentials: 'include'
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          setDownloadError('Please sign in to download this extension')
          return
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Download failed')
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `chromie-shared-${projectData?.project?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'extension'}.zip`

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('[share page] Download error:', err)
      setDownloadError(err.message || 'Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleTestExtension = async () => {
    if (!user) {
      setIsAuthModalOpen(true)
      return
    }
    
    if (!projectData?.project?.id) {
      setTestError('No project data available')
      return
    }

    setIsTestLoading(true)
    setLoadingProgress(0)
    setIsTestModalOpen(true)
    setTestError(null)

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

      const response = await fetch(`/api/share/${token}/test`, {
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

      setTestSessionData(data.session)
      setLoadingProgress(100)
    } catch (error) {
      console.error("Error creating test session:", error)
      setTestError(error.message || "Failed to create test session")
      setTestSessionData(null)
    } finally {
      setIsTestLoading(false)
    }
  }

  const handleCloseTestModal = async () => {
    if (testSessionData?.sessionId) {
      try {
        await fetch(`/api/share/${token}/test`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: testSessionData.sessionId,
            startedAt: testSessionData.startedAt
          }),
        })
      } catch (error) {
        console.error("Error cleaning up test session:", error)
      }
    }

    setIsTestModalOpen(false)
    setTestSessionData(null)
    setTestError(null)
  }

  const handleForkProject = async () => {
    if (!user) {
      setIsAuthModalOpen(true)
      return
    }

    if (!projectData?.project?.id) {
      setForkError('No project data available')
      return
    }

    try {
      setIsForkLoading(true)
      setForkError(null)
      setForkSuccess(false)


      const response = await fetch(`/api/share/${token}/fork`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthModalOpen(true)
          return
        }

        const errorData = await response.json()

        // Handle project limit error
        if (response.status === 403 && errorData.error === "projects limit reached") {
          setForkError(`Project limit reached. ${errorData.details?.suggestion || 'Please upgrade your plan.'}`)
          return
        }

        throw new Error(errorData.error || 'Fork failed')
      }

      const data = await response.json()

      // Show success state briefly
      setForkSuccess(true)

      // Store project ID and navigate to builder
      sessionStorage.setItem('chromie_current_project_id', data.project.id)

      // Navigate after brief delay to show success state
      setTimeout(() => {
        router.push(`/builder?project=${data.project.id}`)
      }, 800)

    } catch (err) {
      console.error('[share page] Fork error:', err)
      setForkError(err.message || 'Failed to fork project')
    } finally {
      setIsForkLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'less than a minute ago'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    return formatDate(dateString)
  }

  const formatSizeBytes = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    return `${kb.toFixed(1)} KB`
  }

  const handleCopyCode = async () => {
    const codeFiles = projectData?.files?.filter((f) => f.content && !f.file_path.startsWith('.chromie/')) || []
    const currentFile = codeFiles[selectedFileIndex] || codeFiles[0]
    const content = currentFile?.content || ''
    try {
      await navigator.clipboard.writeText(content)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch (_) {}
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading extension</h2>
          <p className="text-gray-400">Fetching project details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] bg-black flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Extension not found</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button asChild className="bg-white hover:bg-gray-200 text-black">
            <Link href="/" className="flex items-center justify-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Go to chromie.dev
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!projectData) {
    return null
  }

  const { project, files, metadata } = projectData
  const codeFiles = files?.filter((f) => f.content && !f.file_path.startsWith('.chromie/')) || []
  const codePreviewFile = codeFiles[selectedFileIndex] || codeFiles[0]
  const codePreviewContent = codePreviewFile?.content || ''

  return (
    <div className="min-h-screen bg-black">
      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Chrome Web Store style: Extension header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-gray-500 fill-gray-500" aria-hidden />
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{project.name}</h1>
            </div>
            <p className="text-gray-400 text-base mb-4">
              {project.description || 'A Chrome extension built with chromie'}
            </p>
            {project.author?.name && (
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                <User className="h-4 w-4 shrink-0" />
                <span>by {project.author.name}</span>
              </div>
            )}
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium px-6 py-2.5 rounded"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  + Install extension
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Metadata table - Chrome Web Store style */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 py-4 border-y border-gray-800">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Size</div>
            <div className="text-white font-medium">{formatSizeBytes(metadata?.size_bytes)}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Version</div>
            <div className="text-white font-medium">{metadata?.version || '1.0.0'}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Created</div>
            <div className="text-white font-medium">{formatDate(project.created_at)}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Updated</div>
            <div className="text-white font-medium">{formatRelativeTime(metadata?.updated_at)}</div>
          </div>
        </div>

        {/* Code snippet section */}
        {codeFiles.length > 0 && (
          <div className="mb-10">
            {/* File tabs */}
            <div className="flex flex-wrap gap-1 mb-2">
              {codeFiles.map((file, idx) => (
                <button
                  key={file.file_path}
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`px-4 py-2 text-xs font-mono whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    selectedFileIndex === idx
                      ? 'text-white border-blue-500 bg-[#1e1e1e]'
                      : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  {file.file_path}
                </button>
              ))}
            </div>
            <div className="relative rounded-lg overflow-hidden border border-gray-800 bg-[#1e1e1e]">
              <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-700">
                <span className="text-gray-400 text-sm font-mono">
                  {codePreviewFile?.file_path}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-sm text-gray-300 font-mono max-h-64 overflow-y-auto">
                <code>{codePreviewContent}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Secondary actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button
            onClick={handleTestExtension}
            disabled={isTestLoading}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <Play className="h-4 w-4 mr-2" />
            {isTestLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              'Test extension'
            )}
          </Button>
          <Button
            onClick={handleForkProject}
            disabled={isForkLoading || forkSuccess}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            {forkSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Forked!
              </>
            ) : isForkLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Forking...
              </>
            ) : (
              <>
                <GitFork className="h-4 w-4 mr-2" />
                Fork project
              </>
            )}
          </Button>
        </div>

        {/* Error messages */}
        {(downloadError || testError || forkError) && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            {downloadError && (
              <p className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {downloadError}
              </p>
            )}
            {testError && (
              <p className="text-red-400 text-sm flex items-center gap-2 mt-1">
                <AlertCircle className="h-4 w-4 shrink-0" /> {testError}
              </p>
            )}
            {forkError && (
              <p className="text-red-400 text-sm flex items-center gap-2 mt-1">
                <AlertCircle className="h-4 w-4 shrink-0" /> {forkError}
              </p>
            )}
          </div>
        )}

        {forkSuccess && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-400 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Project forked successfully. Redirecting to builder...
            </p>
          </div>
        )}

        {/* How to install */}
        <div className="bg-gray-900 rounded-lg p-4 text-sm text-gray-400">
          <p className="font-medium text-white mb-2">How to install</p>
          <p>
            After downloading, go to <Link href="chrome://extensions/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">chrome://extensions/</Link>, enable Developer mode, then click Load unpacked and select the extracted folder.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-2">Create your own extension</h3>
          <p className="text-gray-400 text-sm mb-4">
            Want to build extensions like this? Try chromie for free — describe your idea and we&apos;ll write the code.
          </p>
          <Button asChild className="bg-white hover:bg-gray-200 text-black">
            <Link href="/" className="flex items-center gap-2">
              Start building for free
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>

      <TestModal
        isOpen={isTestModalOpen}
        onClose={handleCloseTestModal}
        sessionData={testSessionData}
        onRefresh={handleTestExtension}
        isLoading={isTestLoading}
        loadingProgress={loadingProgress}
        projectId={projectData?.project?.id}
        extensionFiles={codeFiles}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        redirectUrl={typeof window !== 'undefined' ? window.location.pathname : '/'}
      />
    </div>
  )
}