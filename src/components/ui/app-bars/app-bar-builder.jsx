"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Download, TestTube, LogOut, Sparkles, Menu, X, MessageSquare, Bot, Play } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import { useState, useEffect } from 'react'
import { useOnboarding } from '@/hooks/use-onboarding'
import { useShareExtension } from '@/hooks/use-share-extension'
import PublishModal from "@/components/ui/modals/modal-publish"
import ShareModal from "@/components/ui/modals/share-extension"
import ShareDropdown from "@/components/ui/share-dropdown"

export default function AppBarBuilder({ 
  onTestExtension, 
  onDownloadZip, 
  onSignOut, 
  projectId,
  isTestDisabled = false,
  isDownloadDisabled = false,
  isGenerating = false,
  isDownloading = false,
  shouldStartTestHighlight = false,
  shouldStartDownloadHighlight = false,
  onFeedbackClick,
  onCreateAITestAgent
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
  
  const {
    isShareModalOpen,
    shareUrl,
    isGenerating: isSharing,
    error: shareError,
    successMessage: shareSuccessMessage,
    openShareModal,
    closeShareModal,
    generateShareLink
  } = useShareExtension()

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

  const handleShareClick = () => {
    stopAllHighlights()
    openShareModal()
  }

  const handleShareConfirm = () => {
    if (projectId) {
      generateShareLink(projectId)
    }
  }

  const handlePublishClick = () => {
    console.log('[publish] open modal')
    setIsPublishOpen(true)
  }

  const handleFeedbackClick = () => {
    onFeedbackClick?.()
  }

  const handleCreateAITestAgent = () => {
    onCreateAITestAgent?.()
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
    <header className="border-b border-white/10 px-6 py-4 bg-gradient-to-r from-slate-900/95 via-black/20 to-slate-900/95 backdrop-blur-md shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <Image 
                  src="/chromie-logo-1.png" 
                  alt="chromie Logo"   
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
                  onClick={handleCreateAITestAgent}
                  disabled={isTestDisabled || isGenerating}
                  variant="outline"
                  className="relative bg-slate-900 text-blue-300 hover:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 px-3 py-2 font-medium text-sm hover:bg-slate-800"
                  style={{backgroundClip: 'padding-box', border: '3px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(37 99 235), rgb(8 145 178))', backgroundOrigin: 'border-box'}}
                  title="Generate automated test script for your extension"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  <span className="inline-flex items-center space-x-1.5">
                    <span>create ai testing agent</span>
                    <span className="uppercase text-[9px] leading-none px-1 py-[2px] rounded-full bg-blue-900/50 text-blue-300 border-2 border-blue-600">beta</span>
                  </span>
                </Button>
                <Button
                  onClick={handleTestClick}
                  disabled={isTestDisabled || isGenerating}
                  variant="outline"
                  className={`relative bg-slate-900 text-green-300 hover:text-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 px-4 py-2 font-medium hover:bg-slate-800 ${isTestButtonHighlighted ? 'onboarding-pulse' : ''}`}
                  style={{backgroundClip: 'padding-box', border: '3px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(34 197 94), rgb(20 184 166))', backgroundOrigin: 'border-box'}}
                >
                  <Play className="h-4 w-4 mr-2" />
                  test extension
                </Button>
                <ShareDropdown
                  projectId={projectId}
                  isDownloading={isDownloading}
                  isSharing={isSharing}
                  isGenerating={isGenerating}
                  isTestDisabled={isTestDisabled}
                  onDownloadZip={handleDownloadClick}
                  onShareClick={handleShareClick}
                  onPublishClick={handlePublishClick}
                />
                <Button 
                  onClick={handleFeedbackClick}
                  disabled={!projectId}
                  variant="outline"
                  className="relative bg-slate-900 text-indigo-300 hover:text-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 px-4 py-2 font-medium hover:bg-slate-800"
                  style={{backgroundClip: 'padding-box', border: '3px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(99 102 241), rgb(168 85 247))', backgroundOrigin: 'border-box'}}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  feedback
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
              onClick={() => { handleCreateAITestAgent(); setIsMobileMenuOpen(false) }}
              disabled={isTestDisabled || isGenerating}
              variant="outline"
              className="w-full text-xs bg-slate-900 text-blue-300 hover:text-blue-200 hover:bg-slate-800"
              style={{backgroundClip: 'padding-box', border: '3px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(37 99 235), rgb(8 145 178))', backgroundOrigin: 'border-box'}}
            >
              <Bot className="h-4 w-4 mr-2" />
              <span className="inline-flex items-center space-x-1.5">
                <span>create ai testing agent</span>
                <span className="uppercase text-[9px] leading-none px-1 py-[2px] rounded-full bg-blue-900/50 text-blue-300 border-2 border-blue-600">beta</span>
              </span>
            </Button>
            <Button
              onClick={() => { handleTestClick(); setIsMobileMenuOpen(false) }}
              disabled={isTestDisabled || isGenerating}
              variant="outline"
              className={`w-full bg-slate-900 text-green-300 hover:text-green-200 hover:bg-slate-800 ${isTestButtonHighlighted ? 'onboarding-pulse' : ''}`}
              style={{backgroundClip: 'padding-box', border: '3px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(34 197 94), rgb(20 184 166))', backgroundOrigin: 'border-box'}}
            >
              <Play className="h-4 w-4 mr-2" />
              test
            </Button>
            <div className="w-full">
              <ShareDropdown
                projectId={projectId}
                isDownloading={isDownloading}
                isSharing={isSharing}
                isGenerating={isGenerating}
                isTestDisabled={isTestDisabled}
                onDownloadZip={() => { handleDownloadClick(); setIsMobileMenuOpen(false) }}
                onShareClick={() => { handleShareClick(); setIsMobileMenuOpen(false) }}
                onPublishClick={() => { handlePublishClick(); setIsMobileMenuOpen(false) }}
                className="w-full"
              />
            </div>
            <Button
              onClick={() => { handleFeedbackClick(); setIsMobileMenuOpen(false) }}
              disabled={!projectId}
              variant="outline"
              className="w-full bg-slate-900 text-indigo-300 hover:text-indigo-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{backgroundClip: 'padding-box', border: '3px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(99 102 241), rgb(168 85 247))', backgroundOrigin: 'border-box'}}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              feedback
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
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={closeShareModal} 
        onConfirm={handleShareConfirm}
        shareUrl={shareUrl}
        isGenerating={isSharing}
        error={shareError}
        successMessage={shareSuccessMessage}
      />
    </header>
  )
} 