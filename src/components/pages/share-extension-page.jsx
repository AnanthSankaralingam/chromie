"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, User, Calendar, AlertCircle, Loader2, ExternalLink, CheckCircle, Play } from "lucide-react"
import Link from "next/link"
import { useSession } from '@/components/SessionProviderClient'
import TestModal from '@/components/ui/modals/modal-testing-extension'
import AuthModal from '@/components/ui/modals/modal-auth'
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { motion } from "framer-motion"

export default function ShareExtensionPage({ token }) {
  const { user } = useSession()
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
  
  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

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

      console.log("Test session data:", data.session)
      setTestSessionData(data.session)
      setLoadingProgress(100)
      console.log("Test session created:", data.session.sessionId)
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white relative overflow-hidden flex items-center justify-center">
        {/* Animated Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <FlickeringGrid
            className="absolute inset-0 z-0"
            squareSize={4}
            gridGap={6}
            color="rgb(139, 92, 246)"
            maxOpacity={0.15}
            flickerChance={2.0}
          />
          
          <motion.div 
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full filter blur-[140px] z-10"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-blue-600/15 rounded-full filter blur-[140px] z-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>
        
        <div className="text-center relative z-10">
          <Loader2 className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">loading extension</h2>
          <p className="text-slate-400">fetching project details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white relative overflow-hidden flex items-center justify-center px-6">
        {/* Animated Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <FlickeringGrid
            className="absolute inset-0 z-0"
            squareSize={4}
            gridGap={6}
            color="rgb(139, 92, 246)"
            maxOpacity={0.15}
            flickerChance={2.0}
          />
          
          <motion.div 
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full filter blur-[140px] z-10"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-blue-600/15 rounded-full filter blur-[140px] z-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>
        
        <Card className="w-full max-w-md bg-slate-800/95 border-slate-700 backdrop-blur-sm relative z-10">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <CardTitle className="text-white text-xl">extension not found</CardTitle>
            <CardDescription className="text-slate-400">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Link href="/">
                <ExternalLink className="h-4 w-4 mr-2" />
                go to chromie
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!projectData) {
    return null
  }

  const { project, files } = projectData

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <FlickeringGrid
          className="absolute inset-0 z-0"
          squareSize={4}
          gridGap={6}
          color="rgb(139, 92, 246)"
          maxOpacity={0.15}
          flickerChance={2.0}
        />
        
        <motion.div 
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full filter blur-[140px] z-10"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-blue-600/15 rounded-full filter blur-[140px] z-10"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      <main className="max-w-2xl mx-auto px-6 py-8 relative z-10">
        <Card className="bg-slate-800/95 border-slate-700 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-white text-2xl mb-2">{project.author.name.split(' ')[0].toLowerCase()} shared their chrome extension with you!</CardTitle>
          <CardDescription className="text-slate-400 text-lg">
            {project.name} - {project.description || 'a chrome extension built with chromie'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Download Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                onClick={handleTestExtension}
                disabled={isTestLoading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-medium"
              >
                <Play className="h-4 w-4 mr-2" />
                {isTestLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    starting...
                  </>
                ) : (
                  'test extension'
                )}
              </Button>
              
              <Button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 font-medium"
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    downloading...
                  </>
                ) : (
                  'download extension'
                )}
              </Button>
            </div>
            
            {downloadError && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 font-medium text-sm">download error</span>
                </div>
                <p className="text-red-300 text-sm">{downloadError}</p>
              </div>
            )}
            
            {testError && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 font-medium text-sm">test error</span>
                </div>
                <p className="text-red-300 text-sm">{testError}</p>
              </div>
            )}
          
          <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-slate-400">
              <strong>how to test:</strong> click "test extension" to try the extension in a live browser environment. no installation required!
            </p>
            <p className="text-xs text-slate-400">
              <strong>how to install:</strong> after downloading, go to <Link href="chrome://extensions/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">chrome://extensions/</Link>, extract the zip file and hit load unpacked in developer mode.
            </p>
          </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4 text-sm text-slate-400">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>created by {project.author.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(project.created_at)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-white font-medium text-sm">extension files ({files.length})</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto bg-slate-700/30 rounded-lg p-3">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0"></div>
                    <span className="text-slate-300 font-mono text-xs">{file.file_path}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="space-y-4 pt-4 border-t border-slate-600">
            <div>
              <h3 className="text-white text-lg font-semibold mb-2">create your own extension</h3>
              <p className="text-slate-300 text-sm mb-4">
                want to build extensions like this? try chromie for free!
              </p>
            </div>
            
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                <span>describe your idea, we'll write the code</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                <span>test from within the app or on shared links</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                <span>publish, share or download your extension</span>
              </div>
            </div>
            
            <Button asChild className="w-full bg-gradient-to-r from-black to-gray-800 hover:from-gray-900 hover:to-black font-medium">
              <Link href="/" className="flex items-center justify-center">
                start building for free
                <ExternalLink className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Test Extension Modal */}
      <TestModal
        isOpen={isTestModalOpen}
        onClose={handleCloseTestModal}
        sessionData={testSessionData}
        onRefresh={handleTestExtension}
        isLoading={isTestLoading}
        loadingProgress={loadingProgress}
        projectId={projectData?.project?.id}
      />
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        redirectUrl={window.location.pathname}
      />
      </main>
    </div>
  )
}