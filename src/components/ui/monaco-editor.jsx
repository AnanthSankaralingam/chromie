"use client"

import { useEffect, useRef, useState } from 'react'
import { Editor } from '@monaco-editor/react'
import { Save, Edit3, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function MonacoEditor({ 
  code, 
  fileName, 
  className = "", 
  onSave,
  readOnly = false 
}) {
  const editorRef = useRef(null)
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
    if (!fileName) return 'plaintext'
    
    const ext = fileName.split('.').pop()?.toLowerCase()
    
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'html': 'html',
      'htm': 'html',
      'xml': 'xml',
      'md': 'markdown',
      'markdown': 'markdown',
      'sh': 'shell',
      'bash': 'shell',
      'yml': 'yaml',
      'yaml': 'yaml',
      'txt': 'plaintext',
      'py': 'python',
      'php': 'php',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'sql': 'sql'
    }
    
    return languageMap[ext] || 'plaintext'
  }

  const language = getLanguageFromFileName(fileName)

  const handleEditorChange = (value) => {
    setContent(value || '')
    setHasChanges((value || '') !== code)
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

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor

    // Use minimalistic dark theme
    // Available themes: 'vs', 'vs-dark', 'hc-black', 'hc-light'

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace",
      fontLigatures: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3,
      renderWhitespace: 'selection',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: true,
      smoothScrolling: true,
      contextmenu: true,
      mouseWheelZoom: true,
      multiCursorModifier: 'ctrlCmd',
      formatOnPaste: true,
      formatOnType: true,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      wordBasedSuggestions: true,
      parameterHints: { enabled: true },
      quickSuggestions: true,
      hover: { enabled: true },
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        bracketPairsHorizontal: true,
        highlightActiveBracketPair: true,
        indentation: true
      }
    })

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave()
    })

    // Set minimalistic dark theme
    monaco.editor.setTheme('vs-dark')

    // Configure language-specific settings
    if (language === 'javascript' || language === 'typescript') {
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types']
      })

      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types']
      })
    }
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Editor Header */}
      {!readOnly && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <Edit3 className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-slate-300 font-medium">{fileName || 'Untitled'}</span>
            {hasChanges && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-orange-300">Unsaved</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
              {language}
            </span>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-xs px-3 py-1"
            >
              <Save className="h-3 w-3 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            readOnly: readOnly,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: true },
            fontSize: 14,
            lineHeight: 20,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace",
            fontLigatures: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            renderWhitespace: 'selection',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: true,
            smoothScrolling: true,
            contextmenu: true,
            mouseWheelZoom: true,
            multiCursorModifier: 'ctrlCmd',
            formatOnPaste: true,
            formatOnType: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: true,
            parameterHints: { enabled: true },
            quickSuggestions: true,
            hover: { enabled: true },
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              bracketPairsHorizontal: true,
              highlightActiveBracketPair: true,
              indentation: true
            }
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-slate-900">
              <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
                <span className="text-sm text-slate-400">Loading editor...</span>
              </div>
            </div>
          }
        />
      </div>
    </div>
  )
}
