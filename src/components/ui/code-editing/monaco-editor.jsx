"use client"

import { useEffect, useRef, useState } from 'react'
import { Editor } from '@monaco-editor/react'
import { Save, Edit3, Settings, Code2, Eye, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatJsonFile, isJsonFile } from '@/lib/utils/client-json-formatter'

export default function MonacoEditor({ 
  code, 
  fileName, 
  className = "", 
  onSave,
  readOnly = false,
  filePath,
  projectFiles = []
}) {
  const editorRef = useRef(null)
  const [content, setContent] = useState(code)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isHtmlPreview, setIsHtmlPreview] = useState(false)
  const [isPreviewInfoOpen, setIsPreviewInfoOpen] = useState(false)

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

  const handleToggleHtmlPreview = () => {
    if (!(language === 'html')) return
    const next = !isHtmlPreview
    setIsHtmlPreview(next)
    console.log('[MonacoEditor] HTML preview toggled', { fileName, preview: next })
    if (next) {
      try {
        const seen = typeof window !== 'undefined' && window.localStorage.getItem('html_preview_info_seen') === '1'
        if (!seen) {
          setIsPreviewInfoOpen(true)
          window.localStorage.setItem('html_preview_info_seen', '1')
        }
      } catch (e) {
        // non-blocking
      }
    }
  }

  const buildHtmlSrcDoc = (raw) => {
    const inlineLinkedStyles = (html) => {
      try {
        const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi
        const baseDir = (filePath || '').split('/').slice(0, -1).join('/')
        const resolvePath = (href) => {
          if (/^https?:\/\//i.test(href)) return href
          if (href.startsWith('/')) return href // leave absolute paths (may 404 in dev)
          const parts = [...(baseDir ? baseDir.split('/') : []), href]
          const stack = []
          for (const part of parts) {
            if (part === '' || part === '.') continue
            if (part === '..') stack.pop()
            else stack.push(part)
          }
          return stack.join('/')
        }
        return html.replace(linkRegex, (match, href) => {
          const resolved = resolvePath(href)
          const file = projectFiles.find(f => f.file_path === resolved)
          if (file && typeof file.content === 'string') {
            return `<style>${file.content}</style>`
          }
          return match
        })
      } catch (e) {
        return html
      }
    }
    const hasFullHtml = /<html[\s>]/i.test(raw) || /<body[\s>]/i.test(raw)
    if (hasFullHtml) {
      // Ensure a white background similar to extension rendering
      // If user's HTML already sets background, their CSS may override this.
      const withBg = `<!doctype html>` + raw.replace(
        /<head(.*?)>/i,
        (m) => `${m}\n<style>html, body { background: #ffffff !important; }</style>`
      )
      return inlineLinkedStyles(withBg)
    }
    const scaffold = `<!doctype html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root { color-scheme: light dark; }
      html, body { height: 100%; background: #ffffff !important; }
      body { margin: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; line-height: 1.5; }
      img, video, canvas, svg { max-width: 100%; height: auto; }
      * { box-sizing: border-box; }
    </style>
    </head><body>
      <div id="app">${raw}</div>
    </body></html>`
    return inlineLinkedStyles(scaffold)
  }

  const handleFormat = () => {
    if (!isJsonFile(fileName)) {
      console.warn('Format button only works with JSON files')
      return
    }

    try {
      const formattedContent = formatJsonFile(fileName, content)
      setContent(formattedContent)
      setHasChanges(formattedContent !== code)
      
      // Focus the editor after formatting
      if (editorRef.current) {
        editorRef.current.focus()
      }
    } catch (error) {
      console.error('Error formatting JSON:', error.message)
      // You could add a toast notification here to show the error to the user
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

    // Add format shortcut (Ctrl/Cmd + Shift + F)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      if (isJsonFile(fileName)) {
        handleFormat()
      }
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
      <Dialog open={isPreviewInfoOpen} onOpenChange={setIsPreviewInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>HTML Preview (Beta)</DialogTitle>
            <DialogDescription>
              This is a visual-only preview of your HTML. Interactivity, scripts, and extension APIs will not function here.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 text-sm text-slate-400">
            For full functionality, try the simulated browser or install and test the generated extension in your browser.
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setIsPreviewInfoOpen(false)} className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-1">Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
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
            {isJsonFile(fileName) && (
              <Button
                onClick={handleFormat}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1"
                title="Format JSON"
              >
                <Code2 className="h-3 w-3 mr-1" />
                Format
              </Button>
            )}
            {language === 'html' && (
              <Button
                onClick={handleToggleHtmlPreview}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-xs px-3 py-1"
                title={isHtmlPreview ? 'Back to Code' : 'See HTML'}
              >
                {isHtmlPreview ? <Code className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                {isHtmlPreview ? 'Code' : (
                  <span className="inline-flex items-center space-x-1">
                    <span>See</span>
                    <span className="uppercase text-[9px] leading-none px-1 py-[2px] rounded bg-teal-800 text-teal-200 border border-teal-700">beta</span>
                  </span>
                )}
              </Button>
            )}
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
        {language === 'html' && isHtmlPreview ? (
          <div className="h-full w-full">
            <iframe
              title="HTML Preview"
              className="w-full h-full bg-white"
              sandbox="allow-same-origin allow-forms allow-scripts allow-pointer-lock allow-popups"
              srcDoc={buildHtmlSrcDoc(content)}
            />
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
