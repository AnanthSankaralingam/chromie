"use client"

import { useEffect, useRef } from 'react'
import Prism from 'prismjs'

// Import core Prism CSS
import 'prismjs/themes/prism-tomorrow.css'

// Import language definitions
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-scss'
import 'prismjs/components/prism-sass'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-yaml'

// Import plugins for enhanced features
import 'prismjs/plugins/line-numbers/prism-line-numbers.css'
import 'prismjs/plugins/line-numbers/prism-line-numbers'

export default function CodeViewer({ code, fileName, className = "" }) {
  const codeRef = useRef(null)

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
      'html': 'markup',
      'htm': 'markup',
      'xml': 'markup',
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

  useEffect(() => {
    if (codeRef.current) {
      // Highlight the code
      Prism.highlightElement(codeRef.current)
    }
  }, [code, language])

  return (
    <div className={`relative ${className}`}>
      <pre className="line-numbers !bg-slate-900/50 !border !border-slate-700/50 !rounded-lg !p-4 !m-0 overflow-auto custom-scrollbar">
        <code 
          ref={codeRef}
          className={`language-${language} !bg-transparent !text-sm`}
        >
          {code}
        </code>
      </pre>
      
      {/* Language indicator */}
      <div className="absolute top-3 right-3 bg-slate-800/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-slate-300 border border-slate-600/50">
        {language}
      </div>
      
      <style jsx global>{`
        /* Custom Prism theme adjustments for dark mode */
        .token.comment,
        .token.prolog,
        .token.doctype,
        .token.cdata {
          color: #6b7280 !important;
        }
        
        .token.punctuation {
          color: #d1d5db !important;
        }
        
        .token.property,
        .token.tag,
        .token.boolean,
        .token.number,
        .token.constant,
        .token.symbol,
        .token.deleted {
          color: #f87171 !important;
        }
        
        .token.selector,
        .token.attr-name,
        .token.string,
        .token.char,
        .token.builtin,
        .token.inserted {
          color: #34d399 !important;
        }
        
        .token.operator,
        .token.entity,
        .token.url,
        .language-css .token.string,
        .style .token.string {
          color: #60a5fa !important;
        }
        
        .token.atrule,
        .token.attr-value,
        .token.keyword {
          color: #a78bfa !important;
        }
        
        .token.function,
        .token.class-name {
          color: #fbbf24 !important;
        }
        
        .token.regex,
        .token.important,
        .token.variable {
          color: #fb7185 !important;
        }
        
        /* Line numbers styling */
        .line-numbers .line-numbers-rows {
          border-right: 1px solid #374151 !important;
          background: #1f2937 !important;
        }
        
        .line-numbers-rows > span:before {
          color: #6b7280 !important;
        }
        
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
