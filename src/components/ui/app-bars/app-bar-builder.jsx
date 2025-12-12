"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Download, TestTube, LogOut, Sparkles, Menu, X, Bot, Play, ChevronDown } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import { useState, useEffect } from 'react'
import { useOnboarding } from '@/hooks/use-onboarding'
import { useShareExtension } from '@/hooks/use-share-extension'
import PublishModal from "@/components/ui/modals/modal-publish"
import ShareModal from "@/components/ui/modals/share-extension"
import ShareDropdown from "@/components/ui/share-dropdown"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/forms-and-input/dropdown-menu"
import { cn } from "@/lib/utils"

export default function AppBarBuilder({
  onTestExtension,
  onTestWithAI,
  onDownloadZip,
  onSignOut,
  projectId,
  isTestDisabled = false,
  isDownloadDisabled = false,
  isGenerating = false,
  isDownloading = false,
  isTestingWithAI = false,
  isGeneratingTestAgent = false,
  shouldStartTestHighlight = false,
  shouldStartDownloadHighlight = false,
  onCreateAITestAgent,
  tourTestButtonId,
  tourTestWithAIButtonId,
  tourShareButtonId,
  onTourTestComplete,
  onTourShareComplete,
  hasSavedAITestResults = false,
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
    onTourTestComplete?.()
  }

  const handleTestWithAIClick = () => {
    stopAllHighlights()
    onTestWithAI?.()
  }

  const handleDownloadClick = () => {
    stopAllHighlights()
    onDownloadZip?.()
  }

  const handleShareClick = () => {
    stopAllHighlights()
    openShareModal()
    onTourShareComplete?.()
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

  const handleCreateAITestAgent = () => {
    onCreateAITestAgent?.()
  }

  const [isAITestDropdownOpen, setIsAITestDropdownOpen] = useState(false)

  const handleCreateTestingAgentClick = () => {
    setIsAITestDropdownOpen(false)
    handleCreateAITestAgent()
  }

  const handleViewAIAnalysisClick = () => {
    setIsAITestDropdownOpen(false)
    onTestWithAI?.(true) // Pass viewOnly=true to view saved results
  }

  const handleKickoffAIAnalysisClick = () => {
    setIsAITestDropdownOpen(false)
    handleTestWithAIClick() // Run new test
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
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container-width flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">chromie</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <>
              <button
                className="sm:hidden p-2 text-muted-foreground hover:text-foreground"
                aria-label="Open menu"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="hidden sm:flex items-center gap-3">
                <Button
                  id={tourTestButtonId}
                  onClick={handleTestClick}
                  disabled={isTestDisabled || isGenerating}
                  className={cn(
                    "btn-primary shadow-lg shadow-primary/20 hover:shadow-primary/30",
                    isTestButtonHighlighted && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <Play className="h-4 w-4 mr-2 fill-current" />
                  Try it out
                </Button>

                <DropdownMenu open={isAITestDropdownOpen} onOpenChange={setIsAITestDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      id={tourTestWithAIButtonId}
                      disabled={isTestDisabled || isGenerating || isTestingWithAI}
                      variant="outline"
                      className="border-border/50 hover:bg-secondary/50"
                    >
                      {isTestingWithAI ? (
                        <>
                          <Sparkles className="h-4 w-4 mr-2 animate-spin text-primary" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2 text-primary" />
                          <span className="flex items-center gap-2">
                            Test with AI
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                              Beta
                            </span>
                          </span>
                          <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={handleCreateTestingAgentClick}
                      disabled={isTestDisabled || isGenerating || isGeneratingTestAgent}
                    >
                      <Bot className="h-4 w-4 mr-2 text-primary" />
                      <span>
                        {isGeneratingTestAgent ? "Creating..." : "Create Testing Agent"}
                      </span>
                    </DropdownMenuItem>

                    {hasSavedAITestResults && (
                      <DropdownMenuItem
                        onClick={handleViewAIAnalysisClick}
                        disabled={isTestDisabled || isGenerating || isTestingWithAI}
                      >
                        <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
                        <span>View Past AI Analysis</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={handleKickoffAIAnalysisClick}
                      disabled={isTestDisabled || isGenerating || isTestingWithAI}
                    >
                      <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                      <span>
                        {isTestingWithAI ? "Running..." : "Kickoff AI Analysis"}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <ShareDropdown
                  projectId={projectId}
                  isDownloading={isDownloading}
                  isSharing={isSharing}
                  isGenerating={isGenerating}
                  isTestDisabled={isTestDisabled}
                  onDownloadZip={handleDownloadClick}
                  onShareClick={handleShareClick}
                  onPublishClick={handlePublishClick}
                  triggerId={tourShareButtonId}
                />
              </div>

              <div className="flex items-center gap-3 pl-3 border-l border-border/50">
                <Link href="/profile">
                  <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
                    <AvatarImage
                      src={user?.user_metadata?.picture}
                      alt={user?.user_metadata?.name || user?.email}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <Button
                  onClick={onSignOut}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
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
        <div className="sm:hidden border-t border-border/50 p-4 space-y-4 bg-background/95 backdrop-blur-md">
          <DropdownMenu open={isAITestDropdownOpen} onOpenChange={setIsAITestDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                id={tourTestWithAIButtonId ? `${tourTestWithAIButtonId}-mobile` : undefined}
                disabled={isTestDisabled || isGenerating || isTestingWithAI}
                variant="outline"
                className="w-full justify-between"
              >
                {isTestingWithAI ? (
                  <>
                    <span className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 animate-spin text-primary" />
                      Testing...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 text-primary" />
                      Test with AI
                      <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                        Beta
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-full">
              <DropdownMenuItem
                onClick={() => { handleCreateTestingAgentClick(); setIsMobileMenuOpen(false) }}
                disabled={isTestDisabled || isGenerating || isGeneratingTestAgent}
              >
                <Bot className="h-4 w-4 mr-2 text-primary" />
                <span>
                  {isGeneratingTestAgent ? "Creating..." : "Create Testing Agent"}
                </span>
              </DropdownMenuItem>

              {hasSavedAITestResults && (
                <DropdownMenuItem
                  onClick={() => { handleViewAIAnalysisClick(); setIsMobileMenuOpen(false) }}
                  disabled={isTestDisabled || isGenerating || isTestingWithAI}
                >
                  <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
                  <span>View Past AI Analysis</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => { handleKickoffAIAnalysisClick(); setIsMobileMenuOpen(false) }}
                disabled={isTestDisabled || isGenerating || isTestingWithAI}
              >
                <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                <span>
                  {isTestingWithAI ? "Running..." : "Kickoff AI Analysis"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            id={tourTestButtonId ? `${tourTestButtonId}-mobile` : undefined}
            onClick={() => { handleTestClick(); setIsMobileMenuOpen(false) }}
            disabled={isTestDisabled || isGenerating}
            className={cn(
              "w-full btn-primary",
              isTestButtonHighlighted && "ring-2 ring-primary ring-offset-2"
            )}
          >
            <Play className="h-4 w-4 mr-2 fill-current" />
            Try it out
          </Button>

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
            triggerId={tourShareButtonId ? `${tourShareButtonId}-mobile` : undefined}
          />
        </div>
      )}

      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        onConfirm={() => {
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