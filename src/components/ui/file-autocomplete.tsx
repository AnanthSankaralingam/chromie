"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { FileCode } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileAutocompleteProps {
  files: Array<{ file_path: string }>
  filter: string
  isVisible: boolean
  position?: { top: number; left: number } | null
  onFileSelect: (file: { path: string; name: string }) => void
  onClose: () => void
}

export function FileAutocomplete({
  files,
  filter,
  isVisible,
  position,
  onFileSelect,
  onClose,
}: FileAutocompleteProps) {
  const [filteredFiles, setFilteredFiles] = useState<Array<{ path: string; name: string; directory: string }>>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Filter files based on input
  useEffect(() => {
    if (!isVisible) {
      setFilteredFiles([])
      return
    }

    // If no filter yet, show all files (limited)
    const filterLower = filter ? filter.toLowerCase() : ''
    const matches = files
      .map((file) => {
        const path = file.file_path
        const parts = path.split('/')
        const name = parts[parts.length - 1]
        const directory = parts.slice(0, -1).join('/') || '/'

        // If no filter, include all files
        if (!filter) {
          return { path, name, directory }
        }

        // Fuzzy match: check if filter characters appear in order in filename or path
        const nameMatch = name.toLowerCase().includes(filterLower)
        const pathMatch = path.toLowerCase().includes(filterLower)

        if (nameMatch || pathMatch) {
          return { path, name, directory }
        }
        return null
      })
      .filter((item): item is { path: string; name: string; directory: string } => item !== null)
      .slice(0, 8) // Limit to 8 results

    setFilteredFiles(matches)
    setSelectedIndex(0)
  }, [files, filter, isVisible])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isVisible || filteredFiles.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev < filteredFiles.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredFiles.length - 1))
          break
        case 'Enter':
        case 'Tab':
          if (selectedIndex >= 0 && selectedIndex < filteredFiles.length) {
            e.preventDefault()
            const file = filteredFiles[selectedIndex]
            onFileSelect({ path: file.path, name: file.name })
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [isVisible, filteredFiles, selectedIndex, onFileSelect, onClose]
  )

  // Attach keyboard listener
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, isVisible])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedIndex])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVisible, onClose])

  if (!isVisible || filteredFiles.length === 0) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full z-50 mb-2 w-80 bg-slate-800/95 backdrop-blur-lg border border-slate-600/50 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
      style={position ? { left: `${position.left}px` } : {}}
    >
      {/* Tab hint header */}
      <div className="sticky top-0 px-3 py-1.5 bg-slate-800 border-b border-slate-600/30 flex items-center justify-between">
        <span className="text-xs text-slate-400">Select file</span>
        <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">Tab</span>
      </div>

      {/* File list */}
      <div className="py-1">
        {filteredFiles.map((file, index) => (
          <div
            key={file.path}
            ref={(el) => {
              itemRefs.current[index] = el
            }}
            className={cn(
              "px-3 py-1.5 cursor-pointer transition-all",
              "hover:bg-slate-700/50",
              selectedIndex === index && "bg-purple-600/20 border-l-2 border-purple-500"
            )}
            onClick={() => onFileSelect({ path: file.path, name: file.name })}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="flex items-center gap-2">
              <FileCode className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">{file.name}</div>
                {file.directory !== '/' && (
                  <div className="text-[10px] text-slate-500 truncate">{file.directory}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
