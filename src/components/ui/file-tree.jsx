import { useState } from "react"
import { ChevronDown, ChevronRight, File, Folder, FolderOpen, Copy, Check, Trash2, Plus } from "lucide-react"
import DeleteAssetModal from "@/components/ui/modals/delete-asset-modal"

// Files that cannot be deleted
const PROTECTED_FILES = ['manifest.json']

export default function FileTree({
  fileStructure,
  selectedFile,
  onFileSelect,
  isLoadingFiles,
  searchQuery,
  onDeleteAsset,
  onDeleteFile,
  onCreateFile
}) {
  const [expandedFolders, setExpandedFolders] = useState({})
  const [copiedFile, setCopiedFile] = useState(null)
  const [deletingAsset, setDeletingAsset] = useState(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState(null)
  const [newFileName, setNewFileName] = useState('')
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [createError, setCreateError] = useState('')

  const toggleFolder = (folderPath) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }))
  }

  const handleFileSelect = (file) => {
    onFileSelect(file)
  }

  // Check if a file can be deleted
  const canDeleteFile = (fileName) => {
    return !PROTECTED_FILES.includes(fileName.toLowerCase())
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

  // Open delete confirmation modal
  const handleDeleteClick = (file, e) => {
    e.stopPropagation()

    if (!canDeleteFile(file.name)) return

    setAssetToDelete(file)
    setDeleteModalOpen(true)
  }

  // Perform the actual deletion
  const handleConfirmDelete = async () => {
    if (!assetToDelete) return

    setDeletingAsset(assetToDelete.file_path)

    try {
      // Use appropriate delete handler based on file type
      if (assetToDelete.isAsset && onDeleteAsset) {
        await onDeleteAsset(assetToDelete)
      } else if (!assetToDelete.isAsset && onDeleteFile) {
        await onDeleteFile(assetToDelete)
      }

      // Close modal on success
      setDeleteModalOpen(false)
      setAssetToDelete(null)
    } catch (error) {
      console.error('Failed to delete file:', error)
      alert(`Failed to delete file: ${error.message || 'Unknown error'}`)
    } finally {
      setDeletingAsset(null)
    }
  }

  // Close modal without deleting
  const handleCancelDelete = () => {
    if (!deletingAsset) {
      setDeleteModalOpen(false)
      setAssetToDelete(null)
    }
  }

  // Handle new file creation
  const handleCreateFile = async (e) => {
    e?.preventDefault()

    if (!newFileName.trim() || isCreatingFile) return

    const fileName = newFileName.trim()
    setCreateError('')
    setIsCreatingFile(true)

    try {
      if (onCreateFile) {
        await onCreateFile(fileName)
      }
      // Clear input on success
      setNewFileName('')
      setCreateError('')
    } catch (error) {
      console.error('Failed to create file:', error)
      // Display the error message from the backend
      setCreateError(error.message || 'Failed to create file')
    } finally {
      setIsCreatingFile(false)
    }
  }

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

  // Filter files based on search query (searches both file names and content)
  const filterFileTree = (items, query) => {
    if (!query) return items
    
    const queryLower = query.toLowerCase()
    
    return items.filter(item => {
      if (item.type === 'file') {
        // Check if query matches file name
        const nameMatch = item.name.toLowerCase().includes(queryLower)
        
        // Check if query matches file content
        const contentMatch = item.content && 
          typeof item.content === 'string' && 
          item.content.toLowerCase().includes(queryLower)
        
        return nameMatch || contentMatch
      } else if (item.type === 'folder' && item.children) {
        const filteredChildren = filterFileTree(item.children, query)
        return filteredChildren.length > 0 || item.name.toLowerCase().includes(queryLower)
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
      <div key={index}>
        {item.type === "folder" ? (
          <div>
            <div
              className="group flex items-center py-2 px-3 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10 cursor-pointer rounded-lg transition-all duration-200 border border-transparent hover:border-purple-500/20 file-tree-item"
              style={{ marginLeft: `${level * 20}px` }}
              onClick={() => toggleFolder(item.fullPath || item.name)}
              data-type="folder"
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
            className={`group flex items-center py-2 px-3 hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50 cursor-pointer rounded-lg transition-all duration-200 border border-transparent hover:border-slate-500/30 file-tree-item ${
              selectedFile?.name === item.name ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/40" : ""
            }`}
            style={{ marginLeft: `${level * 20}px` }}
            onClick={() => handleFileSelect(item)}
            data-type="file"
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

              {/* Show delete button for all deletable files */}
              {canDeleteFile(item.name) && (
                <button
                  onClick={(e) => handleDeleteClick(item, e)}
                  className="p-1 hover:bg-red-500/20 rounded transition-colors"
                  title={`Delete ${item.isAsset ? 'asset' : 'file'}`}
                  disabled={deletingAsset === item.file_path}
                >
                  {deletingAsset === item.file_path ? (
                    <div className="h-3 w-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3 text-red-400 hover:text-red-300" />
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    ))
  }

  if (isLoadingFiles) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center">
        <div className="animate-spin-slow rounded-full h-12 w-12 border-4 border-gray-500/30 border-t-gray-500 mb-4"></div>
        <h4 className="text-lg font-medium text-slate-400 mb-2">loading files</h4>
        <p className="text-sm text-slate-500">fetching your project structure...</p>
      </div>
    )
  }

  if (fileStructure.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center animate-fade-in-up">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mb-6 animate-pulse-glow">
          <Package className="h-8 w-8 text-purple-400" />
        </div>
        <h4 className="text-lg font-medium gradient-text-secondary mb-2">no files yet</h4>
        <p className="text-sm text-slate-500 max-w-48 leading-relaxed">start by asking the ai assistant to generate your chrome extension</p>
      </div>
    )
  }

  return (
    <>
      {/* Create New File Input */}
      {onCreateFile && (
        <div className="mb-3">
          <form onSubmit={handleCreateFile} className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => {
                  setNewFileName(e.target.value)
                  setCreateError('')
                }}
                placeholder="new-file.js"
                disabled={isCreatingFile}
                className="w-full pl-3 pr-10 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newFileName.trim() || isCreatingFile}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:opacity-50 rounded text-white transition-colors"
                title="Create file"
              >
                {isCreatingFile ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            </div>
            {createError && (
              <p className="text-xs text-red-400 px-1">{createError}</p>
            )}
          </form>
        </div>
      )}

      {/* File Tree */}
      <div className="space-y-1">
        {renderFileTree(fileStructure)}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteAssetModal
        isOpen={deleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        assetName={assetToDelete?.name || ""}
        isDeleting={!!deletingAsset}
      />
    </>
  )
}
// Import missing icons
import { FileCode, Settings, Globe, Palette, Image, FileText, Package } from "lucide-react" 
