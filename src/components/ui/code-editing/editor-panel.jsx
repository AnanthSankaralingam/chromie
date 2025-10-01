import { FileCode } from "lucide-react"
import MonacoEditor from "./monaco-editor"

export default function EditorPanel({ selectedFile, onFileSave, allFiles }) {
  // Focus editor panel on external file selection signal
  if (typeof window !== 'undefined') {
    window.__chromie_focusManifestToEditor ||= () => {
      try {
        // no-op here; ProjectFilesPanel will update selectedFile, and this component will render Monaco
        // we can add future hooks if needed
      } catch (_) {}
    }
    if (!window.__chromie_focusManifestToEditorBound) {
      window.addEventListener('editor:focusManifest', window.__chromie_focusManifestToEditor)
      window.__chromie_focusManifestToEditorBound = true
    }
  }
  if (selectedFile) {
    return (
      <MonacoEditor 
        code={selectedFile.content}
        fileName={selectedFile.name}
        filePath={selectedFile.fullPath}
        projectFiles={allFiles}
        className="h-full"
        onSave={onFileSave}
        readOnly={false}
      />
    )
  }

  return (
    <div className="h-full flex items-center justify-center bg-slate-900 bg-gradient-to-b from-slate-800/30 to-slate-900/30 px-4">
      <div className="text-center max-w-sm sm:max-w-md animate-fade-in-up">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-purple-500/20 animate-pulse-glow hover-lift">
          <FileCode className="h-8 w-8 sm:h-10 sm:w-10 text-purple-400" />
        </div>
        <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">chromie editor</h3>
        <p className="text-slate-400 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">select a file from the project tree to start coding with full ide features</p>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 text-xs sm:text-sm text-slate-500">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse"></div>
            <span className="font-medium">intellisense</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse"></div>
            <span className="font-medium">syntax highlighting</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse"></div>
            <span className="font-medium">auto-complete</span>
          </div>
        </div>
      </div>
    </div>
  )
} 