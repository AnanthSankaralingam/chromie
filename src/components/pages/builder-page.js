"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useOnboardingModal } from "@/hooks/use-onboarding-modal"
import { useIsMobile } from "@/hooks/use-is-mobile"
import AIChat from "@/components/ui/ai-chat"
import SideBySideTestModal from "@/components/ui/extension-testing/side-by-side-test-modal"
import AuthModal from "@/components/ui/modals/modal-auth"
import { OnboardingModal } from "@/components/ui/modals/onboarding"
import AppBarBuilder from "@/components/ui/app-bars/app-bar-builder"
import { ProjectMaxAlert } from "@/components/ui/modals/project-max-alert"
import { useSession } from '@/components/SessionProviderClient'
import { LoadingState, ErrorState } from "@/components/ui/feedback/loading-error-states"
import ProjectFilesPanel from "@/components/ui/project-files-panel"
import EditorPanel from "@/components/ui/code-editing/editor-panel"
import useProjectSetup from "@/components/ui/project-setup"
import TokenUsageAlert from "@/components/ui/modals/token-usage-alert"
import useFileManagement from "@/components/ui/file-management"
import useResizablePanels from "@/components/ui/resizable-panels"
import useTestExtension from "@/components/ui/extension-testing/test-extension"
import useDownloadExtension from "@/components/ui/download-extension"
import { MessageSquare, FolderOpen, FileCode } from "lucide-react"
import FeedbackModal from "@/components/ui/modals/feedback-modal"
import TestingPromptModal from "@/components/ui/modals/testing-prompt-modal"

