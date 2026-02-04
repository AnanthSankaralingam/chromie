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
  onVersionHistoryClick,
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
            </div>
            <div className="flex flex-col">
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent hover:from-gray-300 hover:to-gray-400 transition-all duration-300">
                chromie
              </Link>
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
                  onClick={() => {
                    if (!userIsPaid && !isStillLoading) {
                      window.location.href = '/pricing'
                      return
                    }
                    onVersionHistoryClick?.()
                  }}
                  disabled={isTestDisabled || isGenerating || (!userIsPaid && !isStillLoading)}
                  variant="outline"
                  className={!userIsPaid && !isStillLoading ? "relative bg-slate-900 text-slate-500 hover:text-slate-500 hover:bg-slate-800/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 px-3 py-2" : "relative bg-slate-900 text-amber-400 hover:text-white hover:bg-slate-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 px-3 py-2 enabled:shadow-lg enabled:shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 enabled:scale-100 hover:scale-105"}
                  style={!userIsPaid && !isStillLoading ? {} : { backgroundClip: 'padding-box', border: '2px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(251 191 36), rgb(245 158 11))', backgroundOrigin: 'border-box' }}
                  title={!userIsPaid && !isStillLoading ? "Version History (Paid feature — upgrade to unlock)" : "Version History"}
                >
                  {!userIsPaid && !isStillLoading ? <Lock className="h-4 w-4" /> : <History className="h-4 w-4" />}
                </Button>
                <Button
                  id={tourTestButtonId}
                  onClick={handleTestClick}
                  disabled={isTestDisabled || isGenerating}
                  variant="outline"
                  className={`relative bg-slate-900 text-green-400 hover:text-white hover:bg-slate-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 px-4 py-2 font-medium enabled:shadow-lg enabled:shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 enabled:scale-100 hover:scale-105 ${isTestButtonHighlighted ? 'onboarding-pulse' : ''}`}
                  style={{ backgroundClip: 'padding-box', border: '3px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(34 197 94), rgb(20 184 166))', backgroundOrigin: 'border-box' }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  try it out
                </Button>
                <DropdownMenu open={isAITestDropdownOpen} onOpenChange={setIsAITestDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      id={tourTestWithAIButtonId}
                      disabled={isTestDisabled || isGenerating || isTestingWithAI}
                      variant="outline"
                      className="relative bg-slate-900 text-gray-400 hover:text-white hover:bg-slate-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 px-3 py-2 font-medium text-sm enabled:shadow-lg enabled:shadow-gray-500/20 hover:shadow-xl hover:shadow-gray-500/30 enabled:scale-100 hover:scale-105"
                      style={{ backgroundClip: 'padding-box', border: '3px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(156 163 175), rgb(209 213 219))', backgroundOrigin: 'border-box' }}
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
                  variant="outline"
                  className="relative bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 px-3 py-2 font-medium enabled:shadow-lg enabled:shadow-slate-500/10 hover:shadow-xl hover:shadow-slate-500/20 enabled:scale-100 hover:scale-105"
                  style={{ backgroundClip: 'padding-box', border: '2px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(100 116 139), rgb(71 85 105))', backgroundOrigin: 'border-box' }}
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
            <Button
              onClick={() => {
                if (!userIsPaid && !isStillLoading) {
                  window.location.href = '/pricing'
                  return
                }
                onVersionHistoryClick?.()
                setIsMobileMenuOpen(false)
              }}
              disabled={isTestDisabled || isGenerating || (!userIsPaid && !isStillLoading)}
              variant="outline"
              className={!userIsPaid && !isStillLoading ? "w-full bg-slate-900 text-slate-500 hover:text-slate-500 hover:bg-slate-800/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200" : "w-full bg-slate-900 text-amber-400 hover:text-white hover:bg-slate-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"}
              style={!userIsPaid && !isStillLoading ? {} : { backgroundClip: 'padding-box', border: '2px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(251 191 36), rgb(245 158 11))', backgroundOrigin: 'border-box' }}
            >
              {!userIsPaid && !isStillLoading ? <Lock className="h-4 w-4 mr-2" /> : <History className="h-4 w-4 mr-2" />}
              Version History
            </Button>
            <DropdownMenu open={isAITestDropdownOpen} onOpenChange={setIsAITestDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  id={tourTestWithAIButtonId ? `${tourTestWithAIButtonId}-mobile` : undefined}
                  disabled={isTestDisabled || isGenerating || isTestingWithAI || (!userIsPaid && !isStillLoading)}
                  variant="outline"
                  className={!userIsPaid && !isStillLoading ? "w-full text-xs bg-slate-900 text-slate-500 hover:text-slate-500 hover:bg-slate-800/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200" : "w-full text-xs bg-slate-900 text-blue-400 hover:text-white hover:bg-slate-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 enabled:shadow-lg enabled:shadow-blue-500/20"}
                  style={!userIsPaid && !isStillLoading ? {} : { backgroundClip: 'padding-box', border: '3px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(59 130 246), rgb(14 165 233))', backgroundOrigin: 'border-box' }}
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
              variant="outline"
              className={`w-full bg-slate-900 text-green-400 hover:text-white hover:bg-slate-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 enabled:shadow-lg enabled:shadow-green-500/20 ${isTestButtonHighlighted ? 'onboarding-pulse' : ''}`}
              style={{ backgroundClip: 'padding-box', border: '3px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(34 197 94), rgb(20 184 166))', backgroundOrigin: 'border-box' }}
            >
              <Play className="h-4 w-4 mr-2" />
              try it out
            </Button>
            <Button
              onClick={() => { handleAddMetricsClick(); setIsMobileMenuOpen(false) }}
              disabled={isTestDisabled || isGenerating}
              variant="outline"
              className="w-full bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 enabled:shadow-lg enabled:shadow-slate-500/10"
              style={{ backgroundClip: 'padding-box', border: '2px solid transparent', backgroundImage: 'linear-gradient(rgb(15 23 42), rgb(15 23 42)), linear-gradient(to right, rgb(100 116 139), rgb(71 85 105))', backgroundOrigin: 'border-box' }}
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