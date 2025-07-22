"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"
import Link from "next/link"
import AIChat from "@/components/ui/ai-chat"
import { useAuth } from "@/context/auth-context"

export default function BuilderPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [chatMessage, setChatMessage] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState({
    scripts: true,
    styles: true,
  })
  const [dividerPosition, setDividerPosition] = useState(50) // Percentage
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const { user, loading } = useAuth();

  // Mock file structure
  const fileStructure = [
    {
      name: "manifest.json",
      type: "file",
      content: '{\n  "manifest_version": 3,\n  "name": "my extension",\n  "version": "1.0"\n}',
    },
    {
      name: "popup.html",
      type: "file",
      content:
        "<!DOCTYPE html>\n<html>\n<head>\n  <title>extension popup</title>\n</head>\n<body>\n  <h1>hello world!</h1>\n</body>\n</html>",
    },
    {
      name: "scripts",
      type: "folder",
      expanded: expandedFolders.scripts,
      children: [
        { name: "popup.js", type: "file", content: 'console.log("popup script loaded");' },
        { name: "content.js", type: "file", content: 'console.log("content script loaded");' },
      ],
    },
    {
      name: "styles",
      type: "folder",
      expanded: expandedFolders.styles,
      children: [
        { name: "popup.css", type: "file", content: "body {\n  font-family: arial, sans-serif;\n  padding: 20px;\n}" },
      ],
    },
  ]

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return

    setIsGenerating(true)
    // TODO: Integrate with OpenAI API
    console.log("sending message to ai:", chatMessage)

    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false)
      setChatMessage("")
    }, 2000)
  }

  const toggleFolder = (folderName) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }))
  }

  const handleFileSelect = (file) => {
    setSelectedFile(file)
  }

  const handleTestExtension = () => {
    // TODO: Integrate with browser testing environment
    console.log("testing extension...")
  }

  const handleDownloadZip = () => {
    // TODO: Generate and download ZIP file
    console.log("downloading zip...")
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    e.preventDefault()
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return

    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100

    // Constrain between 20% and 80%
    const constrainedPosition = Math.min(Math.max(newPosition, 20), 80)
    setDividerPosition(constrainedPosition)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Add event listeners for mouse move and up
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return

      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100

      // Constrain between 20% and 80%
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
              onClick={() => toggleFolder(item.name)}
            >
              {item.expanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              {item.expanded ? (
                <FolderOpen className="h-4 w-4 mr-2 text-blue-400" />
              ) : (
                <Folder className="h-4 w-4 mr-2 text-blue-400" />
              )}
              <span className="text-sm text-slate-300">{item.name}</span>
            </div>
            {item.expanded && item.children && <div>{renderFileTree(item.children, level + 1)}</div>}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">chromie ai</span>
            </Link>
            <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
              extension builder assistant
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleTestExtension} className="bg-green-600 hover:bg-green-700">
              <TestTube className="h-4 w-4 mr-2" />
              test extension
            </Button>
            <Button onClick={handleDownloadZip} className="bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4 mr-2" />
              download zip
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)] bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm">
        {/* Left Sidebar - AI Assistant */}
        <div className="w-80 border-r border-white/10 flex flex-col">
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : user ? (
            <AIChat
              projectId={currentProjectId}
              onCodeGenerated={(response) => {
                // Handle code generation response
                console.log("AI generated code:", response)
              }}
            />
          ) : (
            <div className="flex flex-col h-full items-center justify-center p-8 text-center text-purple-200">
              <p className="mb-4 text-lg font-semibold">Sign up or sign in to start building your extension!</p>
              <Link href="/auth/signup">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Sign up</Button>
              </Link>
              <p className="mt-2 text-sm text-slate-400">Already have an account? <Link href="/auth/signin" className="underline">Sign in</Link></p>
            </div>
          )}
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
                    <ArrowLeft className="h-8 w-8 text-slate-500" />
                    <ArrowRight className="h-8 w-8 text-slate-500" />
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
  )
}
