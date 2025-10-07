"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, User, Calendar, AlertCircle, Loader2, ExternalLink, LogIn, Lock, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useSession } from '@/components/SessionProviderClient'

export default function ShareExtensionPage({ token }) {
  const { user } = useSession()
  const [projectData, setProjectData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)

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
      setDownloadError('Please sign in to download this extension')
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading Extension</h2>
          <p className="text-slate-400">Fetching project details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="w-full max-w-md bg-slate-800/95 border-slate-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <CardTitle className="text-white text-xl">Extension Not Found</CardTitle>
            <CardDescription className="text-slate-400">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Link href="/">
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Chromie
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
    <main className="max-w-2xl mx-auto px-6 py-8">
      <Card className="bg-slate-800/95 border-slate-700 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-white text-2xl mb-2">{project.author.name.split(' ')[0]} shared their Chrome extension with you!</CardTitle>
          <CardDescription className="text-slate-400 text-lg">
            {project.name} - {project.description || 'A Chrome extension built with Chromie'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Download Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Download className="h-5 w-5 text-white" />
              <h3 className="text-white text-lg font-semibold">Download Extension</h3>
            </div>
          {!user ? (
            <div className="space-y-4">
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Lock className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-400 font-medium">Authentication Required</span>
                </div>
                <p className="text-amber-300 text-sm">
                  You need to sign in to download this extension. This helps prevent abuse and ensures a secure experience.
                </p>
              </div>
              
              <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-medium">
                <Link href="/auth/callback">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In to Download
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 font-medium"
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  'Download Extension'
                )}
              </Button>
              
              {downloadError && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 font-medium text-sm">Download Error</span>
                  </div>
                  <p className="text-red-300 text-sm">{downloadError}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-400">
              <strong>How to install:</strong> After downloading, go to <Link href="chrome://extensions/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">chrome://extensions/</Link>, extract the zip file and hit load unpacked in developer mode.
            </p>
          </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4 text-sm text-slate-400">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Created by {project.author.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(project.created_at)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-white font-medium text-sm">Extension Files ({files.length})</h4>
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
              <h3 className="text-white text-lg font-semibold mb-2">Create Your Own Extension</h3>
              <p className="text-slate-300 text-sm mb-4">
                Want to build extensions like this? Try Chromie for free!
              </p>
            </div>
            
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                <span>Describe your idea, we'll write the code</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                <span>Test from within the app</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                <span>Publish, share or download your extension</span>
              </div>
            </div>
            
            <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-medium">
              <Link href="/">
                <ExternalLink className="h-4 w-4 mr-2" />
                Start Building for Free
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}