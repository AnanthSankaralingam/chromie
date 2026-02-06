"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Download, TestTube, LogOut, Sparkles, Menu, X, Bot, Play, ChevronDown, History, FileCode, Lock, BarChart3 } from "lucide-react"
import { useSession } from '@/components/SessionProviderClient'
import { useState, useEffect } from 'react'
import { useOnboarding } from '@/hooks/use-onboarding'
import { useShareExtension } from '@/hooks/use-share-extension'
import { usePaidPlan } from '@/hooks/use-paid-plan'
import PublishModal from "@/components/ui/modals/modal-publish"
import ShareModal from "@/components/ui/modals/share-extension"
import ShareDropdown from "@/components/ui/share-dropdown"
import GithubExportStatusModal from "@/components/ui/modals/github-export-status-modal"
import PrivacyPolicyInfoModal from "@/components/ui/modals/privacy-policy-info-modal"
import MetricsComingSoonModal from "@/components/ui/modals/metrics-coming-soon-modal"
import TestingReplaysModal from "@/components/ui/modals/testing-replays-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/forms-and-input/dropdown-menu"

export default function AppBarBuilder({
  onTestExtension,
  onTestWithAI,
  onExecuteTestingAgent,
  onDownloadZip,
  onSignOut,
  onGeneratePuppeteerTests,
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
  onAddMetrics,
  tourTestButtonId,
  tourTestWithAIButtonId,
  tourShareButtonId,
  onTourTestComplete,
  onTourShareComplete,
  hasSavedAITestResults = false,
  hasGithubRepo = false,
}) {
  const { user } = useSession()
  const { isPaid, isLoading: isLoadingPaidPlan } = usePaidPlan()
  // Ensure boolean values to prevent runtime errors
  const userIsPaid = Boolean(isPaid)
  const isStillLoading = Boolean(isLoadingPaidPlan)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [isPrivacyPolicyInfoOpen, setIsPrivacyPolicyInfoOpen] = useState(false)
  const [isMetricsComingSoonOpen, setIsMetricsComingSoonOpen] = useState(false)
  const [isTestingReplaysModalOpen, setIsTestingReplaysModalOpen] = useState(false)
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

  const [isExportingToGithub, setIsExportingToGithub] = useState(false)
  const [githubModalOpen, setGithubModalOpen] = useState(false)
  const [githubModalStatus, setGithubModalStatus] = useState("idle")
  const [githubModalMessage, setGithubModalMessage] = useState("")
  const [githubModalRepoUrl, setGithubModalRepoUrl] = useState("")
  const [githubModalRepoName, setGithubModalRepoName] = useState("")
  
  // Fork project state
  const [isForkLoading, setIsForkLoading] = useState(false)

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
    if (!userIsPaid && !isStillLoading) {
      // Redirect to pricing page for non-paid users
      window.location.href = '/pricing'
      return
    }
    stopAllHighlights()
    if (onExecuteTestingAgent) {
      onExecuteTestingAgent()
    } else {
      onTestWithAI?.()
    }
  }

  const handleCreateTestingAgentClick = () => {
    if (!userIsPaid && !isStillLoading) {
      // Redirect to pricing page for non-paid users
      window.location.href = '/pricing'
      return
    }
    setIsAITestDropdownOpen(false)
    onCreateAITestAgent?.()
  }

  const handleViewAIAnalysisClick = () => {
    if (!userIsPaid && !isStillLoading) {
      // Redirect to pricing page for non-paid users
      window.location.href = '/pricing'
      return
    }
    setIsAITestDropdownOpen(false)
    onTestWithAI?.(true) // viewOnly = true
  }

  const handleViewTestingReplaysClick = () => {
    setIsAITestDropdownOpen(false)
    setIsTestingReplaysModalOpen(true)
  }

  const handleDownloadClick = () => {
    stopAllHighlights()
    onDownloadZip?.()
  }

  const handleShareClick = () => {
    stopAllHighlights()
    if (!userIsPaid && !isStillLoading) {
      window.location.href = '/pricing'
      return
    }
    openShareModal()
    onTourShareComplete?.()
  }

  const handleAddMetricsClick = () => {
    stopAllHighlights()
    setIsMetricsComingSoonOpen(true)
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

  const handlePrivacyPolicyClick = () => {
    setIsPrivacyPolicyInfoOpen(true)
  }

  const handlePrivacyPolicyContinue = () => {
    setIsPrivacyPolicyInfoOpen(false)
    window.location.href = '/privacy-policy'
  }

  const handleForkClick = async () => {
    stopAllHighlights()

    if (!projectId) {
      console.error('[fork] No project ID available for forking')
      return
    }

    try {
      console.log('[fork] Starting fork for project', { projectId })
      setIsForkLoading(true)

      const response = await fetch(`/api/projects/${projectId}/fork`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (!response.ok) {
        const message = data.error || 'Failed to fork project'
        console.error('[fork] Fork failed:', message)
        
        setGithubModalStatus("error")
        setGithubModalMessage(message)
        setGithubModalRepoUrl("")
        setGithubModalRepoName("")
        setGithubModalOpen(true)
        return
      }

      console.log('[fork] Fork completed successfully', data)

      // Show success modal
      setGithubModalStatus("success")
      setGithubModalMessage(`Project forked successfully as "${data.project.name}". Redirecting to the forked project...`)
      setGithubModalRepoUrl("")
      setGithubModalRepoName("")
      setGithubModalOpen(true)

      // Store project ID and navigate to builder after brief delay
      setTimeout(() => {
        sessionStorage.setItem('chromie_current_project_id', data.project.id)
        window.location.href = `/builder?project=${data.project.id}`
      }, 2000)

    } catch (error) {
      console.error('[fork] Error forking project:', error)
      setGithubModalStatus("error")
      setGithubModalMessage(error.message || "Failed to fork project.")
      setGithubModalRepoUrl("")
      setGithubModalRepoName("")
      setGithubModalOpen(true)
    } finally {
      setIsForkLoading(false)
    }
  }

  const handleExportToGithubClick = async () => {
    stopAllHighlights()

    if (!userIsPaid && !isStillLoading) {
      window.location.href = '/pricing'
      return
    }

    if (!projectId) {
      console.error('[github-export] No project ID available for export')
      return
    }

    try {
      console.log('[github-export] Starting export for project', { projectId })
      setIsExportingToGithub(true)

      const response = await fetch(`/api/projects/${projectId}/export-to-github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        const message = data.error || 'Failed to export project to GitHub'
        console.error('[github-export] Export failed:', message)

        if (response.status === 400 && message.toLowerCase().includes('github account not connected')) {
          setGithubModalStatus("error")
          setGithubModalMessage("Please connect your GitHub account from the Profile page first, then try exporting again.")
          setGithubModalRepoUrl("")
          setGithubModalRepoName("")
          setGithubModalOpen(true)
        } else {
          setGithubModalStatus("error")
          setGithubModalMessage(message)
          setGithubModalRepoUrl("")
          setGithubModalRepoName("")
          setGithubModalOpen(true)
        }
        return
      }

      console.log('[github-export] Export completed successfully', data)

      const repoFullName = data.repo?.full_name || data.repoFullName || 'GitHub repository'
      const htmlUrl = data.repo?.html_url || data.htmlUrl

      setGithubModalStatus("success")
      setGithubModalMessage("Your project has been exported to GitHub.")
      setGithubModalRepoUrl(htmlUrl || "")
      setGithubModalRepoName(repoFullName)
      setGithubModalOpen(true)
    } catch (error) {
      console.error('[github-export] Error exporting project to GitHub:', error)
      setGithubModalStatus("error")
      setGithubModalMessage(error.message || "Failed to export project to GitHub.")
      setGithubModalRepoUrl("")
      setGithubModalRepoName("")
      setGithubModalOpen(true)
    } finally {
      setIsExportingToGithub(false)
    }
  }

  const [isAITestDropdownOpen, setIsAITestDropdownOpen] = useState(false)


  const handleKickoffAIAnalysisClick = () => {
    if (!userIsPaid && !isStillLoading) {
      // Redirect to pricing page for non-paid users
      window.location.href = '/pricing'
      return
    }
    setIsAITestDropdownOpen(false)
    handleTestWithAIClick() // Run new test
  }

  const handleGeneratePuppeteerTestsClick = () => {
    setIsAITestDropdownOpen(false)
    onGeneratePuppeteerTests?.()
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
    <header className="px-6 py-4 bg-black backdrop-blur-md shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
            <Image src="/chromie-logo-1.png" alt="Chromie" width={32} height={32} className="shrink-0" />
            <span className="inline-block text-xl">
              <span className="font-bold bg-gradient-to-r from-gray-400 to-gray-300 bg-clip-text text-transparent">chromie</span>
              <span className="font-normal text-gray-500">.dev</span>
            </span>
          </Link>
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
                  id={tourTestButtonId}
                  onClick={handleTestClick}
                  disabled={isTestDisabled || isGenerating}
                  variant="ghost"
                  className={`rounded-full font-semibold bg-slate-50 text-slate-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 px-4 py-2 ${isTestButtonHighlighted ? 'onboarding-pulse' : ''}`}
                >
                  <Play className="h-4 w-4 mr-2" />
                  try it out
                </Button>
                <DropdownMenu open={isAITestDropdownOpen} onOpenChange={setIsAITestDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      id={tourTestWithAIButtonId}
                      disabled={isTestDisabled || isGenerating || isTestingWithAI}
                      variant="ghost"
                      className="rounded-full font-medium bg-slate-900/60 text-slate-100 border border-slate-600/60 hover:bg-slate-900 hover:border-slate-500/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 px-3 py-2 text-sm"
                      title="AI Testing Options"
                    >
                      {isTestingWithAI ? (
                        <>
                          <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                          <span>testing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          <span className="inline-flex items-center space-x-1.5">
                            <span>test with ai</span>
                            <span className="uppercase text-[9px] leading-none px-1 py-[2px] rounded-full bg-gray-900/50 text-gray-300 border-2 border-gray-500">new</span>
                          </span>
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-56 bg-slate-800/95 border-slate-700 backdrop-blur-sm"
                  >
                    <DropdownMenuItem
                      onClick={handleGeneratePuppeteerTestsClick}
                      disabled={isTestDisabled || isGenerating}
                      className="cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"
                    >
                      <FileCode className="h-4 w-4 mr-3 text-emerald-400" />
                      <span className="flex-1">
                        <span className="block">Generate Basic Tests</span>
                        <span className="block text-[11px] leading-tight text-slate-400">Basic validation (smoke tests)</span>
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleCreateTestingAgentClick}
                      disabled={isTestDisabled || isGenerating || isGeneratingTestAgent || (!userIsPaid && !isStillLoading)}
                      className={!userIsPaid && !isStillLoading ? "cursor-not-allowed text-slate-500 hover:bg-slate-800/30 hover:text-slate-500 focus:bg-slate-800/30 focus:text-slate-500" : "cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"}
                    >
                      {!userIsPaid && !isStillLoading ? (
                        <Lock className="h-4 w-4 mr-3 text-slate-500" />
                      ) : (
                        <Bot className="h-4 w-4 mr-3 text-gray-400" />
                      )}
                      <span className="flex-1">
                        <span className="block flex items-center gap-1.5">
                          {!userIsPaid && !isStillLoading && <Lock className="h-3 w-3" />}
                          {isGeneratingTestAgent ? "Creating..." : "Generate AI Agent Tests"}
                        </span>
                        <span className="block text-[11px] leading-tight text-slate-400">
                          {!userIsPaid && !isStillLoading ? "Paid feature — upgrade to unlock" : "Setup for end‑to‑end AI testing"}
                        </span>
                      </span>
                    </DropdownMenuItem>
                    
                    {hasSavedAITestResults && (
                      <DropdownMenuItem 
                        onClick={handleViewAIAnalysisClick}
                        disabled={isTestDisabled || isGenerating || isTestingWithAI || (!userIsPaid && !isStillLoading)}
                        className={!userIsPaid && !isStillLoading ? "cursor-not-allowed text-slate-500 hover:bg-slate-800/30 hover:text-slate-500 focus:bg-slate-800/30 focus:text-slate-500" : "cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"}
                      >
                        {!userIsPaid && !isStillLoading ? (
                          <Lock className="h-4 w-4 mr-3 text-slate-500" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-3 text-orange-400" />
                        )}
                        <span className="flex-1 flex items-center gap-1.5">
                          {!userIsPaid && !isStillLoading && <Lock className="h-3 w-3" />}
                          View Past AI Analysis
                        </span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={handleTestWithAIClick}
                      disabled={isTestDisabled || isGenerating || isTestingWithAI || (!userIsPaid && !isStillLoading)}
                      className={!userIsPaid && !isStillLoading ? "cursor-not-allowed text-slate-500 hover:bg-slate-800/30 hover:text-slate-500 focus:bg-slate-800/30 focus:text-slate-500" : "cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"}
                    >
                      {!userIsPaid && !isStillLoading ? (
                        <Lock className="h-4 w-4 mr-3 text-slate-500" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-3 text-gray-400" />
                      )}
                      <span className="flex-1">
                        <span className="block flex items-center gap-1.5">
                          {!userIsPaid && !isStillLoading && <Lock className="h-3 w-3" />}
                          {isTestingWithAI ? "Executing..." : "Run Tests"}
                        </span>
                        <span className="block text-[11px] leading-tight text-slate-400">
                          {!userIsPaid && !isStillLoading ? "Paid feature — upgrade to unlock" : "Runs Puppeteer → AI agent"}
                        </span>
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleViewTestingReplaysClick}
                      disabled={isTestDisabled || isGenerating || isTestingWithAI}
                      className="cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"
                    >
                      <History className="h-4 w-4 mr-3 text-blue-400" />
                      <span className="flex-1">
                        <span className="block">View Testing Replays</span>
                        <span className="block text-[11px] leading-tight text-slate-400">Watch past test recordings</span>
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={handleAddMetricsClick}
                  disabled={isTestDisabled || isGenerating}
                  variant="ghost"
                  className="rounded-full font-medium bg-slate-900/60 text-slate-100 border border-slate-600/60 hover:bg-slate-900 hover:border-slate-500/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 px-3 py-2"
                  title="Add Metrics"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  add metrics
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
                  onExportToGithubClick={handleExportToGithubClick}
                  onForkClick={handleForkClick}
                  onPrivacyPolicyClick={handlePrivacyPolicyClick}
                  isExportingToGithub={isExportingToGithub}
                  isForkLoading={isForkLoading}
                  hasGithubRepo={hasGithubRepo}
                  triggerId={tourShareButtonId}
                  isPaid={userIsPaid}
                  isLoadingPaidPlan={isStillLoading}
                />
              </div>

              <div className="flex items-center space-x-3 pl-3 border-l border-white/10">
                <Link href="/profile">
                  <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-gray-400/50 transition-all duration-200 shadow-lg">
                    <AvatarImage
                      src={user?.user_metadata?.picture}
                      alt={user?.user_metadata?.name || user?.email}
                    />
                    <AvatarFallback className="bg-white text-slate-900 text-sm font-bold">
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
            <DropdownMenu open={isAITestDropdownOpen} onOpenChange={setIsAITestDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  id={tourTestWithAIButtonId ? `${tourTestWithAIButtonId}-mobile` : undefined}
                  disabled={isTestDisabled || isGenerating || isTestingWithAI || (!userIsPaid && !isStillLoading)}
                  variant="ghost"
                  className={!userIsPaid && !isStillLoading ? "w-full text-xs rounded-full font-medium bg-slate-900/40 text-slate-500 border border-slate-700/60 hover:bg-slate-800/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200" : "w-full text-xs rounded-full font-medium bg-slate-900/60 text-slate-100 border border-slate-600/60 hover:bg-slate-900 hover:border-slate-500/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"}
                >
                  {isTestingWithAI ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                      <span>testing...</span>
                    </>
                  ) : (
                    <>
                      {!userIsPaid && !isStillLoading ? (
                        <Lock className="h-4 w-4 mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      <span className="inline-flex items-center space-x-1.5">
                        <span>test with ai</span>
                        {!userIsPaid && !isStillLoading ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <span className="uppercase text-[9px] leading-none px-1 py-[2px] rounded-full bg-blue-900/50 text-blue-300 border-2 border-blue-500">new</span>
                        )}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 bg-slate-800/95 border-slate-700 backdrop-blur-sm"
              >
                <DropdownMenuItem
                  onClick={() => { handleGeneratePuppeteerTestsClick(); setIsMobileMenuOpen(false) }}
                  disabled={isTestDisabled || isGenerating}
                  className="cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"
                >
                  <FileCode className="h-4 w-4 mr-3 text-emerald-400" />
                  <span className="flex-1">
                    <span className="block">Generate Basic Tests</span>
                    <span className="block text-[11px] leading-tight text-slate-400">Basic validation (smoke tests)</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => { handleCreateTestingAgentClick(); setIsMobileMenuOpen(false) }}
                  disabled={isTestDisabled || isGenerating || isGeneratingTestAgent || (!userIsPaid && !isStillLoading)}
                  className={!userIsPaid && !isStillLoading ? "cursor-not-allowed text-slate-500 hover:bg-slate-800/30 hover:text-slate-500 focus:bg-slate-800/30 focus:text-slate-500" : "cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"}
                >
                  {!userIsPaid && !isStillLoading ? (
                    <Lock className="h-4 w-4 mr-3 text-slate-500" />
                  ) : (
                    <Bot className="h-4 w-4 mr-3 text-blue-400" />
                  )}
                  <span className="flex-1">
                    <span className="block flex items-center gap-1.5">
                      {!userIsPaid && !isStillLoading && <Lock className="h-3 w-3" />}
                      {isGeneratingTestAgent ? "Creating..." : "Generate AI Agent Tests"}
                    </span>
                    <span className="block text-[11px] leading-tight text-slate-400">
                      {!userIsPaid && !isStillLoading ? "Paid feature — upgrade to unlock" : "Setup for end‑to‑end AI testing"}
                    </span>
                  </span>
                </DropdownMenuItem>
                
                {hasSavedAITestResults && (
                  <DropdownMenuItem 
                    onClick={() => { handleViewAIAnalysisClick(); setIsMobileMenuOpen(false) }}
                    disabled={isTestDisabled || isGenerating || isTestingWithAI || (!userIsPaid && !isStillLoading)}
                    className={!userIsPaid && !isStillLoading ? "cursor-not-allowed text-slate-500 hover:bg-slate-800/30 hover:text-slate-500 focus:bg-slate-800/30 focus:text-slate-500" : "cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"}
                  >
                    {!userIsPaid && !isStillLoading ? (
                      <Lock className="h-4 w-4 mr-3 text-slate-500" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-3 text-orange-400" />
                    )}
                    <span className="flex-1 flex items-center gap-1.5">
                      {!userIsPaid && !isStillLoading && <Lock className="h-3 w-3" />}
                      View Past AI Analysis
                    </span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => { handleKickoffAIAnalysisClick(); setIsMobileMenuOpen(false) }}
                  disabled={isTestDisabled || isGenerating || isTestingWithAI || (!userIsPaid && !isStillLoading)}
                  className={!userIsPaid && !isStillLoading ? "cursor-not-allowed text-slate-500 hover:bg-slate-800/30 hover:text-slate-500 focus:bg-slate-800/30 focus:text-slate-500" : "cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"}
                >
                  {!userIsPaid && !isStillLoading ? (
                    <Lock className="h-4 w-4 mr-3 text-slate-500" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-3 text-purple-400" />
                  )}
                  <span className="flex-1">
                    <span className="block flex items-center gap-1.5">
                      {!userIsPaid && !isStillLoading && <Lock className="h-3 w-3" />}
                      {isTestingWithAI ? "Executing..." : "Run Tests"}
                    </span>
                    <span className="block text-[11px] leading-tight text-slate-400">
                      {!userIsPaid && !isStillLoading ? "Paid feature — upgrade to unlock" : "Runs Puppeteer → AI agent"}
                    </span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => { handleViewTestingReplaysClick(); setIsMobileMenuOpen(false) }}
                  disabled={isTestDisabled || isGenerating || isTestingWithAI}
                  className="cursor-pointer text-slate-200 hover:bg-slate-700/50 hover:text-white focus:bg-slate-700/50 focus:text-white"
                >
                  <History className="h-4 w-4 mr-3 text-blue-400" />
                  <span className="flex-1">
                    <span className="block">View Testing Replays</span>
                    <span className="block text-[11px] leading-tight text-slate-400">Watch past test recordings</span>
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              id={tourTestButtonId ? `${tourTestButtonId}-mobile` : undefined}
              onClick={() => { handleTestClick(); setIsMobileMenuOpen(false) }}
              disabled={isTestDisabled || isGenerating}
              variant="ghost"
              className={`w-full rounded-full font-semibold bg-slate-50 text-slate-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 ${isTestButtonHighlighted ? 'onboarding-pulse' : ''}`}
            >
              <Play className="h-4 w-4 mr-2" />
              try it out
            </Button>
            <Button
              onClick={() => { handleAddMetricsClick(); setIsMobileMenuOpen(false) }}
              disabled={isTestDisabled || isGenerating}
              variant="ghost"
              className="w-full rounded-full font-medium bg-slate-900/60 text-slate-100 border border-slate-600/60 hover:bg-slate-900 hover:border-slate-500/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              add metrics
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
                onExportToGithubClick={() => { handleExportToGithubClick(); setIsMobileMenuOpen(false) }}
                onForkClick={() => { handleForkClick(); setIsMobileMenuOpen(false) }}
                onPrivacyPolicyClick={() => { handlePrivacyPolicyClick(); setIsMobileMenuOpen(false) }}
                isExportingToGithub={isExportingToGithub}
                isForkLoading={isForkLoading}
                hasGithubRepo={hasGithubRepo}
                className="w-full"
                triggerId={tourShareButtonId ? `${tourShareButtonId}-mobile` : undefined}
                isPaid={userIsPaid}
                isLoadingPaidPlan={isStillLoading}
              />
            </div>
          </div>
        </div>
      )}
      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        projectId={projectId}
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
      <GithubExportStatusModal
        isOpen={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        status={githubModalStatus}
        message={githubModalMessage}
        repoUrl={githubModalRepoUrl}
        repoName={githubModalRepoName}
      />
      <PrivacyPolicyInfoModal
        isOpen={isPrivacyPolicyInfoOpen}
        onClose={() => setIsPrivacyPolicyInfoOpen(false)}
        onContinue={handlePrivacyPolicyContinue}
      />
      <MetricsComingSoonModal
        isOpen={isMetricsComingSoonOpen}
        onClose={() => setIsMetricsComingSoonOpen(false)}
      />
      <TestingReplaysModal
        isOpen={isTestingReplaysModalOpen}
        onClose={() => setIsTestingReplaysModalOpen(false)}
        projectId={projectId}
      />
    </header>
  )
} 