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
  FileText,
  FileCode,
  Image,
  Settings,
  Package,
  Palette,
  Globe,
  Layers,
  Search,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react"
import AIChat from "@/components/ui/ai-chat"
import TestModal from "@/components/ui/test-modal"
import AuthModal from "@/components/ui/auth-modal"
import AppBarBuilder from "@/components/ui/app-bar-builder"
import { useSession } from '@/components/SessionProviderClient'
import JSZip from 'jszip'

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
  const [currentProjectName, setCurrentProjectName] = useState('')
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [autoGeneratePrompt, setAutoGeneratePrompt] = useState(null)
  const [copiedFile, setCopiedFile] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFileTreeCollapsed, setIsFileTreeCollapsed] = useState(false)

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

  // Helper function to fetch project details
  const fetchProjectDetails = async (projectId) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        return data.project
      }
    } catch (error) {
      console.error('Error fetching project details:', error)
    }
    return null
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

  // Clear URL parameters after project is loaded
  useEffect(() => {
    if (currentProjectId && !isSettingUpProject) {
      // Clear the project and autoGenerate parameters from URL without triggering a reload
      const url = new URL(window.location)
      let hasChanges = false
      
      if (url.searchParams.has('project')) {
        url.searchParams.delete('project')
        hasChanges = true
      }
      if (url.searchParams.has('autoGenerate')) {
        url.searchParams.delete('autoGenerate')
        hasChanges = true
      }
      
      if (hasChanges) {
        window.history.replaceState({}, '', url.pathname)
      }
    }
  }, [currentProjectId, isSettingUpProject])

  // Update project info when file structure changes (after code generation)
  useEffect(() => {
    if (fileStructure.length > 0 && currentProjectId && !isLoadingFiles) {
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
  }, [fileStructure, currentProjectId, isLoadingFiles])

  const checkAndSetupProject = async () => {
    // Check if we have a project ID in URL state (from navigation)
    const urlParams = new URLSearchParams(window.location.search)
    const projectIdFromUrl = urlParams.get('project') // Changed from 'projectId' to 'project'
    const autoGenerateFromUrl = urlParams.get('autoGenerate')
    
    // Store autoGenerate prompt if present
    if (autoGenerateFromUrl) {
      setAutoGeneratePrompt(decodeURIComponent(autoGenerateFromUrl))
    }
    
    // Check if we have a project ID in session storage
    const storedProjectId = sessionStorage.getItem('chromie_current_project_id')
    
    // Priority: URL parameter > session storage > most recent project
    if (projectIdFromUrl) {
      console.log('Using project ID from URL:', projectIdFromUrl)
      setCurrentProjectId(projectIdFromUrl)
      sessionStorage.setItem('chromie_current_project_id', projectIdFromUrl)
      // Fetch project details to get the name
      const projectDetails = await fetchProjectDetails(projectIdFromUrl)
      if (projectDetails) {
        setCurrentProjectName(projectDetails.name)
      }
      setIsSettingUpProject(false)
      setProjectSetupError(null)
      return
    }
    
    if (storedProjectId) {
      setCurrentProjectId(storedProjectId)
      // Fetch project details to get the name
      const projectDetails = await fetchProjectDetails(storedProjectId)
      if (projectDetails) {
        setCurrentProjectName(projectDetails.name)
      }
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
        setCurrentProjectName(mostRecentProject.name)
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
      setCurrentProjectName(newProject.name)
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
      } else {
        // Update local project name
        setCurrentProjectName(extensionInfo.name)
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

    setIsLoadingFiles(true)
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
      // Only update if we haven't already updated this project recently
      const extensionInfo = extractExtensionInfo(files)
      if (extensionInfo) {
        // Check if we need to update (avoid unnecessary updates)
        const lastUpdateKey = `last_project_update_${currentProjectId}`
        const lastUpdate = sessionStorage.getItem(lastUpdateKey)
        const now = Date.now()
        
        // Only update if it's been more than 5 minutes since last update
        if (!lastUpdate || (now - parseInt(lastUpdate)) > 5 * 60 * 1000) {
          await updateProjectWithExtensionInfo(extensionInfo)
          sessionStorage.setItem(lastUpdateKey, now.toString())
        }
      }
    } catch (error) {
      console.error("Error loading project files:", error)
    } finally {
      setIsLoadingFiles(false)
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

  const handleDownloadZip = async () => {
    if (!currentProjectId || fileStructure.length === 0) {
      console.error("No project or files available for download")
      return
    }

    setIsDownloading(true)

    try {
      // Create a new JSZip instance
      const zip = new JSZip()

      // Helper function to add files to zip recursively
      const addFilesToZip = (items, zipFolder = zip) => {
        items.forEach(item => {
          if (item.type === "file") {
            // Add file to zip
            zipFolder.file(item.name, item.content)
          } else if (item.type === "folder" && item.children) {
            // Create folder in zip and add its contents
            const folder = zipFolder.folder(item.name)
            addFilesToZip(item.children, folder)
          }
        })
      }

      // Add all files to the zip
      addFilesToZip(fileStructure)

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" })

      // Create download link
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      
      // Create filename with project name
      const safeProjectName = currentProjectName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
      link.download = `chromie-ext-${safeProjectName}.zip`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      URL.revokeObjectURL(url)
      
      console.log("ZIP file downloaded successfully")
    } catch (error) {
      console.error("Error creating ZIP file:", error)
    } finally {
      setIsDownloading(false)
    }
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

  // Helper function to get file icon based on extension
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileCode className="h-4 w-4 text-yellow-400" />
      case 'json':
        return <Settings className="h-4 w-4 text-orange-400" />
      case 'html':
      case 'htm':
        return <Globe className="h-4 w-4 text-red-400" />
      case 'css':
      case 'scss':
      case 'sass':
        return <Palette className="h-4 w-4 text-blue-400" />
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return <Image className="h-4 w-4 text-green-400" />
      case 'md':
      case 'txt':
        return <FileText className="h-4 w-4 text-slate-400" />
      default:
        return <File className="h-4 w-4 text-slate-400" />
    }
  }

  // Helper function to copy file content
  const handleCopyFile = async (file) => {
    try {
      await navigator.clipboard.writeText(file.content)
      setCopiedFile(file.name)
      setTimeout(() => setCopiedFile(null), 2000)
    } catch (error) {
      console.error('Failed to copy file content:', error)
    }
  }

  // Filter files based on search query
  const filterFileTree = (items, query) => {
    if (!query) return items
    
    return items.filter(item => {
      if (item.type === 'file') {
        return item.name.toLowerCase().includes(query.toLowerCase())
      } else if (item.type === 'folder' && item.children) {
        const filteredChildren = filterFileTree(item.children, query)
        return filteredChildren.length > 0 || item.name.toLowerCase().includes(query.toLowerCase())
      }
      return false
    }).map(item => {
      if (item.type === 'folder' && item.children) {
        return {
          ...item,
          children: filterFileTree(item.children, query)
        }
      }
      return item
    })
  }

  const renderFileTree = (items, level = 0) => {
    const filteredItems = filterFileTree(items, searchQuery)
    
    return filteredItems.map((item, index) => (
      <div key={index} style={{ marginLeft: `${level * 20}px` }}>
        {item.type === "folder" ? (
          <div>
            <div
              className="group flex items-center py-2 px-3 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10 cursor-pointer rounded-lg transition-all duration-200 border border-transparent hover:border-purple-500/20"
              onClick={() => toggleFolder(item.fullPath || item.name)}
            >
              <div className="flex items-center flex-1">
                {expandedFolders[item.fullPath || item.name] ? 
                  <ChevronDown className="h-4 w-4 mr-2 text-slate-400 group-hover:text-purple-400 transition-colors" /> : 
                  <ChevronRight className="h-4 w-4 mr-2 text-slate-400 group-hover:text-purple-400 transition-colors" />
                }
                {expandedFolders[item.fullPath || item.name] ? (
                  <FolderOpen className="h-4 w-4 mr-3 text-blue-400 group-hover:text-blue-300" />
                ) : (
                  <Folder className="h-4 w-4 mr-3 text-blue-400 group-hover:text-blue-300" />
                )}
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{item.name}</span>
              </div>
              {item.children && (
                <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
                  {item.children.length}
                </span>
              )}
            </div>
            {expandedFolders[item.fullPath || item.name] && item.children && (
              <div className="mt-1">{renderFileTree(item.children, level + 1)}</div>
            )}
          </div>
        ) : (
          <div
            className={`group flex items-center py-2 px-3 hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 cursor-pointer rounded-lg transition-all duration-200 border border-transparent hover:border-slate-500/30 ${
              selectedFile?.name === item.name ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/40" : ""
            }`}
            onClick={() => handleFileSelect(item)}
          >
            <div className="flex items-center flex-1">
              {getFileIcon(item.name)}
              <span className={`text-sm ml-3 transition-colors ${
                selectedFile?.name === item.name ? "text-white font-medium" : "text-slate-300 group-hover:text-white"
              }`}>
                {item.name}
              </span>
            </div>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyFile(item)
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Copy file content"
              >
                {copiedFile === item.name ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3 text-slate-400" />
                )}
              </button>
            </div>
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

  // Helper function to navigate to builder with project ID
  const navigateToBuilderWithProject = (projectId) => {
    // Navigate to builder with project ID in URL, then clear it
    router.push(`/builder?projectId=${projectId}`)
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
          isDownloadDisabled={!currentProjectId || fileStructure.length === 0}
          isGenerating={isGenerating}
          isDownloading={isDownloading}
        />

        <div className="flex h-[calc(100vh-73px)] bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm">
          {/* Left Sidebar - AI Assistant */}
          <div className="w-80 lg:w-80 md:w-72 sm:w-64 border-r border-white/10 flex flex-col glass-effect animate-slide-in-left">
            <AIChat
              projectId={currentProjectId}
              autoGeneratePrompt={autoGeneratePrompt}
              onAutoGenerateComplete={() => setAutoGeneratePrompt(null)} // Clear the prompt after use
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
            <div className="border-r border-white/10 bg-gradient-to-b from-slate-800/30 to-slate-900/30 animate-fade-in-up" style={{ width: `${dividerPosition}%` }}>
              <div className="p-4 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Layers className="h-5 w-5 text-purple-400" />
                    <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Project Files</h3>
                  </div>
                  <button
                    onClick={() => setIsFileTreeCollapsed(!isFileTreeCollapsed)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title={isFileTreeCollapsed ? "Expand" : "Collapse"}
                  >
                    {isFileTreeCollapsed ? <Eye className="h-4 w-4 text-slate-400" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                  </button>
                </div>
                <p className="text-sm text-slate-400 mb-3">Chrome extension structure</p>
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                  />
                </div>
              </div>
              
              {!isFileTreeCollapsed && (
                <div className="p-4 overflow-auto h-[calc(100%-140px)] custom-scrollbar">
                  {isLoadingFiles ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <div className="animate-spin-slow rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-purple-500 mb-4"></div>
                      <h4 className="text-lg font-medium text-slate-400 mb-2">Loading Files</h4>
                      <p className="text-sm text-slate-500">Fetching your project structure...</p>
                    </div>
                  ) : fileStructure.length > 0 ? (
                    <div className="space-y-1">
                      {renderFileTree(fileStructure)}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in-up">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mb-6 animate-pulse-glow">
                        <Package className="h-8 w-8 text-purple-400" />
                      </div>
                      <h4 className="text-lg font-medium gradient-text-secondary mb-2">No Files Yet</h4>
                      <p className="text-sm text-slate-500 max-w-48 leading-relaxed">Start by asking the AI assistant to generate your Chrome extension</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resizable Divider */}
            <div
              className="w-1 bg-gradient-to-b from-purple-500/20 to-blue-500/20 hover:from-purple-500/40 hover:to-blue-500/40 cursor-col-resize transition-all duration-300 relative group"
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-gradient-to-b group-hover:from-purple-500/10 group-hover:to-blue-500/10 transition-all duration-300" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-12 bg-gradient-to-b from-purple-500/30 to-blue-500/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            {/* File Editor Panel */}
            <div className="flex flex-col bg-gradient-to-b from-slate-800/20 to-slate-900/20 animate-fade-in-up" style={{ width: `${100 - dividerPosition}%` }}>
              <div className="p-4 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileCode className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Code Editor</h3>
                  </div>
                  {selectedFile && (
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/10 px-3 py-1">
                        {selectedFile.name}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                          onClick={() => handleCopyFile(selectedFile)}
                          title="Copy file content"
                        >
                          {copiedFile === selectedFile.name ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 p-6">
                {selectedFile ? (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 glass-effect rounded-xl p-6 shadow-2xl overflow-hidden hover-lift">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(selectedFile.name)}
                          <span className="font-medium text-white">{selectedFile.name}</span>
                          <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                            {selectedFile.content.split('\n').length} lines
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="h-[calc(100%-60px)] overflow-auto custom-scrollbar">
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap code-editor">
                          <code className="language-javascript">{selectedFile.content}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-md animate-fade-in-up">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-purple-500/20 animate-pulse-glow hover-lift">
                        <FileCode className="h-10 w-10 text-purple-400" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-3 gradient-text-secondary">Ready to Code</h3>
                      <p className="text-slate-400 mb-6 leading-relaxed">Select a file from the project tree to view and edit its contents with enhanced syntax highlighting</p>
                      <div className="flex items-center justify-center space-x-6 text-sm text-slate-500">
                        <div className="flex items-center space-x-2 hover-lift">
                          <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse"></div>
                          <span className="font-medium">JavaScript</span>
                        </div>
                        <div className="flex items-center space-x-2 hover-lift">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse"></div>
                          <span className="font-medium">CSS</span>
                        </div>
                        <div className="flex items-center space-x-2 hover-lift">
                          <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-pulse"></div>
                          <span className="font-medium">HTML</span>
                        </div>
                      </div>
                    </div>
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
