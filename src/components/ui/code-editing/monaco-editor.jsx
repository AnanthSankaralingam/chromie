"use client"

import { useEffect, useRef, useState } from 'react'
import { Editor } from '@monaco-editor/react'
import { Save, Edit3, Settings, Code2, Eye, Code, PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ArtifactClose } from '@/components/ui/artifact/artifact'
import { formatJsonFile, isJsonFile } from '@/lib/utils/client-json-formatter'
import HtmlPreviewInfoModal from '@/components/ui/modals/html-preview-info-modal'
import { loadIcons } from '@/lib/utils/icon-loader'

export default function MonacoEditor({ 
  code, 
  fileName, 
  className = "", 
  onSave,
  onClose,
  isFileTreeCollapsed,
  onToggleFileTree,
  readOnly = false,
  filePath,
  projectFiles = [],
  onHtmlPreviewToggle,
}) {
  const editorRef = useRef(null)
  const [content, setContent] = useState(code)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isHtmlPreview, setIsHtmlPreview] = useState(false)
  const [isPreviewInfoOpen, setIsPreviewInfoOpen] = useState(false)
  const [hideActionButtonsUntilSave, setHideActionButtonsUntilSave] = useState(false)
  const [localIcons, setLocalIcons] = useState(new Map()) // Map<path, dataUrl>

  // Update content when code prop changes
  useEffect(() => {
    setContent(code)
    setHasChanges(false)
    setHideActionButtonsUntilSave(false)
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
      setHideActionButtonsUntilSave(false)
    } catch (error) {
      console.error('Error saving file:', error)
    } finally {
      setIsSaving(false)
    }
  }


  // Extract icon paths from HTML content
  const extractIconPaths = (html) => {
    const iconPaths = new Set()
    try {
      // Match chrome.runtime.getURL('icons/xxx.png')
      const runtimeRegex = /chrome\.runtime\.getURL\(["'](icons\/[A-Za-z0-9-_]+\.png)["']\)/gi
      let match
      while ((match = runtimeRegex.exec(html)) !== null) {
        iconPaths.add(match[1])
      }
      
      // Match src/href attributes with icons/*.png
      const attrRegex = /(src|href)=["']([^"']*icons\/[A-Za-z0-9-_]+\.png)["']/gi
      while ((match = attrRegex.exec(html)) !== null) {
        const path = match[2]
        // Normalize: remove leading slash if present, ensure icons/ prefix
        const normalized = path.startsWith('/') ? path.slice(1) : path
        const iconPath = normalized.startsWith('icons/') ? normalized : `icons/${normalized.split('/').pop()}`
        iconPaths.add(iconPath)
      }
    } catch (e) {
      console.error('[MonacoEditor] Error extracting icon paths:', e)
    }
    return Array.from(iconPaths)
  }

  // Load icons from local icons directory when HTML preview is enabled
  useEffect(() => {
    if (language === 'html' && isHtmlPreview && content) {
      const iconPaths = extractIconPaths(content)
      if (iconPaths.length > 0) {
        // Only load icons we don't already have
        const missingPaths = iconPaths.filter(p => !localIcons.has(p))
        if (missingPaths.length > 0) {
          loadIcons(missingPaths).then(loadedIcons => {
            setLocalIcons(prev => {
              const merged = new Map(prev)
              for (const [path, dataUrl] of loadedIcons) {
                merged.set(path, dataUrl)
              }
              return merged
            })
          })
        }
      }
    }
  }, [content, isHtmlPreview, language])

  const handleToggleHtmlPreview = () => {
    if (!(language === 'html')) return
    const next = !isHtmlPreview
    setIsHtmlPreview(next)
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
    try {
      onHtmlPreviewToggle?.(next)
    } catch (e) {
      console.warn('[MonacoEditor] onHtmlPreviewToggle error', e)
    }
  }

  const buildHtmlSrcDoc = (raw) => {
    // Build a map of icon path -> data URL for preview rendering
    // Priority: 1) local icons directory, 2) projectFiles (for security)
    // Icons follow the pattern: icons/icon_name.png
    const buildIconDataUrlMap = () => {
      const map = new Map()
      
      // First, add icons from local icons directory (from /icons/ folder)
      for (const [path, dataUrl] of localIcons) {
        map.set(path, dataUrl)
      }
      
      // Then, add icons from projectFiles as fallback (if they exist locally)
      try {
        const iconFiles = (projectFiles || []).filter(f => {
          if (typeof f?.file_path !== 'string') return false
          // Match icons/icon_name.png pattern
          if (!f.file_path.startsWith('icons/')) return false
          if (!/\.png$/i.test(f.file_path)) return false
          return true
        })
        
        for (const f of iconFiles) {
          // Only add if not already in map (local icons take priority)
          if (!map.has(f.file_path)) {
            const base64 = typeof f.content === 'string' ? f.content : ''
            if (!base64) continue
            const dataUrl = `data:image/png;base64,${base64}`
            map.set(f.file_path, dataUrl)
          }
        }
      } catch (e) {
      }
      
     
      
      return map
    }

    // Replace icon references (paths and chrome.runtime.getURL) with data URLs
    // Handles patterns like: icons/icon_name.png
    const rewriteIconUrls = (html, iconMap) => {
      try {
        let replacedCount = 0
        
        // Replace chrome.runtime.getURL('icons/icon_name.png') - supports single and double quotes
        html = html.replace(/chrome\.runtime\.getURL\(["'](icons\/[A-Za-z0-9-_]+\.png)["']\)/gi, (m, p1) => {
          const url = iconMap.get(p1)
          if (url) {
            replacedCount++
            return `'${url}'`
          } else {
            console.warn('[MonacoEditor] Icon not found in map:', p1, 'Available:', Array.from(iconMap.keys()))
          }
          return m
        })

        // Replace src/href attributes pointing to icons/*.png
        // Handles both relative paths and paths with leading slash
        html = html.replace(/(src|href)=(["'])([^"']*icons\/[A-Za-z0-9-_]+\.png)\2/gi, (m, attr, quote, path) => {
          // Normalize path: remove leading slash if present
          const normalized = path.startsWith('/') ? path.slice(1) : path
          // Ensure it starts with icons/
          const iconPath = normalized.startsWith('icons/') ? normalized : `icons/${normalized.split('/').pop()}`
          const url = iconMap.get(iconPath)
          if (url) {
            replacedCount++
            return `${attr}=${quote}${url}${quote}`
          } else {
            console.warn('[MonacoEditor] Icon not found in map:', iconPath, 'Original:', path, 'Available:', Array.from(iconMap.keys()))
          }
          return m
        })
        
      } catch (e) {
        console.error('[MonacoEditor] Error rewriting icon URLs:', e)
      }
      return html
    }

    // Inline linked styles and also inject styles.css if present
    const getStylesCss = () => {
      try {
        const styles = (projectFiles || []).find(f => f.file_path === 'styles.css')
        if (styles && typeof styles.content === 'string') return styles.content
      } catch (e) {}
      return ''
    }

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
        let withInlined = html.replace(linkRegex, (match, href) => {
          const resolved = resolvePath(href)
          const file = projectFiles.find(f => f.file_path === resolved)
          if (file && typeof file.content === 'string') {
            return `<style>${file.content}</style>`
          }
          return match
        })
        // Also inject styles.css if available and not already present
        const stylesCss = getStylesCss()
        if (stylesCss) {
          if (/<head[^>]*>/i.test(withInlined)) {
            withInlined = withInlined.replace(/<head([^>]*)>/i, (m, attrs) => `<head${attrs}>\n<style>${stylesCss}</style>`)
          } else {
            withInlined = `<style>${stylesCss}</style>` + withInlined
          }
        }
        return withInlined
      } catch (e) {
        return html
      }
    }
    const hasFullHtml = /<html[\s>]/i.test(raw) || /<body[\s>]/i.test(raw)
    const iconMap = buildIconDataUrlMap()
    if (hasFullHtml) {
      const doc = `<!doctype html>` + raw
      const withStyles = inlineLinkedStyles(doc)
      return rewriteIconUrls(withStyles, iconMap)
    }
    const scaffold = `<!doctype html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root { color-scheme: light dark; }
      html, body { height: 100%; }
      body { margin: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; line-height: 1.5; }
      img, video, canvas, svg { max-width: 100%; height: auto; }
      * { box-sizing: border-box; }
    </style>
    </head><body>
      <div id="app">${raw}</div>
    </body></html>`
    const withStyles = inlineLinkedStyles(scaffold)
    return rewriteIconUrls(withStyles, iconMap)
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
      setHideActionButtonsUntilSave(true)
      
      // Focus the editor after formatting
      if (editorRef.current) {
        editorRef.current.focus()
      }
    } catch (error) {
      console.error('Error formatting JSON:', error.message)
      // You could add a toast notification here to show the error to the user
    }
  }

  const handleBumpManifestVersion = () => {
    const isManifest = (fileName || '').toLowerCase() === 'manifest.json'
    if (!isManifest) return
    try {
      const parsed = JSON.parse(content || '{}')
      const current = parsed?.version
      const numeric = typeof current === 'number' ? current : parseFloat(String(current))
      if (isNaN(numeric)) {
        console.warn('[MonacoEditor] Could not parse manifest version:', current)
        return
      }
      const bumped = Number((numeric + 0.1).toFixed(1))
      // Chrome manifest expects version as a string
      parsed.version = bumped.toFixed(1)
      const updated = JSON.stringify(parsed, null, 2)
      setContent(updated)
      setHasChanges(updated !== code)
      setHideActionButtonsUntilSave(true)
      if (editorRef.current) {
        editorRef.current.focus()
      }
    } catch (e) {
      console.error('[MonacoEditor] Failed to bump manifest version:', e)
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

  // Listen only to external selection to bring focus to Monaco
  useEffect(() => {
    if (typeof window === 'undefined') return
    const focusOnSelect = () => {
      try {
        if (editorRef.current) editorRef.current.focus()
      } catch (_) {}
    }
    window.addEventListener('editor:selectFile', focusOnSelect)
    window.addEventListener('editor:focusManifest', focusOnSelect)
    return () => {
      window.removeEventListener('editor:selectFile', focusOnSelect)
      window.removeEventListener('editor:focusManifest', focusOnSelect)
    }
  }, [])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <HtmlPreviewInfoModal 
        isOpen={isPreviewInfoOpen} 
        onClose={() => setIsPreviewInfoOpen(false)} 
      />
      {/* Editor Header */}
      {!readOnly && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            {onToggleFileTree && (
              <Button
                onClick={onToggleFileTree}
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                title={isFileTreeCollapsed ? 'Show file tree' : 'Hide file tree'}
              >
                {isFileTreeCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            )}
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
            {isJsonFile(fileName) && !hideActionButtonsUntilSave && (
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
            {(fileName || '').toLowerCase() === 'manifest.json' && !hideActionButtonsUntilSave && (
              <Button
                onClick={handleBumpManifestVersion}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-xs px-3 py-1"
                title="Increase manifest version by 0.1"
              >
                + Version
              </Button>
            )}
            {language === 'html' && (
              <Button
                id="tour-see-html-button"
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
            {onClose && (
              <ArtifactClose onClick={onClose} />
            )}
          </div>
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        {language === 'html' && isHtmlPreview ? (
          <div className="h-full w-full bg-slate-900 flex items-center justify-center">
            <iframe
              title="HTML Preview"
              className="bg-white w-full h-full border-0"
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
