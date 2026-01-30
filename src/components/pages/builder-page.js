"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useOnboardingModal } from "@/hooks/use-onboarding-modal"
import { useIsMobile } from "@/hooks/use-is-mobile"
import AIChat from "@/components/ui/ai-chat"
import SideBySideTestModal from "@/components/ui/extension-testing/side-by-side-test-modal"
import AuthModal from "@/components/ui/modals/modal-auth"
import { OnboardingModal } from "@/components/ui/modals/onboarding"
import AppBarBuilder from "@/components/ui/app-bars/app-bar-builder"
import AITestResultModal from "@/components/ui/modals/ai-test-result-modal"
import { ProjectMaxAlert } from "@/components/ui/modals/project-max-alert"
import { useSession } from '@/components/SessionProviderClient'
import { LoadingState, ErrorState } from "@/components/ui/feedback/loading-error-states"
import ProjectFilesPanel from "@/components/ui/project-files-panel"
import EditorPanel from "@/components/ui/code-editing/editor-panel"
import useProjectSetup from "@/components/ui/project-setup"
import TokenUsageAlert from "@/components/ui/modals/token-usage-alert"
import useFileManagement from "@/components/ui/file-management"
import useResizablePanels from "@/components/ui/resizable-panels"
import useResizableChatCanvas from "@/components/ui/resizable-chat-canvas"
import useTestExtension from "@/components/ui/extension-testing/test-extension"
import useDownloadExtension from "@/components/ui/download-extension"
import { MessageSquare, FolderOpen, FileCode } from "lucide-react"
import TestingPromptModal from "@/components/ui/modals/testing-prompt-modal"
import { useNotificationSound } from "@/hooks/use-notification-sound"
import { useAutoGenerateParams, useProjectParams } from "@/hooks/use-url-params"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { motion } from "framer-motion"
import {
  Artifact,
  ArtifactContent,
  ArtifactClose,
} from "@/components/ui/artifact/artifact"
import { TourProvider, useTour, TOUR_STEP_IDS } from "@/components/ui/tour"
import VersionHistoryPanel from "@/components/ui/version-history-panel"

