"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Download, TestTube, LogOut, Sparkles, Menu, X, Bot, Play, ChevronDown, History, FileCode, BarChart3 } from "lucide-react"
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
import PaywallModal from "@/components/ui/modals/modal-paywall"
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

  // Paywall modal state
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [paywallFeatureName, setPaywallFeatureName] = useState("")

  const openPaywall = (featureName) => {
    setPaywallFeatureName(featureName)
    setIsPaywallOpen(true)
  }

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
      openPaywall("AI testing")
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
      openPaywall("AI agent tests")
      return
    }
    setIsAITestDropdownOpen(false)
    onCreateAITestAgent?.()
  }

  const handleViewAIAnalysisClick = () => {
    if (!userIsPaid && !isStillLoading) {
      openPaywall("AI analysis")
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
      openPaywall("Sharing extensions")
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
    setIsPublishOpen(true)
  }

  const handlePrivacyPolicyClick = () => {
    if (!userIsPaid && !isStillLoading) {
      openPaywall("Privacy Policy")
      return
    }
    setIsPrivacyPolicyInfoOpen(true)
  }

  const handlePrivacyPolicyContinue = () => {
    setIsPrivacyPolicyInfoOpen(false)
    window.location.href = '/privacy-policy'
  }

  const handleForkClick = async () => {
    stopAllHighlights()

    if (!projectId) {
      return
    }

    try {
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
        
        setGithubModalStatus("error")
        setGithubModalMessage(message)
        setGithubModalRepoUrl("")
        setGithubModalRepoName("")
        setGithubModalOpen(true)
        return
      }


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
      openPaywall("GitHub export")
      return
    }

    if (!projectId) {
      return
    }

    try {
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


      const repoFullName = data.repo?.full_name || data.repoFullName || 'GitHub repository'
      const htmlUrl = data.repo?.html_url || data.htmlUrl

      setGithubModalStatus("success")
      setGithubModalMessage("Your project has been exported to GitHub.")
      setGithubModalRepoUrl(htmlUrl || "")
      setGithubModalRepoName(repoFullName)
      setGithubModalOpen(true)
    } catch (error) {
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
      openPaywall("AI testing")
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
                  className="rounded-full font-semibold bg-slate-50 text-slate-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 px-4 py-2"
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
                    className="w-56 rounded-xl bg-slate-900/95 border border-slate-600/60 backdrop-blur-sm shadow-xl shadow-black/20"
                  >
                    <DropdownMenuItem
                      onClick={handleGeneratePuppeteerTestsClick}
                      disabled={isTestDisabled || isGenerating}
                      className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
                    >
                      <FileCode className="h-4 w-4 mr-3 text-slate-400" />
                      <span className="flex-1">
                        <span className="block">generate basic tests</span>
                        <span className="block text-[11px] leading-tight text-slate-400">generate basic validation tests</span>
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleCreateTestingAgentClick}
                      disabled={isTestDisabled || isGenerating || isGeneratingTestAgent}
                      className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
                    >
                      <Bot className="h-4 w-4 mr-3 text-slate-400" />
                      <span className="flex-1">
                        <span className="block">{isGeneratingTestAgent ? "creating..." : "generate ai agent tests"}</span>
                        <span className="block text-[11px] leading-tight text-slate-400">generate end‑to‑end ai tests</span>
                      </span>
                    </DropdownMenuItem>
                    
                    {hasSavedAITestResults && (
                      <DropdownMenuItem
                        onClick={handleViewAIAnalysisClick}
                        disabled={isTestDisabled || isGenerating || isTestingWithAI}
                        className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
                      >
                        <Sparkles className="h-4 w-4 mr-3 text-slate-400" />
                        <span className="flex-1">view past ai analysis</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={handleTestWithAIClick}
                      disabled={isTestDisabled || isGenerating || isTestingWithAI}
                      className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
                    >
                      <Sparkles className="h-4 w-4 mr-3 text-slate-400" />
                      <span className="flex-1">
                        <span className="block">{isTestingWithAI ? "executing..." : "run tests"}</span>
                        <span className="block text-[11px] leading-tight text-slate-400">runs basic and ai agent tests</span>
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleViewTestingReplaysClick}
                      disabled={isTestDisabled || isGenerating || isTestingWithAI}
                      className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
                    >
                      <History className="h-4 w-4 mr-3 text-slate-400" />
                      <span className="flex-1">
                        <span className="block">view testing replays</span>
                        <span className="block text-[11px] leading-tight text-slate-400">watch past test recordings</span>
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
                  disabled={isTestDisabled || isGenerating || isTestingWithAI}
                  variant="ghost"
                  className="w-full text-xs rounded-full font-medium bg-slate-900/60 text-slate-100 border border-slate-600/60 hover:bg-slate-900 hover:border-slate-500/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
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
                        <span className="uppercase text-[9px] leading-none px-1 py-[2px] rounded-full bg-blue-900/50 text-blue-300 border-2 border-blue-500">new</span>
                      </span>
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 rounded-xl bg-slate-900/95 border border-slate-600/60 backdrop-blur-sm shadow-xl shadow-black/20"
              >
                <DropdownMenuItem
                  onClick={() => { handleGeneratePuppeteerTestsClick(); setIsMobileMenuOpen(false) }}
                  disabled={isTestDisabled || isGenerating}
                  className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
                >
                  <FileCode className="h-4 w-4 mr-3 text-slate-400" />
                  <span className="flex-1">
                    <span className="block">generate basic tests</span>
                    <span className="block text-[11px] leading-tight text-slate-400">generate basic validation tests</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { handleCreateTestingAgentClick(); setIsMobileMenuOpen(false) }}
                  disabled={isTestDisabled || isGenerating || isGeneratingTestAgent}
                  className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
                >
                  <Bot className="h-4 w-4 mr-3 text-slate-400" />
                  <span className="flex-1">
                    <span className="block">{isGeneratingTestAgent ? "creating..." : "generate ai agent tests"}</span>
                    <span className="block text-[11px] leading-tight text-slate-400">generate end‑to‑end ai agent tests</span>
                  </span>
                </DropdownMenuItem>
                
                {hasSavedAITestResults && (
                  <DropdownMenuItem
                    onClick={() => { handleViewAIAnalysisClick(); setIsMobileMenuOpen(false) }}
                    disabled={isTestDisabled || isGenerating || isTestingWithAI}
                    className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
                  >
                    <Sparkles className="h-4 w-4 mr-3 text-slate-400" />
                    <span className="flex-1">view past ai analysis</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => { handleKickoffAIAnalysisClick(); setIsMobileMenuOpen(false) }}
                  disabled={isTestDisabled || isGenerating || isTestingWithAI}
                  className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
                >
                  <Sparkles className="h-4 w-4 mr-3 text-slate-400" />
                  <span className="flex-1">
                    <span className="block">{isTestingWithAI ? "executing..." : "run tests"}</span>
                    <span className="block text-[11px] leading-tight text-slate-400">runs basic and ai agent tests</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => { handleViewTestingReplaysClick(); setIsMobileMenuOpen(false) }}
                  disabled={isTestDisabled || isGenerating || isTestingWithAI}
                  className="cursor-pointer text-slate-200 hover:bg-slate-800/80 hover:text-slate-100 focus:bg-slate-800/80 focus:text-slate-100 rounded-lg"
                >
                  <History className="h-4 w-4 mr-3 text-slate-400" />
                  <span className="flex-1">
                    <span className="block">view testing replays</span>
                    <span className="block text-[11px] leading-tight text-slate-400">watch past test recordings</span>
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        featureName={paywallFeatureName}
      />
    </header>
  )
} 