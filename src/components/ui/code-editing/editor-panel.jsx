import { FileCode } from "lucide-react"
import MonacoEditor from "./monaco-editor"

export default function EditorPanel({ selectedFile, onFileSave }) {
  if (selectedFile) {
    return (
      <MonacoEditor 
        code={selectedFile.content}
        fileName={selectedFile.name}
        className="h-full"
        onSave={onFileSave}
        readOnly={false}
      />
    )
  }

  return (
    <div className="h-full flex items-center justify-center bg-slate-900 bg-gradient-to-b from-slate-800/30 to-slate-900/30">
      <div className="text-center max-w-md animate-fade-in-up">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-purple-500/20 animate-pulse-glow hover-lift">
          <FileCode className="h-10 w-10 text-purple-400" />
        </div>
        <h3 className="text-2xl font-semibold mb-3 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">chromie editor</h3>
        <p className="text-slate-400 mb-6 leading-relaxed">select a file from the project tree to start coding with full ide features</p>
        <div className="flex items-center justify-center space-x-6 text-sm text-slate-500">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse"></div>
            <span className="font-medium">intellisense</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse"></div>
            <span className="font-medium">syntax highlighting</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse"></div>
            <span className="font-medium">auto-complete</span>
          </div>
        </div>
      </div>
    </div>
  )
} 