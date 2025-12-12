"use client"

import { useEffect, useRef, useState } from 'react'
import { Save, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CodeEditor({
  code,
  fileName,
  className = "",
  onSave,
  readOnly = false
}) {
  const textareaRef = useRef(null)
  const [content, setContent] = useState(code)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Update content when code prop changes
  useEffect(() => {
    setContent(code)
    setHasChanges(false)
  }, [code])

  // Function to detect language from file extension
  const getLanguageFromFileName = (fileName) => {
    if (!fileName) return 'text'

    const ext = fileName.split('.').pop()?.toLowerCase()

    const languageMap = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'json': 'json',
      'html': 'html',
      'htm': 'html',
      'xml': 'xml',
      'md': 'markdown',
      'markdown': 'markdown',
      'sh': 'bash',
      'bash': 'bash',
      'yml': 'yaml',
      'yaml': 'yaml',
      'txt': 'text'
    }

    return languageMap[ext] || 'text'
  }

  const language = getLanguageFromFileName(fileName)

  const handleContentChange = (e) => {
    const newContent = e.target.value
    setContent(newContent)
    setHasChanges(newContent !== code)
  }

  const handleSave = async () => {
    if (!onSave || !hasChanges) return

    setIsSaving(true)
    try {
      await onSave(content)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving file:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e) => {
    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const newContent = content.substring(0, start) + '  ' + content.substring(end)
      setContent(newContent)
      setHasChanges(newContent !== code)

      // Restore cursor position
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2
      }, 0)
    }

    // Handle Ctrl/Cmd + S for save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Header with save button */}
      {!readOnly && (
        <div className="flex items-center justify-between mb-3 p-3 bg-slate-800/50 rounded-t-lg border border-slate-700/50">
          <div className="flex items-center space-x-2">
            <Edit3 className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-slate-300">Editing: {fileName}</span>
            {hasChanges && (
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                Unsaved changes
              </span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}

      {/* Code editor textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          className="w-full h-full min-h-[400px] bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 text-sm font-mono text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all custom-scrollbar"
          style={{
            lineHeight: '1.5',
            tabSize: 2,
          }}
          spellCheck={false}
          placeholder={readOnly ? "Select a file to view its contents" : "Start typing your code..."}
        />

        {/* Language indicator */}
        <div className="absolute top-3 right-3 bg-slate-800/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-slate-300 border border-slate-600/50">
          {language}
        </div>
      </div>

      <style jsx global>{`
        /* Scrollbar styling */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  )
}
