import { FileCode } from "lucide-react"
import MonacoEditor from "./monaco-editor"

export default function EditorPanel({ selectedFile, onFileSave, allFiles, onClose, isFileTreeCollapsed, onToggleFileTree, onHtmlPreviewToggle }) {
  // Focus editor panel on external file selection signal
  if (typeof window !== 'undefined') {
    window.__chromie_focusManifestToEditor ||= () => {
      try {
        // no-op here; ProjectFilesPanel will update selectedFile, and this component will render Monaco
        // we can add future hooks if needed
      } catch (_) { }
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
        onClose={onClose}
        isFileTreeCollapsed={isFileTreeCollapsed}
        onToggleFileTree={onToggleFileTree}
        readOnly={false}
        onHtmlPreviewToggle={onHtmlPreviewToggle}
      />
    )
  }

  return (
    <div className="h-full flex items-center justify-center bg-secondary/10 px-4">
      <div className="text-center max-w-sm sm:max-w-md animate-fade-in-up">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-primary/20 animate-pulse-glow hover-lift">
          <FileCode className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-foreground">Chromie Editor</h3>
        <p className="text-muted-foreground mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">Select a file from the project tree to start coding with full IDE features</p>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="font-medium">Intellisense</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="font-medium">Syntax Highlighting</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-medium">Auto-complete</span>
          </div>
        </div>
      </div>
    </div>
  )
} 