function BuilderPageContent() {
  const { isLoading, session, user, supabase } = useSession()
  const router = useRouter()
  const hasProcessedAutoGenerate = useRef(false)

  const [selectedFile, setSelectedFile] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [shouldStartTestHighlight, setShouldStartTestHighlight] = useState(false)
  const [shouldStartDownloadHighlight, setShouldStartDownloadHighlight] = useState(false)
  const [hasGeneratedCode, setHasGeneratedCode] = useState(false)
  const [hasTestedExtension, setHasTestedExtension] = useState(false)
  const [activeTab, setActiveTab] = useState('chat') // 'chat', 'files', 'editor'
  const [isGeneratingTestAgent, setIsGeneratingTestAgent] = useState(false)
  const [isTestingPromptOpen, setIsTestingPromptOpen] = useState(false)
  const [isCanvasOpen, setIsCanvasOpen] = useState(false) // Track if canvas pane is open
  const [isFileTreeCollapsed, setIsFileTreeCollapsed] = useState(false) // Track if file tree is collapsed
  const [isTestingWithAI, setIsTestingWithAI] = useState(false)
  const [aiTestResult, setAiTestResult] = useState(null)
  const [isAITestResultModalOpen, setIsAITestResultModalOpen] = useState(false)
  const [hasSavedAITestResults, setHasSavedAITestResults] = useState(false)
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false)
  const [testSessionLogs, setTestSessionLogs] = useState(null)

  // Track hasGeneratedCode before generation starts to detect first generation
  const hasGeneratedCodeBeforeRef = useRef(false)

  // Reference to the AI chat input setter
  const setInputMessageRef = useRef(null)

  // Custom hooks for URL and notification management
  const { autoGeneratePrompt, setAutoGeneratePrompt, handleAutoGenerateComplete } = useAutoGenerateParams(hasProcessedAutoGenerate.current)
  const { playNotificationSound, isPageVisible } = useNotificationSound()

  // Custom hooks
  const isMobile = useIsMobile(1024) // 1024px is Tailwind's lg: breakpoint
  const projectSetup = useProjectSetup(user, isLoading)
  const { dividerPosition, containerRef, ResizableDivider } = useResizablePanels()
  const { dividerPosition: chatCanvasDividerPosition, containerRef: chatCanvasContainerRef, ResizableDivider: ChatCanvasResizableDivider } = useResizableChatCanvas()
  const testExtension = useTestExtension(projectSetup.currentProjectId)
  const onboardingModal = useOnboardingModal()
  const { setSteps, startTour, completeStepById, isTourCompleted } = useTour()
  const tourStartedRef = useRef(false)

  const fileManagement = useFileManagement(projectSetup.currentProjectId, user)
  const downloadExtension = useDownloadExtension(
    projectSetup.currentProjectId,
    projectSetup.currentProjectName,
    fileManagement.fileStructure
  )

  const buildTourSteps = useCallback(() => {
    const steps = [
      {
        id: TOUR_STEP_IDS.OPEN_CANVAS,
        selectorId: "tour-open-canvas-button",
        position: "bottom",
        title: "Open your generated code",
        content: (
          <div className="space-y-1">
            <p>Click Open to jump into the canvas and view your files.</p>
            <p className="text-xs text-slate-400">We’ll guide you through previewing, testing, and sharing.</p>
          </div>
        ),
      },
    ]

    steps.push(
      {
        id: TOUR_STEP_IDS.TEST,
        selectorId: "tour-test-button",
        position: "bottom",
        title: "Test your extension",
        content: (
          <div className="space-y-1">
            <p>Launch the test runner to validate your extension in the browser.</p>
            <p className="text-xs text-slate-400">We pre-wire the flow—just click Test to start.</p>
          </div>
        ),
      },
      {
        id: TOUR_STEP_IDS.TEST_WITH_AI,
        selectorId: "tour-test-with-ai-button",
        position: "bottom",
        title: "Test with AI (New)",
        content: (
          <div className="space-y-1">
            <p>Run AI agent testing to simulate real user behavior end-to-end.</p>
            <p className="text-xs text-slate-400">Puppeteer = basic validation. AI agent = end‑to‑end simulation.</p>
          </div>
        ),
      },
      {
        id: TOUR_STEP_IDS.SHARE,
        selectorId: "tour-share-button",
        position: "bottom",
        title: "Share with your team",
        content: (
          <div className="space-y-1">
            <p>Generate a secure share link once you’re happy with the build.</p>
            <p className="text-xs text-slate-400">You won't see this again now.</p>
          </div>
        ),
      }
    )
    return steps
  }, [])

  useEffect(() => {
    if (!hasGeneratedCode || isTourCompleted || tourStartedRef.current) return
    if (!fileManagement.flatFiles.length || isCanvasOpen) return

    const steps = buildTourSteps()
    if (steps.length) {
      setSteps(steps)
      requestAnimationFrame(() => {
        startTour()
        tourStartedRef.current = true
        console.log("[tour] builder tour started", { steps: steps.map((s) => s.id) })
      })
    }
  }, [buildTourSteps, fileManagement.flatFiles.length, hasGeneratedCode, isCanvasOpen, isTourCompleted, setSteps, startTour])

  // Check auth state and show modal if needed
  useEffect(() => {
    if (!isLoading && !user) {
      setIsAuthModalOpen(true)
    } else if (user) {
      setIsAuthModalOpen(false)
    }
  }, [isLoading, user])

  // Use the custom hook to manage project URL parameters
  useProjectParams(projectSetup.currentProjectId, projectSetup.isSettingUpProject)

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

  // Check if we should show onboarding modal when actual code generation starts (not planning)
  const handleCodeGenerationStarting = () => {
    if (autoGeneratePrompt && !hasProcessedAutoGenerate.current) {
      hasProcessedAutoGenerate.current = true
      if (onboardingModal.checkShouldShowModal(true)) {
        onboardingModal.showModal()
      }
    }
  }

  // Trigger auto-generation when both prompt and project are ready
  useEffect(() => {
    if (autoGeneratePrompt && !projectSetup.isSettingUpProject && projectSetup.currentProjectId) {
      // Auto-generation conditions met
    }
  }, [autoGeneratePrompt, projectSetup.isSettingUpProject, projectSetup.currentProjectId])


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
      alert('AI testing agent created successfully! Check your files for tests/hyperagent_test_script.js')

    } catch (error) {
      console.error('❌ Error generating AI test agent:', error)
      alert(`Failed to generate AI test agent: ${error.message}`)
    } finally {
      setIsGeneratingTestAgent(false)
    }
  }

  // Check for saved AI test results when project loads (only once per project)
  const hasCheckedTestResultsRef = useRef(null) // Track which project we've checked
  
  useEffect(() => {
    const checkSavedResults = async () => {
      if (!projectSetup.currentProjectId || !user) return
      
      // Skip if we've already checked this project
      if (hasCheckedTestResultsRef.current === projectSetup.currentProjectId) {
        return
      }

      // Mark as checked immediately to prevent duplicate calls
      hasCheckedTestResultsRef.current = projectSetup.currentProjectId

      try {
        const response = await fetch(`/api/projects/${projectSetup.currentProjectId}/test-with-ai`, {
          method: 'GET',
        })

        if (response.ok) {
          const data = await response.json()
          setHasSavedAITestResults(data.exists === true)
        }
      } catch (error) {
        console.error('Error checking for saved test results:', error)
        setHasSavedAITestResults(false)
        // Reset on error so we can retry
        if (hasCheckedTestResultsRef.current === projectSetup.currentProjectId) {
          hasCheckedTestResultsRef.current = null
        }
      }
    }

    checkSavedResults()
  }, [projectSetup.currentProjectId, user])

  const handleTestWithAI = async (viewOnly = false) => {
    if (!projectSetup.currentProjectId) {
      console.error('No project ID available')
      return
    }

    // If viewing saved results, fetch them instead of running a new test
    if (viewOnly) {
      try {
        const response = await fetch(`/api/projects/${projectSetup.currentProjectId}/test-with-ai`, {
          method: 'GET',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch saved test results')
        }

        const data = await response.json()
        if (data.exists) {
          console.log('✅ Loaded saved AI test results:', data)
          setAiTestResult(data)
          setIsAITestResultModalOpen(true)
        } else {
          // Fallback to running new test if no saved results found
          handleTestWithAI(false)
        }
      } catch (error) {
        console.error('❌ Error loading saved test results:', error)
        alert(`Failed to load saved test results: ${error.message}`)
      }
      return
    }

    // Kickoff AI analysis in the headful "Try it out" browser, then auto-run HyperAgent tests after pinning finishes.
    setIsTestingWithAI(true)
    console.log('🤖 Starting AI analysis in headful Try It Out browser...')

    try {
      await testExtension.handleTestExtension({
        awaitPinExtension: true,
        autoRunHyperAgent: true,
      })
    } catch (error) {
      console.error('❌ Error starting AI analysis flow:', error)
      alert(`Failed to start AI analysis: ${error.message}`)
    } finally {
      setIsTestingWithAI(false)
    }
  }

  const handleExecuteTestingAgent = async () => {
    if (!projectSetup.currentProjectId) {
      console.error("No project ID available")
      return
    }

    // Open headful "Try it out" browser and run Puppeteer -> AI agent in sequence.
    setIsTestingWithAI(true)
    console.log("🧪🤖 Starting Execute Testing Agent flow (puppeteer → ai agent)...")

    try {
      const sequenceId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      await testExtension.handleTestExtension({
        awaitPinExtension: true,
        autoRunPuppeteerTests: true,
        autoRunHyperAgent: true,
        runTestSequence: true,
        sequenceId,
      })
    } catch (error) {
      console.error("❌ Error starting Execute Testing Agent flow:", error)
      alert(`Failed to start testing agent: ${error.message}`)
    } finally {
      setIsTestingWithAI(false)
    }
  }

  // Handler for generating Puppeteer tests from within the test modal
  const handleGeneratePuppeteerTestsFromModal = async () => {
    if (!projectSetup.currentProjectId) {
      console.error("[puppeteer-tests] No project ID available")
      return
    }

    // Close the testing modal first
    console.log("[puppeteer-tests] 🔄 Closing test modal to generate tests")
    testExtension.handleCloseTestModal()

    // Then trigger generation
    try {
      console.log("🧪 Generating Puppeteer tests...")
      const response = await fetch(`/api/projects/${projectSetup.currentProjectId}/generate-puppeteer-tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      
      if (!response.ok) {
        console.error("[puppeteer-tests] Generate failed:", data?.error)
        alert(`Failed to generate Puppeteer tests: ${data?.error || 'Unknown error'}`)
        return
      }

      console.log("[puppeteer-tests] ✅ Tests generated successfully")
      
      // Refresh file tree to show new test file
      await fileManagement.loadProjectFiles(true)
      
      alert('Puppeteer tests generated successfully! Check tests/puppeteer/index.test.js')
    } catch (error) {
      console.error("[puppeteer-tests] ❌ Error generating tests:", error)
      alert(`Failed to generate Puppeteer tests: ${error.message}`)
    }
  }

  // Handler for generating AI agent tests from within the test modal
  const handleGenerateAiAgentTestsFromModal = async () => {
    if (!projectSetup.currentProjectId) {
      console.error("[ai-tests] No project ID available")
      return
    }

    // Close the testing modal first
    console.log("[ai-tests] 🔄 Closing test modal to generate tests")
    testExtension.handleCloseTestModal()

    // Then trigger generation using the existing function
    await handleCreateAITestAgent()
  }

  const handleOpenCanvas = () => {
    setIsCanvasOpen(true)
    completeStepById(TOUR_STEP_IDS.OPEN_CANVAS)
  }

  const handleTestExtensionWithTour = () => {
    testExtension.handleTestExtension()
    completeStepById(TOUR_STEP_IDS.TEST)
  }

  const handleShareWithTour = () => {
    completeStepById(TOUR_STEP_IDS.SHARE)
  }

  const handleOpenCanvasFromChat = () => {
    handleOpenCanvas()
    const manifestFile = fileManagement.findManifestFile()
    if (manifestFile) {
      setSelectedFile(manifestFile)
    }
    setActiveTab('files')
  }

  const handleExploreCode = () => {
    setIsTestingPromptOpen(false)
    // User stays in current view (files/editor)
  }

  const handleTryItOut = () => {
    setIsTestingPromptOpen(false)
    // Open testing modal
    handleTestExtensionWithTour()
  }

  const handleVersionHistoryClick = () => {
    setIsVersionHistoryOpen(true)
  }

  const handleVersionRestored = async () => {
    // Reload project files after version restore
    console.log('🔄 Version restored, reloading project files...')
    await fileManagement.loadProjectFiles(true)

    // Refresh project details
    await projectSetup.refreshCurrentProjectDetails?.()

    // Auto-select manifest.json file
    const manifestFile = fileManagement.findManifestFile()
    if (manifestFile) {
      setSelectedFile(manifestFile)
    }
  }

  const handleAddMetrics = () => {
    console.log('📊 Add Metrics clicked')
    if (setInputMessageRef.current) {
      setInputMessageRef.current("Integrate chromie metrics into my extension and track key events!")
    }
  }

  // Handle solving test errors in chat
  const handleSolveErrorInChat = (errorMessage) => {
    console.log('🔧 Solve in chat clicked')
    if (setInputMessageRef.current) {
      // Sanitize error message to replace internal names
      const sanitizedMessage = errorMessage
        .replace(/Hyperbrowser/gi, 'Testing Browser')
        .replace(/BrowserBase/gi, 'Testing Browser')
      setInputMessageRef.current(`Debug this: ${sanitizedMessage}`)
    }
    // Close the test modal
    testExtension.handleCloseTestModal()
  }

  // Handle logs captured from test session
  const handleSessionLogsCapture = useCallback((logs) => {
    console.log('[builder-page] Captured', logs.length, 'logs from test session')
    setTestSessionLogs(logs)
  }, [])

  // Clear test session logs
  const handleClearTestSessionLogs = useCallback(() => {
    setTestSessionLogs(null)
  }, [])

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
      <div className={`h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white overflow-hidden ${!user ? 'blur-sm pointer-events-none' : ''}`}>
        {/* Header */}
        <div>
          <AppBarBuilder
            onTestExtension={handleTestExtensionWithTour}
            onTestWithAI={handleTestWithAI}
            onExecuteTestingAgent={handleExecuteTestingAgent}
            onAddMetrics={handleAddMetrics}
            onGeneratePuppeteerTests={async () => {
              if (!projectSetup.currentProjectId) {
                console.error("[puppeteer-tests] No project ID available")
                return
              }
              try {
                console.log("🧪 Generating Puppeteer tests...")
                const response = await fetch(`/api/projects/${projectSetup.currentProjectId}/generate-puppeteer-tests`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                })
                const data = await response.json()
                if (!response.ok) {
                  console.error("[puppeteer-tests] Generate failed details:", {
                    error: data?.error,
                    details: data?.details,
                    preview: data?.preview,
                  })
                  const msg = [
                    data?.error || 'Failed to generate Puppeteer tests',
                    data?.details ? `\n\nDetails: ${data.details}` : '',
                    data?.preview ? `\n\nPreview:\n${data.preview}` : '',
                  ].join('')
                  throw new Error(msg)
                }
                console.log("✅ Puppeteer tests generated:", data)
                await fileManagement.loadProjectFiles(true)
                alert('Puppeteer test file generated! Check your files for tests/puppeteer/index.test.js')
              } catch (e) {
                console.error("❌ Failed to generate Puppeteer tests:", e)
                alert(`Failed to generate Puppeteer tests: ${e.message}`)
              }
            }}
            onDownloadZip={downloadExtension.handleDownloadZip}
            onSignOut={handleSignOut}
            projectId={projectSetup.currentProjectId}
            isTestDisabled={!projectSetup.currentProjectId || fileManagement.flatFiles.length === 0}
            isDownloadDisabled={!projectSetup.currentProjectId || fileManagement.flatFiles.length === 0}
            isGenerating={isGenerating || isGeneratingTestAgent}
            isDownloading={downloadExtension.isDownloading}
            isTestingWithAI={isTestingWithAI}
            isGeneratingTestAgent={isGeneratingTestAgent}
            shouldStartTestHighlight={shouldStartTestHighlight}
            shouldStartDownloadHighlight={shouldStartDownloadHighlight}
            onCreateAITestAgent={handleCreateAITestAgent}
            onVersionHistoryClick={handleVersionHistoryClick}
            tourTestButtonId="tour-test-button"
            tourTestWithAIButtonId="tour-test-with-ai-button"
            tourShareButtonId="tour-share-button"
            onTourShareComplete={handleShareWithTour}
            hasSavedAITestResults={hasSavedAITestResults}
            hasGithubRepo={projectSetup.currentProjectHasGithubRepo}
          />
        </div>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden border-b border-gray-800 bg-black relative z-20">
          <div className="flex">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-all ${activeTab === 'chat'
                  ? 'text-gray-300 border-b-2 border-gray-700 bg-gray-900'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
                }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>AI Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-all ${activeTab === 'files'
                  ? 'text-gray-300 border-b-2 border-gray-400 bg-gray-500/10'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
                }`}
            >
              <FolderOpen className="h-4 w-4" />
              <span>Files</span>
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-all ${activeTab === 'editor'
                  ? 'text-gray-300 border-b-2 border-gray-400 bg-gray-500/10'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
                }`}
            >
              <FileCode className="h-4 w-4" />
              <span>Editor</span>
            </button>
          </div>
        </div>

        {/* Mobile Single Panel View */}
        <div className="lg:hidden h-[calc(100vh-73px-49px)] relative z-20">
          {activeTab === 'chat' && isMobile && (
            <div className="h-full flex flex-col">
              <AIChat
                projectId={projectSetup.currentProjectId}
                projectName={projectSetup.currentProjectName}
                availableFiles={fileManagement.flatFiles}
                autoGeneratePrompt={autoGeneratePrompt}
                onAutoGenerateComplete={handleAutoGenerateComplete}
                onCodeGenerated={async (response) => {
                  await fileManagement.loadProjectFiles(true) // Refresh from server to get updated files
                  setIsGenerating(false)
                  setHasGeneratedCode(true)
                  // Refresh project details (name/description) after generation updates
                  await projectSetup.refreshCurrentProjectDetails?.()

                  // Clear autoGeneratePrompt now that code generation is complete
                  if (autoGeneratePrompt) {
                    handleAutoGenerateComplete()
                  }

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
                onOpenCanvas={handleOpenCanvasFromChat}
                hasGeneratedCode={hasGeneratedCode}
                isCanvasOpen={false}
                isProjectReady={!projectSetup.isSettingUpProject && !!projectSetup.currentProjectId}
                isOnboardingModalOpen={onboardingModal.isModalOpen}
                onCodeGenerationStarting={handleCodeGenerationStarting}
                onSetInputMessage={(setInputMessage) => { setInputMessageRef.current = setInputMessage }}
                testSessionLogs={testSessionLogs}
                onClearTestSessionLogs={handleClearTestSessionLogs}
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
                projectId={projectSetup.currentProjectId}
                onAssetUploaded={() => fileManagement.loadProjectFiles(true)}
                onAssetDeleted={fileManagement.handleAssetDelete}
                isLoadingFiles={fileManagement.isLoadingFiles}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                flatFiles={fileManagement.flatFiles}
              />
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="h-full bg-black">
              <EditorPanel
                selectedFile={selectedFile}
                onFileSave={handleFileSave}
                allFiles={fileManagement.flatFiles}
              />
            </div>
          )}
        </div>

        {/* Desktop Layout - Hidden on Mobile */}
        <div className="hidden lg:flex h-[calc(100vh-73px)] relative z-20">
          {!isCanvasOpen ? (
            /* Centered Chat View - Initial State */
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full h-full flex flex-col">
                <AIChat
                  projectId={projectSetup.currentProjectId}
                  projectName={projectSetup.currentProjectName}
                  availableFiles={fileManagement.flatFiles}
                  autoGeneratePrompt={autoGeneratePrompt}
                  onAutoGenerateComplete={handleAutoGenerateComplete}
                  onCodeGenerated={async (response) => {
                    await fileManagement.loadProjectFiles(true) // Refresh from server to get updated files
                    setIsGenerating(false)
                    setHasGeneratedCode(true)
                    // Refresh project details (name/description) after generation updates
                    await projectSetup.refreshCurrentProjectDetails?.()

                    // Clear autoGeneratePrompt now that code generation is complete
                    if (autoGeneratePrompt) {
                      handleAutoGenerateComplete()
                    }

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
                  onOpenCanvas={handleOpenCanvas}
                  hasGeneratedCode={hasGeneratedCode}
                  isCanvasOpen={isCanvasOpen}
                  isProjectReady={!projectSetup.isSettingUpProject && !!projectSetup.currentProjectId}
                  isOnboardingModalOpen={onboardingModal.isModalOpen}
                  onCodeGenerationStarting={handleCodeGenerationStarting}
                  onSetInputMessage={(setInputMessage) => { setInputMessageRef.current = setInputMessage }}
                  testSessionLogs={testSessionLogs}
                  onClearTestSessionLogs={handleClearTestSessionLogs}
                />
              </div>
            </div>
          ) : (
            /* Split View - Chat + Canvas */
            <div className="flex h-full" ref={chatCanvasContainerRef}>
              {/* Left Sidebar - AI Assistant */}
              <div className="flex flex-col bg-black animate-slide-in-left" style={{ width: `${chatCanvasDividerPosition}%` }}>
                <AIChat
                  projectId={projectSetup.currentProjectId}
                  projectName={projectSetup.currentProjectName}
                  availableFiles={fileManagement.flatFiles}
                  autoGeneratePrompt={autoGeneratePrompt}
                  onAutoGenerateComplete={handleAutoGenerateComplete}
                  onCodeGenerated={async (response) => {
                    await fileManagement.loadProjectFiles(true) // Refresh from server to get updated files
                    setIsGenerating(false)
                    setHasGeneratedCode(true)
                    // Refresh project details (name/description) after generation updates
                    await projectSetup.refreshCurrentProjectDetails?.()

                    // Clear autoGeneratePrompt now that code generation is complete
                    if (autoGeneratePrompt) {
                      handleAutoGenerateComplete()
                    }

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
                  onOpenCanvas={handleOpenCanvas}
                  hasGeneratedCode={hasGeneratedCode}
                  isCanvasOpen={isCanvasOpen}
                  isProjectReady={!projectSetup.isSettingUpProject && !!projectSetup.currentProjectId}
                  isOnboardingModalOpen={onboardingModal.isModalOpen}
                  onCodeGenerationStarting={handleCodeGenerationStarting}
                  onSetInputMessage={(setInputMessage) => { setInputMessageRef.current = setInputMessage }}
                  testSessionLogs={testSessionLogs}
                  onClearTestSessionLogs={handleClearTestSessionLogs}
                />
              </div>

              {/* Resizable Divider */}
              <ChatCanvasResizableDivider />

              {/* Canvas Pane - Files + Editor */}
              <div className="flex flex-col p-2" style={{ width: `${100 - chatCanvasDividerPosition}%`, maxWidth: '100%', maxHeight: '100%' }}>
                <Artifact className="h-full flex flex-col max-w-full max-h-full">
                  <ArtifactContent className="p-2">
                    {/* Files + Editor */}
                    <div className="flex-1 flex h-full" ref={containerRef}>
                      {/* Project Files Panel */}
                      {!isFileTreeCollapsed && (
                        <div style={{ width: `${dividerPosition}%` }}>
                          <ProjectFilesPanel
                            fileStructure={fileManagement.fileStructure}
                            selectedFile={selectedFile}
                            onFileSelect={handleFileSelect}
                            isLoadingFiles={fileManagement.isLoadingFiles}
                            searchQuery={searchQuery}
                            projectId={projectSetup.currentProjectId}
                            onAssetUploaded={() => fileManagement.loadProjectFiles(true)}
                            onAssetDeleted={fileManagement.handleAssetDelete}
                            onSearchChange={setSearchQuery}
                            flatFiles={fileManagement.flatFiles}
                          />
                        </div>
                      )}

                      {/* Resizable Divider */}
                      {!isFileTreeCollapsed && <ResizableDivider />}

                      {/* File Editor Panel */}
                      <div className="flex flex-col bg-black" style={{ width: isFileTreeCollapsed ? '100%' : `${100 - dividerPosition}%` }}>
                        <EditorPanel
                          selectedFile={selectedFile}
                          onFileSave={handleFileSave}
                          allFiles={fileManagement.flatFiles}
                          onClose={() => setIsCanvasOpen(false)}
                          isFileTreeCollapsed={isFileTreeCollapsed}
                          onToggleFileTree={() => setIsFileTreeCollapsed(!isFileTreeCollapsed)}
                        />
                      </div>
                    </div>
                  </ArtifactContent>
                </Artifact>
              </div>
            </div>
          )}
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
        onGeneratePuppeteerTests={handleGeneratePuppeteerTestsFromModal}
        onGenerateAiAgentTests={handleGenerateAiAgentTestsFromModal}
        onSessionLogsCapture={handleSessionLogsCapture}
        onSolveErrorInChat={handleSolveErrorInChat}
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

      {/* Testing Prompt Modal */}
      <TestingPromptModal
        isOpen={isTestingPromptOpen}
        onClose={() => setIsTestingPromptOpen(false)}
        onExploreCode={handleExploreCode}
        onTryItOut={handleTryItOut}
      />

      {/* AI Test Result Modal */}
      <AITestResultModal
        isOpen={isAITestResultModalOpen}
        onClose={() => setIsAITestResultModalOpen(false)}
        result={aiTestResult}
      />

      {/* Version History Panel */}
      <VersionHistoryPanel
        projectId={projectSetup.currentProjectId}
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        onVersionRestored={handleVersionRestored}
      />
    </>
  )
}

export default function BuilderPage() {
  return (
    <TourProvider>
      <BuilderPageContent />
    </TourProvider>
  )
}
