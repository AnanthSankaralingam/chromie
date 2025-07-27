"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import {
  Zap,
  Download,
  TestTube,
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  ArrowLeft,
  ArrowRight,
  LogOut,
} from "lucide-react"
import AIChat from "@/components/ui/ai-chat"
import TestModal from "@/components/ui/test-modal"
import AuthModal from "@/components/ui/auth-modal"
import AppBarBuilder from "@/components/ui/app-bar-builder"
import { useSession } from '@/components/SessionProviderClient'

export default function BuilderPage() {
  const { isLoading, session, user, supabase } = useSession()
  const router = useRouter()

  const [selectedFile, setSelectedFile] = useState(null)
  const [expandedFolders, setExpandedFolders] = useState({})
  const [dividerPosition, setDividerPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [fileStructure, setFileStructure] = useState([])
  const containerRef = useRef(null)

  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testSessionData, setTestSessionData] = useState(null)
  const [isTestLoading, setIsTestLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSettingUpProject, setIsSettingUpProject] = useState(false)
  const [projectSetupError, setProjectSetupError] = useState(null)
  const [currentProjectId, setCurrentProjectId] = useState(null)

  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

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

  // Check auth state and show modal if needed
  useEffect(() => {
    if (!isLoading && !user) {
      setIsAuthModalOpen(true)
    } else if (user) {
      setIsAuthModalOpen(false)
    }
  }, [isLoading, user])

  // Check for project and create one if needed
  useEffect(() => {
    if (user && !isLoading) {
      checkAndSetupProject()
    }
  }, [user, isLoading])

  // Load project files when currentProjectId is available
  useEffect(() => {
    if (currentProjectId && user) {
      loadProjectFiles()
    }
  }, [currentProjectId, user])

  // Update project info when file structure changes (after code generation)
  useEffect(() => {
    if (fileStructure.length > 0 && currentProjectId) {
      // Convert file structure back to flat list for manifest parsing
      const flattenFiles = (items) => {
        let files = []
        items.forEach(item => {
          if (item.type === 'file') {
            files.push({
              file_path: item.fullPath,
              content: item.content
            })
          } else if (item.children) {
            files = files.concat(flattenFiles(item.children))
          }
        })
        return files
      }
      
      const flatFiles = flattenFiles(fileStructure)
      const extensionInfo = extractExtensionInfo(flatFiles)
      if (extensionInfo) {
        updateProjectWithExtensionInfo(extensionInfo)
      }
    }
  }, [fileStructure, currentProjectId])

  const checkAndSetupProject = async () => {
    // Check if we have a project ID in session storage
    const storedProjectId = sessionStorage.getItem('chromie_current_project_id')
    
    if (storedProjectId) {
      setCurrentProjectId(storedProjectId)
      setIsSettingUpProject(false)
      setProjectSetupError(null)
      return
    }

    // Prevent infinite loops - only try once
    if (projectSetupError) {
      return
    }

    setIsSettingUpProject(true)
    setProjectSetupError(null)

    try {
      // Check if user has any existing projects
      const response = await fetch('/api/projects')
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to fetch projects:', errorText)
        setProjectSetupError('Failed to load projects')
        setIsSettingUpProject(false)
        return
      }

      const data = await response.json()
      const projects = data.projects || []

      if (projects.length > 0) {
        // User has existing projects, use the most recent one
        const mostRecentProject = projects[0] // Already ordered by created_at desc
        console.log('Using existing project:', mostRecentProject.id)
        setCurrentProjectId(mostRecentProject.id)
        sessionStorage.setItem('chromie_current_project_id', mostRecentProject.id)
      } else {
        // No projects exist, create a default one
        await createDefaultProject()
      }
    } catch (error) {
      console.error('Error checking/setting up project:', error)
      setProjectSetupError('Failed to set up project')
      setIsSettingUpProject(false)
    }
  }

  const createDefaultProject = async () => {
    try {
      console.log('Creating default project...')
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'My First Extension',
          description: 'A Chrome extension built with chromie AI'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to create default project:', errorData)
        setProjectSetupError(`Failed to create project: ${errorData.error}`)
        setIsSettingUpProject(false)
        return
      }

      const data = await response.json()
      const newProject = data.project

      console.log('Created new project:', newProject.id)
      
      // Store the project ID in session storage and state
      setCurrentProjectId(newProject.id)
      sessionStorage.setItem('chromie_current_project_id', newProject.id)
      setIsSettingUpProject(false)
    } catch (error) {
      console.error('Error creating default project:', error)
      setProjectSetupError('Failed to create project')
      setIsSettingUpProject(false)
    }
  }

  // Helper function to extract extension info from manifest.json
  const extractExtensionInfo = (files) => {
    const manifestFile = files.find(file => file.file_path === 'manifest.json')
    if (!manifestFile) return null

    try {
      const manifest = JSON.parse(manifestFile.content)
      return {
        name: manifest.name || 'Chrome Extension',
        description: manifest.description || 'A Chrome extension built with Chromie AI'
      }
    } catch (error) {
      console.error('Error parsing manifest.json:', error)
      return null
    }
  }

  // Helper function to update project with extension info
  const updateProjectWithExtensionInfo = async (extensionInfo) => {
    if (!extensionInfo || !currentProjectId) return

    try {
      const response = await fetch(`/api/projects/${currentProjectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: extensionInfo.name,
          description: extensionInfo.description
        }),
      })

      if (!response.ok) {
        console.error('Failed to update project with extension info')
      }
    } catch (error) {
      console.error('Error updating project with extension info:', error)
    }
  }

  const loadProjectFiles = async () => {
    if (!currentProjectId) {
      console.error("No project ID available for loading files")
      return
    }

    try {
      const response = await fetch(`/api/projects/${currentProjectId}/files`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error loading project files:", errorData.error)
        return
      }

      const data = await response.json()
      const files = data.files || []

      // Transform flat file list into hierarchical structure
      const transformedFiles = transformFilesToTree(files)
      setFileStructure(transformedFiles)

      // Extract and update project with extension info from manifest.json
      const extensionInfo = extractExtensionInfo(files)
      if (extensionInfo) {
        await updateProjectWithExtensionInfo(extensionInfo)
      }
    } catch (error) {
      console.error("Error loading project files:", error)
    }
  }

  // Helper function to transform flat file list into tree structure
  const transformFilesToTree = (files) => {
    const tree = {}
    const result = []

    // First, create all files and folders
    files.forEach(file => {
      const pathParts = file.file_path.split('/')
      let current = tree

      pathParts.forEach((part, index) => {
        if (!current[part]) {
          if (index === pathParts.length - 1) {
            // This is a file
            current[part] = {
              name: part,
              type: "file",
              content: file.content,
              fullPath: file.file_path
            }
                     } else {
             // This is a folder
             const folderPath = pathParts.slice(0, index + 1).join('/')
             current[part] = {
               name: part,
               type: "folder",
               children: {},
               fullPath: folderPath
             }
           }
        }
        current = current[part].children || current[part]
      })
    })

    // Convert tree structure to array format
    const convertToArray = (obj) => {
      return Object.values(obj).map(item => {
        if (item.type === "folder" && item.children) {
          return {
            ...item,
            children: convertToArray(item.children)
          }
        }
        return item
      })
    }

    return convertToArray(tree)
  }

  const toggleFolder = (folderPath) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }))
  }

  const handleFileSelect = (file) => {
    setSelectedFile(file)
  }

  const handleDownloadZip = () => {
    // TODO: Generate and download ZIP file
    console.log("downloading zip...")
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return

      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100

      const constrainedPosition = Math.min(Math.max(newPosition, 20), 80)
      setDividerPosition(constrainedPosition)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  const renderFileTree = (items, level = 0) => {
    return items.map((item, index) => (
      <div key={index} style={{ marginLeft: `${level * 16}px` }}>
        {item.type === "folder" ? (
          <div>
            <div
              className="flex items-center py-1 px-2 hover:bg-white/10 cursor-pointer rounded"
              onClick={() => toggleFolder(item.fullPath || item.name)}
            >
              {expandedFolders[item.fullPath || item.name] ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              {expandedFolders[item.fullPath || item.name] ? (
                <FolderOpen className="h-4 w-4 mr-2 text-blue-400" />
              ) : (
                <Folder className="h-4 w-4 mr-2 text-blue-400" />
              )}
              <span className="text-sm text-slate-300">{item.name}</span>
            </div>
            {expandedFolders[item.fullPath || item.name] && item.children && <div>{renderFileTree(item.children, level + 1)}</div>}
          </div>
        ) : (
          <div
            className={`flex items-center py-1 px-2 hover:bg-white/10 cursor-pointer rounded ${
              selectedFile?.name === item.name ? "bg-white/10" : ""
            }`}
            onClick={() => handleFileSelect(item)}
          >
            <File className="h-4 w-4 mr-2 text-slate-400" />
            <span className="text-sm text-slate-300">{item.name}</span>
          </div>
        )}
      </div>
    ))
  }

  const handleTestExtension = async () => {
    if (!currentProjectId) {
      console.error("No project ID available")
      return
    }

    setIsTestLoading(true)
    setIsTestModalOpen(true)

    try {
      const response = await fetch(`/api/projects/${currentProjectId}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create test session")
      }

      setTestSessionData(data.session)
      console.log("Test session created:", data.session.sessionId)
    } catch (error) {
      console.error("Error creating test session:", error)
      // Keep modal open but show error state
      setTestSessionData(null)
    } finally {
      setIsTestLoading(false)
    }
  }

  const handleCloseTestModal = async () => {
    // Terminate session if active
    if (testSessionData?.sessionId) {
      try {
        await fetch(`/api/projects/${currentProjectId}/test`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: testSessionData.sessionId }),
        })
      } catch (error) {
        console.error("Error terminating test session:", error)
      }
    }

    setIsTestModalOpen(false)
    setTestSessionData(null)
  }

  const handleRefreshTest = () => {
    if (testSessionData) {
      handleTestExtension()
    }
  }

  if (isLoading || isSettingUpProject || (!currentProjectId && user && !projectSetupError)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-300">
            {isLoading ? "Loading..." : "Setting up your project..."}
          </p>
        </div>
      </div>
    )
  }

  // Show error state if project setup failed
  if (projectSetupError && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Setup Error</h2>
          <p className="text-slate-300 mb-6">{projectSetupError}</p>
          <Button 
            onClick={() => {
              setProjectSetupError(null)
              checkAndSetupProject()
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // No need to check for user here - middleware handles auth protection

  const handleSignOut = async () => {
    // Clear session storage on sign out
    sessionStorage.removeItem('chromie_current_project_id')
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white ${!user ? 'blur-sm pointer-events-none' : ''}`}>
        {/* Header */}
        <AppBarBuilder
          onTestExtension={handleTestExtension}
          onDownloadZip={handleDownloadZip}
          onSignOut={handleSignOut}
          isTestDisabled={!currentProjectId || fileStructure.length === 0}
          isGenerating={isGenerating}
        />

        <div className="flex h-[calc(100vh-73px)] bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm">
          {/* Left Sidebar - AI Assistant */}
          <div className="w-80 border-r border-white/10 flex flex-col">
            <AIChat
              projectId={currentProjectId}
              onCodeGenerated={(response) => {
                console.log("AI generated code:", response)
                loadProjectFiles() // Reload files after generation
                setIsGenerating(false) // Reset generating state
              }}
              onGenerationStart={() => setIsGenerating(true)}
              onGenerationEnd={() => setIsGenerating(false)}
            />
          </div>

          {/* Main Content Area with Resizable Panels */}
          <div className="flex-1 flex" ref={containerRef}>
            {/* Project Files Panel */}
            <div className="border-r border-white/10" style={{ width: `${dividerPosition}%` }}>
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold mb-1">project files</h3>
                <p className="text-sm text-slate-400">chrome extension structure</p>
              </div>
              <div className="p-4 overflow-auto h-[calc(100%-80px)]">{renderFileTree(fileStructure)}</div>
            </div>

            {/* Resizable Divider */}
            <div
              className="w-1 bg-white/10 hover:bg-white/20 cursor-col-resize transition-colors relative group"
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-white/5" />
            </div>

            {/* File Editor Panel */}
            <div className="flex flex-col" style={{ width: `${100 - dividerPosition}%` }}>
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold">file editor</h3>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-8 flex items-center justify-center">
                {selectedFile ? (
                  <div className="w-full h-full">
                    <div className="mb-4">
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {selectedFile.name}
                      </Badge>
                    </div>
                    <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 h-96 overflow-auto border border-white/10">
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{selectedFile.content}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <File className="h-8 w-8 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-slate-300">no file selected</h3>
                    <p className="text-slate-500">select a file to view and edit its contents</p>
                  </div>
                )}
              </div>
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
      <TestModal
        isOpen={isTestModalOpen}
        onClose={handleCloseTestModal}
        sessionData={testSessionData}
        onRefresh={handleRefreshTest}
        isLoading={isTestLoading}
      />
    </>
  )
}
