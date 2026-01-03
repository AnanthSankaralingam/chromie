import { Search, Layers, Upload } from "lucide-react"
import FileTree from "./file-tree"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import AssetUploadModal from "./file-upload/asset-upload-modal"

export default function ProjectFilesPanel({
  fileStructure,
  selectedFile,
  onFileSelect,
  isLoadingFiles,
  searchQuery,
  onSearchChange,
  projectId,
  onAssetUploaded,
  onAssetDeleted
}) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  // Listen for global selection/focus events
  if (typeof window !== 'undefined') {
    // Auto-select a file being written/updated
    window.__chromie_selectFileListener ||= (e) => {
      try {
        const targetPath = e?.detail?.file_path
        if (!targetPath || !Array.isArray(fileStructure)) return
        const findInTree = (items) => {
          for (const item of items) {
            if (item.type === 'file' && (item.fullPath === targetPath || item.file_path === targetPath || item.name === targetPath)) return item
            if (item.type === 'folder' && item.children) {
              const hit = findInTree(item.children)
              if (hit) return hit
            }
          }
          return null
        }
        const file = findInTree(fileStructure)
        if (file) onFileSelect(file)
      } catch (_) {}
    }
    if (!window.__chromie_selectFileBound) {
      window.addEventListener('editor:selectFile', window.__chromie_selectFileListener)
      window.__chromie_selectFileBound = true
    }

    // Focus manifest.json on completion
    window.__chromie_focusManifestListener ||= () => {
      try {
        if (!Array.isArray(fileStructure)) return
        const findManifest = (items) => {
          for (const item of items) {
            if (item.type === 'file' && String(item.name).toLowerCase() === 'manifest.json') return item
            if (item.type === 'folder' && item.children) {
              const hit = findManifest(item.children)
              if (hit) return hit
            }
          }
          return null
        }
        const manifest = findManifest(fileStructure)
        if (manifest) onFileSelect(manifest)
      } catch (_) {}
    }
    if (!window.__chromie_focusManifestBound) {
      window.addEventListener('editor:focusManifest', window.__chromie_focusManifestListener)
      window.__chromie_focusManifestBound = true
    }
  }
  const handleAssetUpload = (asset) => {
    console.log('Asset uploaded:', asset)
    // Call the callback to refresh files
    if (onAssetUploaded) {
      onAssetUploaded()
    }
  }

  return (
    <div className="h-full bg-gradient-to-b from-slate-800/30 to-slate-900/30 animate-fade-in-up flex flex-col">
      <div className="p-3 sm:p-4 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-700/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center space-x-2">
            <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
            <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">project files</h3>
          </div>
          {projectId && (
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              size="sm"
              variant="outline"
              className="bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white"
            >
              <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mb-2 sm:mb-3">chrome extension structure</p>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
          <input
            type="text"
            placeholder="search files and code"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs sm:text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar bg-gradient-to-b from-slate-800/30 to-slate-900/30">
        <div className="p-2 sm:p-4">
          <FileTree
            fileStructure={fileStructure}
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
            isLoadingFiles={isLoadingFiles}
            searchQuery={searchQuery}
            onDeleteAsset={onAssetDeleted}
          />
        </div>
      </div>

      {/* Asset Upload Modal */}
      {projectId && (
        <AssetUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUpload={handleAssetUpload}
          projectId={projectId}
        />
      )}
    </div>
  )
} 