export default function BuilderPage() {
  const { isLoading, session, user, supabase } = useSession()
  const router = useRouter()
  const hasProcessedAutoGenerate = useRef(false)

  const [selectedFile, setSelectedFile] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [autoGeneratePrompt, setAutoGeneratePrompt] = useState(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [shouldStartTestHighlight, setShouldStartTestHighlight] = useState(false)
  const [shouldStartDownloadHighlight, setShouldStartDownloadHighlight] = useState(false)
  const [hasGeneratedCode, setHasGeneratedCode] = useState(false)
  const [hasTestedExtension, setHasTestedExtension] = useState(false)
  const [activeTab, setActiveTab] = useState('chat') // 'chat', 'files', 'editor'
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [isGeneratingTestAgent, setIsGeneratingTestAgent] = useState(false)
  const [isTestingPromptOpen, setIsTestingPromptOpen] = useState(false)
  
  // Track hasGeneratedCode before generation starts to detect first generation
  const hasGeneratedCodeBeforeRef = useRef(false)

  // Custom hooks
  const isMobile = useIsMobile(1024) // 1024px is Tailwind's lg: breakpoint
  const projectSetup = useProjectSetup(user, isLoading)
  const { dividerPosition, containerRef, ResizableDivider } = useResizablePanels()
  const testExtension = useTestExtension(projectSetup.currentProjectId)
  const onboardingModal = useOnboardingModal()
  
  const fileManagement = useFileManagement(projectSetup.currentProjectId, user)
  const downloadExtension = useDownloadExtension(
    projectSetup.currentProjectId, 
    projectSetup.currentProjectName, 
    fileManagement.fileStructure
  )

  // Check auth state and show modal if needed
  useEffect(() => {
    if (!isLoading && !user) {
      setIsAuthModalOpen(true)
    } else if (user) {
      setIsAuthModalOpen(false)
    }
  }, [isLoading, user])

  // Clear URL parameters after project is loaded
  useEffect(() => {
    if (projectSetup.currentProjectId && !projectSetup.isSettingUpProject) {
      const url = new URL(window.location)
      let hasChanges = false
      
      if (url.searchParams.has('project')) {
        url.searchParams.delete('project')
        hasChanges = true
      }
      // Don't clear autoGenerate parameter here - wait for successful generation
      
      if (hasChanges) {
        window.history.replaceState({}, '', url.pathname)
      }
    }
  }, [projectSetup.currentProjectId, projectSetup.isSettingUpProject])

  // Clear autoGenerate URL parameter after successful generation
  useEffect(() => {
    // Only clear if we've processed the prompt and it's now null
    if (hasProcessedAutoGenerate.current && autoGeneratePrompt === null && typeof window !== 'undefined') {
      const url = new URL(window.location)
      if (url.searchParams.has('autoGenerate')) {
        url.searchParams.delete('autoGenerate')
        window.history.replaceState({}, '', url.pathname)
      }
    }
  }, [autoGeneratePrompt])

  // Sync ref with hasGeneratedCode state when project changes
  useEffect(() => {
    hasGeneratedCodeBeforeRef.current = hasGeneratedCode
  }, [hasGeneratedCode, projectSetup.currentProjectId])

  // Log extension info when file structure changes (after code generation)
  useEffect(() => {
    if (fileManagement.flatFiles.length > 0 && projectSetup.currentProjectId && !fileManagement.isLoadingFiles) {
      const extensionInfo = fileManagement.extractExtensionInfo(fileManagement.flatFiles)
      if (extensionInfo) {
        // Project name and description are now automatically updated during code generation
        // No need to make additional API calls
      }
      
      // Auto-select manifest.json if no file is currently selected
      if (!selectedFile) {
        const manifestFile = fileManagement.findManifestFile()
        if (manifestFile) {
          setSelectedFile(manifestFile)
        }
      }

      // Trigger test button highlight after code generation
      if (!hasGeneratedCode) {
        setHasGeneratedCode(true)
        setShouldStartTestHighlight(true)
        // Reset the highlight trigger after a short delay
        setTimeout(() => setShouldStartTestHighlight(false), 100)
      }
    }
  }, [fileManagement.flatFiles, projectSetup.currentProjectId, fileManagement.isLoadingFiles, selectedFile, hasGeneratedCode])

  // Check for autoGenerate prompt in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const autoGenerateFromUrl = urlParams.get('autoGenerate')
      
      if (autoGenerateFromUrl) {
        setAutoGeneratePrompt(decodeURIComponent(autoGenerateFromUrl))
        hasProcessedAutoGenerate.current = true
        
        // Check if we should show onboarding modal
        if (onboardingModal.checkShouldShowModal(true)) {
          onboardingModal.showModal()
        }
      }
    }
  }, [onboardingModal.checkShouldShowModal, onboardingModal.showModal])

  // Trigger auto-generation when both prompt and project are ready
  useEffect(() => {
    if (autoGeneratePrompt && !projectSetup.isSettingUpProject && projectSetup.currentProjectId) {
      // Auto-generation conditions met
    }
  }, [autoGeneratePrompt, projectSetup.isSettingUpProject, projectSetup.currentProjectId])

  // Only clear autoGeneratePrompt after successful code generation, not just when project is loaded
  const handleAutoGenerateComplete = () => {
    setAutoGeneratePrompt(null)
    hasProcessedAutoGenerate.current = false
  }

  // Track when user returns from testing to trigger download button highlight
  useEffect(() => {
    if (!testExtension.isTestModalOpen && hasTestedExtension && hasGeneratedCode) {
      // User has returned from testing, trigger download button highlight
      setShouldStartDownloadHighlight(true)
      // Reset the highlight trigger after a short delay
      setTimeout(() => setShouldStartDownloadHighlight(false), 100)
    }
  }, [testExtension.isTestModalOpen, hasTestedExtension, hasGeneratedCode])

  // Track when user opens test modal to mark that they've tested
  useEffect(() => {
    if (testExtension.isTestModalOpen && hasGeneratedCode) {
      setHasTestedExtension(true)
    }
  }, [testExtension.isTestModalOpen, hasGeneratedCode])

  // Track page visibility to detect when user switches tabs or minimizes browser
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Play notification sound when code generation completes and user is not on the page
  const playNotificationSound = () => {
    if (!isPageVisible) {
      try {
        // Create a soft, pleasant notification sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        // Soft, gentle tone
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
        
        // Fade in and out for a pleasant sound
        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05)
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
      } catch (error) {
        // Silently fail if audio context is not available
        console.log('Audio notification not available')
      }
    }
  }

  const handleFileSelect = (file) => {
    setSelectedFile(file)
  }

  const handleFileSave = async (content) => {
    if (!selectedFile) return
    await fileManagement.handleFileSave(selectedFile, content)
    // Update the selected file content
    setSelectedFile(prev => ({ ...prev, content: content }))
  }

  const handleSignOut = async () => {
    sessionStorage.removeItem('chromie_current_project_id')
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handleFeedbackClick = () => {
    setIsFeedbackModalOpen(true)
  }

  const handleFeedbackSubmit = async (feedbackData) => {
    setIsSubmittingFeedback(true)
    try {
      const response = await fetch(`/api/projects/${feedbackData.projectId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: feedbackData.rating,
          feedback: feedbackData.feedback
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit feedback')
      }

      const result = await response.json()
      console.log('Feedback submitted successfully:', result)
      
      // You could show a success toast here if you have a toast system
      alert('Thank you for your feedback!')
      
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const handleCreateAITestAgent = async () => {
    if (!projectSetup.currentProjectId) {
      console.error('No project ID available')
      return
    }

    setIsGeneratingTestAgent(true)
    console.log('🤖 Starting AI test agent generation...')
    
    try {
      const response = await fetch(`/api/projects/${projectSetup.currentProjectId}/generate-hyperagent-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate AI test agent')
      }

      const result = await response.json()
      console.log('✅ AI test agent generated successfully:', result)
      
      // Refresh file tree to show new test script
      await fileManagement.loadProjectFiles(true)
      
      // Show success message
      alert('AI testing agent created successfully! Check your files for hyperagent_test_script.js')
      
    } catch (error) {
      console.error('❌ Error generating AI test agent:', error)
      alert(`Failed to generate AI test agent: ${error.message}`)
    } finally {
      setIsGeneratingTestAgent(false)
    }
  }

  const handleExploreCode = () => {
    setIsTestingPromptOpen(false)
    // User stays in current view (files/editor)
  }

  const handleTryItOut = () => {
    setIsTestingPromptOpen(false)
    // Open testing modal
    testExtension.handleTestExtension()
  }

  // Show loading state
  if (isLoading || projectSetup.isSettingUpProject || (!projectSetup.currentProjectId && user && !projectSetup.projectSetupError)) {
    return <LoadingState isLoading={isLoading} isSettingUpProject={projectSetup.isSettingUpProject} />
  }

  // Show error state if project setup failed
  if (projectSetup.projectSetupError && user) {
    return (
      <ErrorState 
        projectSetupError={projectSetup.projectSetupError} 
        onRetry={() => {
          projectSetup.setProjectSetupError(null)
          projectSetup.checkAndSetupProject()
        }} 
      />
    )
  }

  return (
    <>
      <div className={`h-screen bg-gradient-to-br from-black via-slate-900 to-slate-900 text-white overflow-hidden ${!user ? 'blur-sm pointer-events-none' : ''}`}>
        {/* Header */}
        <AppBarBuilder
          onTestExtension={testExtension.handleTestExtension}
          onDownloadZip={downloadExtension.handleDownloadZip}
          onSignOut={handleSignOut}
          projectId={projectSetup.currentProjectId}
          isTestDisabled={!projectSetup.currentProjectId || fileManagement.flatFiles.length === 0}
          isDownloadDisabled={!projectSetup.currentProjectId || fileManagement.flatFiles.length === 0}
          isGenerating={isGenerating || isGeneratingTestAgent}
          isDownloading={downloadExtension.isDownloading}
          shouldStartTestHighlight={shouldStartTestHighlight}
          shouldStartDownloadHighlight={shouldStartDownloadHighlight}
          onFeedbackClick={handleFeedbackClick}
          onCreateAITestAgent={handleCreateAITestAgent}
        />

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm">
          <div className="flex">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-all ${
                activeTab === 'chat' 
                  ? 'text-purple-300 border-b-2 border-purple-400 bg-purple-500/10' 
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>AI Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-all ${
                activeTab === 'files' 
                  ? 'text-purple-300 border-b-2 border-purple-400 bg-purple-500/10' 
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              <span>Files</span>
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-all ${
                activeTab === 'editor' 
                  ? 'text-purple-300 border-b-2 border-purple-400 bg-purple-500/10' 
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <FileCode className="h-4 w-4" />
              <span>Editor</span>
            </button>
          </div>
        </div>

        {/* Mobile Single Panel View */}
        <div className="lg:hidden h-[calc(100vh-73px-49px)] bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm">
          {activeTab === 'chat' && isMobile && (
            <div className="h-full flex flex-col">
              <AIChat
                projectId={projectSetup.currentProjectId}
                projectName={projectSetup.currentProjectName}
                autoGeneratePrompt={autoGeneratePrompt}
                onAutoGenerateComplete={handleAutoGenerateComplete}
                onCodeGenerated={async (response) => {
                  await fileManagement.loadProjectFiles(true) // Refresh from server to get updated files
                  setIsGenerating(false)
                  // Refresh project details (name/description) after generation updates
                  await projectSetup.refreshCurrentProjectDetails?.()
                  
                  // Play notification sound if user is not on the page
                  playNotificationSound()
                  
                  // Check if this was first generation and show testing prompt modal
                  if (!hasGeneratedCodeBeforeRef.current && projectSetup.currentProjectName) {
                    const localStorageKey = `chromie-testing-prompt-shown-${projectSetup.currentProjectName}`
                    const hasShownPrompt = typeof window !== 'undefined' && localStorage.getItem(localStorageKey) === 'true'
                    
                    if (!hasShownPrompt) {
                      // Mark as shown immediately
                      if (typeof window !== 'undefined') {
                        localStorage.setItem(localStorageKey, 'true')
                      }
                      // Show modal after a short delay to ensure page state is updated
                      setTimeout(() => {
                        setIsTestingPromptOpen(true)
                      }, 500)
                    }
                  }
                  
                  // Auto-select manifest.json file after code generation and switch to files tab
                  setTimeout(() => {
                    const manifestFile = fileManagement.findManifestFile()
                    if (manifestFile) {
                      setSelectedFile(manifestFile)
                    }
                    setActiveTab('files') // Switch to files tab after code generation
                  }, 500) // Small delay to ensure file structure is updated
                }}
                onGenerationStart={() => {
                  setIsGenerating(true)
                  // Track hasGeneratedCode state before generation starts
                  hasGeneratedCodeBeforeRef.current = hasGeneratedCode
                }}
                onGenerationEnd={() => {
                  setIsGenerating(false)
                }}
                isProjectReady={!projectSetup.isSettingUpProject && !!projectSetup.currentProjectId}
              />
            </div>
          )}
          
          {activeTab === 'files' && (
            <div className="h-full">
              <ProjectFilesPanel
                fileStructure={fileManagement.fileStructure}
                selectedFile={selectedFile}
                onFileSelect={(file) => {
                  handleFileSelect(file)
                  setActiveTab('editor') // Switch to editor when file is selected
                }}
                isLoadingFiles={fileManagement.isLoadingFiles}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
          )}
          
          {activeTab === 'editor' && (
            <div className="h-full bg-slate-900">
              <EditorPanel 
                selectedFile={selectedFile}
                onFileSave={handleFileSave}
                allFiles={fileManagement.flatFiles}
              />
            </div>
          )}
        </div>

        {/* Desktop Layout - Hidden on Mobile */}
        <div className="hidden lg:flex h-[calc(100vh-73px)] bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm">
          {/* Left Sidebar - AI Assistant */}
          <div className="w-[40%] border-r border-white/10 flex flex-col glass-effect animate-slide-in-left">
            {!isMobile && (
              <AIChat
                projectId={projectSetup.currentProjectId}
                projectName={projectSetup.currentProjectName}
                autoGeneratePrompt={autoGeneratePrompt}
                onAutoGenerateComplete={handleAutoGenerateComplete}
                onCodeGenerated={async (response) => {
                  await fileManagement.loadProjectFiles(true) // Refresh from server to get updated files
                  setIsGenerating(false)
                  // Refresh project details (name/description) after generation updates
                  await projectSetup.refreshCurrentProjectDetails?.()
                  
                  // Play notification sound if user is not on the page
                  playNotificationSound()
                  
                  // Check if this was first generation and show testing prompt modal
                  if (!hasGeneratedCodeBeforeRef.current && projectSetup.currentProjectName) {
                    const localStorageKey = `chromie-testing-prompt-shown-${projectSetup.currentProjectName}`
                    const hasShownPrompt = typeof window !== 'undefined' && localStorage.getItem(localStorageKey) === 'true'
                    
                    if (!hasShownPrompt) {
                      // Mark as shown immediately
                      if (typeof window !== 'undefined') {
                        localStorage.setItem(localStorageKey, 'true')
                      }
                      // Show modal after a short delay to ensure page state is updated
                      setTimeout(() => {
                        setIsTestingPromptOpen(true)
                      }, 500)
                    }
                  }
                  
                  // Auto-select manifest.json file after code generation
                  setTimeout(() => {
                    const manifestFile = fileManagement.findManifestFile()
                    if (manifestFile) {
                      setSelectedFile(manifestFile)
                    }
                  }, 500) // Small delay to ensure file structure is updated
                }}
                onGenerationStart={() => {
                  setIsGenerating(true)
                  // Track hasGeneratedCode state before generation starts
                  hasGeneratedCodeBeforeRef.current = hasGeneratedCode
                }}
                onGenerationEnd={() => {
                  setIsGenerating(false)
                }}
                isProjectReady={!projectSetup.isSettingUpProject && !!projectSetup.currentProjectId}
              />
            )}
          </div>

          {/* Main Content Area with Resizable Panels */}
          <div className="flex-1 flex" ref={containerRef}>
            {/* Project Files Panel */}
            <div style={{ width: `${dividerPosition}%` }}>
              <ProjectFilesPanel
                fileStructure={fileManagement.fileStructure}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
                isLoadingFiles={fileManagement.isLoadingFiles}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>

            {/* Resizable Divider */}
            <ResizableDivider />

            {/* File Editor Panel */}
            <div className="flex flex-col bg-slate-900 border-l border-slate-700/50" style={{ width: `${100 - dividerPosition}%` }}>
              <EditorPanel 
                selectedFile={selectedFile}
                onFileSave={handleFileSave}
                allFiles={fileManagement.flatFiles}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      {/* Test Modal */}
      <SideBySideTestModal
        isOpen={testExtension.isTestModalOpen}
        onClose={testExtension.handleCloseTestModal}
        sessionData={testExtension.testSessionData}
        onRefresh={testExtension.handleRefreshTest}
        isLoading={testExtension.isTestLoading}
        loadingProgress={testExtension.loadingProgress}
        projectId={projectSetup.currentProjectId}
        extensionFiles={fileManagement.flatFiles}
      />

      {/* Project Limit Modal */}
      {projectSetup.projectLimitDetails && (
        <ProjectMaxAlert
          isOpen={projectSetup.isProjectLimitModalOpen}
          onClose={() => projectSetup.setIsProjectLimitModalOpen(false)}
          currentPlan={projectSetup.projectLimitDetails.currentPlan}
          currentProjectCount={projectSetup.projectLimitDetails.currentProjectCount}
          maxProjects={projectSetup.projectLimitDetails.maxProjects}
          onUpgradePlan={projectSetup.handleUpgradePlan}
          onDeleteProject={projectSetup.handleManageProjects}
        />
      )}

      {/* Token Usage Modal */}
      <TokenUsageAlert isOpen={projectSetup.isTokenLimitModalOpen} onClose={() => projectSetup.setIsTokenLimitModalOpen(false)} />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={onboardingModal.isModalOpen}
        onClose={onboardingModal.hideModal}
        currentStep={onboardingModal.currentStep}
        onNext={onboardingModal.goToNextStep}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onSubmit={handleFeedbackSubmit}
        projectId={projectSetup.currentProjectId}
        isLoading={isSubmittingFeedback}
      />

      {/* Testing Prompt Modal */}
      <TestingPromptModal
        isOpen={isTestingPromptOpen}
        onClose={() => setIsTestingPromptOpen(false)}
        onExploreCode={handleExploreCode}
        onTryItOut={handleTryItOut}
      />
    </>
  )
}
