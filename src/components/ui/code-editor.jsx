"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Save } from "lucide-react"

export default function CodeEditor({ file, onSave }) {
  const [content, setContent] = useState(file?.content || "")
  const [isModified, setIsModified] = useState(false)

  const handleContentChange = (e) => {
    setContent(e.target.value)
    setIsModified(e.target.value !== file?.content)
  }

  const handleSave = () => {
    // TODO: Implement save functionality with Supabase
    onSave?.(file.name, content)
    setIsModified(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    // TODO: Add toast notification
  }

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <File className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-slate-300">No File Selected</h3>
          <p className="text-slate-500">Select a file to view and edit its contents</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            {file.name}
          </Badge>
          {isModified && (
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
              Modified
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="text-slate-400 hover:text-white">
            <Copy className="h-4 w-4" />
          </Button>
          {isModified && (
            <Button variant="ghost" size="sm" onClick={handleSave} className="text-slate-400 hover:text-white">
              <Save className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-slate-900 rounded-lg overflow-hidden">
        <textarea
          value={content}
          onChange={handleContentChange}
          className="w-full h-full p-4 bg-transparent text-slate-300 font-mono text-sm resize-none outline-none"
          style={{ fontFamily: "Monaco, Menlo, Ubuntu Mono, monospace" }}
          placeholder="// Start coding..."
        />
      </div>
    </div>
  )
}
