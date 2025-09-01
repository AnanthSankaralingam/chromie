"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import AIChat from "@/components/ui/ai-chat"
import SideBySideTestModal from "@/components/ui/side-by-side-test-modal"
import AuthModal from "@/components/ui/modals/modal-auth"
import AppBarBuilder from "@/components/ui/app-bars/app-bar-builder"
import { ProjectMaxAlert } from "@/components/ui/project-max-alert"
import { useSession } from '@/components/SessionProviderClient'
import { LoadingState, ErrorState } from "@/components/ui/loading-error-states"
import ProjectFilesPanel from "@/components/ui/project-files-panel"
import EditorPanel from "@/components/ui/editor-panel"
import useProjectSetup from "@/components/ui/project-setup"
import useFileManagement from "@/components/ui/file-management"
import useResizablePanels from "@/components/ui/resizable-panels"
import useTestExtension from "@/components/ui/test-extension"
import useDownloadExtension from "@/components/ui/download-extension"
import { loadResponseId, saveResponseId } from "@/lib/conversation-state"

export default function BuilderPage() {
  const { isLoading, session, user, supabase } = useSession()
  const router = useRouter()
  const hasProcessedAutoGenerate = useRef(false)

  const [selectedFile, setSelectedFile] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [autoGeneratePrompt, setAutoGeneratePrompt] = useState(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  // Simple conversation state - only track previous responseId
  const [previousResponseId, setPreviousResponseId] = useState(null)
  const responseIdInitializedRef = useRef(false)

  // Custom hooks
  const projectSetup = useProjectSetup(user, isLoading)
  const { dividerPosition, containerRef, ResizableDivider } = useResizablePanels()
  const testExtension = useTestExtension(projectSetup.currentProjectId)
  
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
      // Initialize previous responseId after project is known (once)
      if (!responseIdInitializedRef.current && typeof window !== 'undefined') {
        const loaded = loadResponseId(projectSetup.currentProjectId)
        console.log('💬 Loaded previous responseId:', loaded)
        setPreviousResponseId(loaded)
        responseIdInitializedRef.current = true
      }

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
    console.log('🔍 URL clearing effect - hasProcessed:', hasProcessedAutoGenerate.current, 'autoGeneratePrompt:', autoGeneratePrompt)
    
    // Only clear if we've processed the prompt and it's now null
    if (hasProcessedAutoGenerate.current && autoGeneratePrompt === null && typeof window !== 'undefined') {
      const url = new URL(window.location)
      if (url.searchParams.has('autoGenerate')) {
        url.searchParams.delete('autoGenerate')
        window.history.replaceState({}, '', url.pathname)
        console.log('✅ Cleared autoGenerate URL parameter after successful generation')
      }
    }
  }, [autoGeneratePrompt])

  // Log extension info when file structure changes (after code generation)
  useEffect(() => {
    if (fileManagement.flatFiles.length > 0 && projectSetup.currentProjectId && !fileManagement.isLoadingFiles) {
      const extensionInfo = fileManagement.extractExtensionInfo(fileManagement.flatFiles)
      if (extensionInfo) {
        console.log('Extension info extracted after code generation:', extensionInfo)
        // Project name and description are now automatically updated during code generation
        // No need to make additional API calls
      }
    }
  }, [fileManagement.flatFiles, projectSetup.currentProjectId, fileManagement.isLoadingFiles])

  // Check for autoGenerate prompt in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const autoGenerateFromUrl = urlParams.get('autoGenerate')
      console.log('🔍 Checking URL for autoGenerate parameter:', autoGenerateFromUrl)
      
      if (autoGenerateFromUrl) {
        console.log('🎯 Setting autoGenerate prompt from URL:', autoGenerateFromUrl)
        setAutoGeneratePrompt(decodeURIComponent(autoGenerateFromUrl))
        hasProcessedAutoGenerate.current = true
        console.log('✅ Marked autoGenerate as processed, ref set to:', hasProcessedAutoGenerate.current)
      } else {
        console.log('📝 No autoGenerate parameter found in URL')
      }
    }
  }, [])

  // Log when autoGeneratePrompt changes
  useEffect(() => {
    console.log('📝 autoGeneratePrompt state changed:', autoGeneratePrompt)
  }, [autoGeneratePrompt])

  // Persist previousResponseId whenever it changes for current project
  useEffect(() => {
    if (!projectSetup.currentProjectId) return
    console.log('💾 Persisting previousResponseId:', previousResponseId, 'for project:', projectSetup.currentProjectId)
    saveResponseId(projectSetup.currentProjectId, previousResponseId)
  }, [previousResponseId, projectSetup.currentProjectId])

  // Log when project setup status changes
  useEffect(() => {
    console.log('🏗️ Project setup status changed:', {
      isSettingUpProject: projectSetup.isSettingUpProject,
      currentProjectId: projectSetup.currentProjectId,
      isProjectReady: !projectSetup.isSettingUpProject && !!projectSetup.currentProjectId,
      hasAutoGeneratePrompt: !!autoGeneratePrompt
    })
  }, [projectSetup.isSettingUpProject, projectSetup.currentProjectId, autoGeneratePrompt])

  // Trigger auto-generation when both prompt and project are ready
  useEffect(() => {
    if (autoGeneratePrompt && !projectSetup.isSettingUpProject && projectSetup.currentProjectId) {
      console.log('🚀 Auto-generation conditions met - prompt and project ready:', {
        prompt: autoGeneratePrompt,
        projectId: projectSetup.currentProjectId
      })
    }
  }, [autoGeneratePrompt, projectSetup.isSettingUpProject, projectSetup.currentProjectId])

  // Only clear autoGeneratePrompt after successful code generation, not just when project is loaded
  const handleAutoGenerateComplete = () => {
    console.log('✅ Auto-generation completed, clearing prompt')
    setAutoGeneratePrompt(null)
    hasProcessedAutoGenerate.current = false
  }



  const handleFileSelect = (file) => {
    console.log('File selected:', file.name)
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
      <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white ${!user ? 'blur-sm pointer-events-none' : ''}`}>
        {/* Header */}
        <AppBarBuilder
          onTestExtension={testExtension.handleTestExtension}
          onDownloadZip={downloadExtension.handleDownloadZip}
          onSignOut={handleSignOut}
          isTestDisabled={!projectSetup.currentProjectId || fileManagement.flatFiles.length === 0}
          isDownloadDisabled={!projectSetup.currentProjectId || fileManagement.flatFiles.length === 0}
          isGenerating={isGenerating}
          isDownloading={downloadExtension.isDownloading}
        />

        <div className="flex h-[calc(100vh-73px)] bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm">
          {/* Left Sidebar - AI Assistant */}
          <div className="w-[40%] border-r border-white/10 flex flex-col glass-effect animate-slide-in-left">
            <AIChat
              projectId={projectSetup.currentProjectId}
              autoGeneratePrompt={autoGeneratePrompt}
              onAutoGenerateComplete={handleAutoGenerateComplete}
              onCodeGenerated={async (response) => {
                try {
                  console.log("✅ AI generated code:", response)
                  console.log('🔄 Response details:', {
                    hasFiles: !!response?.files,
                    filesCount: response?.filesGenerated || 0,
                    filesList: response?.files ? response.files.join(', ') : 'none',
                    responseId: response?.responseId
                  })
                  console.log('🔄 Updating previousResponseId to:', response?.responseId)

                  // Force refresh files after code generation
                  console.log('🔄 Forcing file refresh after code generation')
                  await fileManagement.forceLoadProjectFiles()
                  console.log('✅ File refresh completed successfully')

                  setIsGenerating(false)
                  // Update previousResponseId after successful generation
                  if (response?.responseId) {
                    setPreviousResponseId(response.responseId)
                    console.log('💬 Conversation state updated - previousResponseId:', response.responseId)
                  }
                } catch (error) {
                  console.error('❌ Error in onCodeGenerated callback:', error)
                  // Do not rethrow; avoid converting a successful generation into a chat error
                }
              }}
              onGenerationStart={() => {
                console.log("🚀 Generation started")
                setIsGenerating(true)
              }}
              onGenerationEnd={() => {
                console.log("🏁 Generation ended")
                setIsGenerating(false)
              }}
              isProjectReady={!projectSetup.isSettingUpProject && !!projectSetup.currentProjectId}
              previousResponseId={previousResponseId}
            />
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

    </>
  )
}
