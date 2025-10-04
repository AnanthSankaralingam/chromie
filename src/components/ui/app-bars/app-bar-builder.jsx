"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Download, TestTube, LogOut, Sparkles, Menu, X, Upload } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import { useState, useEffect } from 'react'
import { useOnboarding } from '@/hooks/use-onboarding'
import PublishModal from "@/components/ui/modals/modal-publish"

export default function AppBarBuilder({ 
  onTestExtension, 
  onDownloadZip, 
  onSignOut, 
  isTestDisabled = false,
  isDownloadDisabled = false,
  isGenerating = false,
  isDownloading = false,
  shouldStartTestHighlight = false,
  shouldStartDownloadHighlight = false
}) {
  const { user } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const {
    isTestButtonHighlighted,
    isDownloadButtonHighlighted,
    startTestButtonHighlight,
    startDownloadButtonHighlight,
    stopAllHighlights
  } = useOnboarding()

  // Handle highlight triggers
  useEffect(() => {
    if (shouldStartTestHighlight) {
      startTestButtonHighlight()
    }
  }, [shouldStartTestHighlight, startTestButtonHighlight])

  useEffect(() => {
    if (shouldStartDownloadHighlight) {
      startDownloadButtonHighlight()
    }
  }, [shouldStartDownloadHighlight, startDownloadButtonHighlight])

  // Stop highlights when user interacts with buttons
  const handleTestClick = () => {
    stopAllHighlights()
    onTestExtension?.()
  }

  const handleDownloadClick = () => {
    stopAllHighlights()
    onDownloadZip?.()
  }

  const handlePublishClick = () => {
    console.log('[publish] open modal')
    setIsPublishOpen(true)
  }

  // Helper function to get user initials
  const getUserInitials = (user) => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  return (
    <header className="border-b border-white/10 px-6 py-4 bg-gradient-to-r from-slate-900/95 via-purple-900/20 to-slate-900/95 backdrop-blur-md shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <Image 
                  src="/chromie-logo-1.png" 
                  alt="Chromie AI Logo" 
                  width={40} 
                  height={40}
                  className="object-contain"
                />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Sparkles className="h-2.5 w-2.5 text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent hover:from-purple-300 hover:to-blue-300 transition-all duration-300">
                chromie
              </Link>
              <span className="text-xs text-slate-400 font-medium tracking-wide">Lovable for chrome extensions</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {user && (
            <>
              <button
                className="sm:hidden p-2 text-slate-300 hover:text-white"
                aria-label="Open menu"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="hidden sm:flex items-center space-x-3">
                <Button
                  onClick={handleTestClick}
                  disabled={isTestDisabled || isGenerating}
                  className={`bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 px-4 py-2 font-medium ${isTestButtonHighlighted ? 'onboarding-pulse' : ''}`}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  test extension
                </Button>
                <Button 
                  onClick={handlePublishClick}
                  disabled={isTestDisabled || isGenerating}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-pink-500/25 transition-all duration-200 px-4 py-2 font-medium"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  publish
                </Button>
                <Button 
                  onClick={handleDownloadClick} 
                  disabled={isDownloadDisabled || isDownloading}
                  className={`bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25 transition-all duration-200 px-4 py-2 font-medium ${isDownloadButtonHighlighted ? 'onboarding-pulse-download' : ''}`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      downloading...
                    </>
                  ) : (
                    "download zip"
                  )}
                </Button>
              </div>
              
              <div className="flex items-center space-x-3 pl-3 border-l border-white/10">
                <Link href="/profile">
                  <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-purple-400/50 transition-all duration-200 shadow-lg">
                    <AvatarImage 
                      src={user?.user_metadata?.picture} 
                      alt={user?.user_metadata?.name || user?.email}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-sm font-bold">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <Button 
                  onClick={onSignOut} 
                  variant="ghost" 
                  className="text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200 p-2"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-white/10 mt-3 pt-3">
          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => { handleTestClick(); setIsMobileMenuOpen(false) }}
              disabled={isTestDisabled || isGenerating}
              className={`w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 ${isTestButtonHighlighted ? 'onboarding-pulse' : ''}`}
            >
              <TestTube className="h-4 w-4 mr-2" />
              test extension
            </Button>
            <Button
              onClick={() => { handlePublishClick(); setIsMobileMenuOpen(false) }}
              disabled={isTestDisabled || isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-4 w-4 mr-2" />
              publish
            </Button>
            <Button
              onClick={() => { handleDownloadClick(); setIsMobileMenuOpen(false) }}
              disabled={isDownloadDisabled || isDownloading}
              className={`w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 ${isDownloadButtonHighlighted ? 'onboarding-pulse-download' : ''}`}
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "downloading..." : "download zip"}
            </Button>
          </div>
        </div>
      )}
      <PublishModal 
        isOpen={isPublishOpen} 
        onClose={() => setIsPublishOpen(false)} 
        onConfirm={() => {
          // TODO: implement zipping and publish to Chrome Web Store via supabase and oauth
          console.log('[publish] confirm requested')
          setIsPublishOpen(false)
        }}
      />
    </header>
  )
} 