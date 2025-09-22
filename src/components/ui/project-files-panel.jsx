import { Search, Layers } from "lucide-react"
import FileTree from "./file-tree"

export default function ProjectFilesPanel({
  fileStructure,
  selectedFile,
  onFileSelect,
  isLoadingFiles,
  searchQuery,
  onSearchChange
}) {
  return (
    <div className="h-full lg:border-r border-white/10 bg-gradient-to-b from-slate-800/30 to-slate-900/30 animate-fade-in-up flex flex-col">
      <div className="p-3 sm:p-4 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-700/50 flex-shrink-0">
        <div className="flex items-center space-x-2 mb-2 sm:mb-3">
          <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
          <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">project files</h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mb-2 sm:mb-3">chrome extension structure</p>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
          <input
            type="text"
            placeholder="search files..."
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
          />
        </div>
      </div>
    </div>
  )
} 