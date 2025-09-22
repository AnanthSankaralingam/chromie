"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Command, ArrowRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { searchSuggestions } from "@/lib/extension-suggestions"

const TabCompleteSuggestions = ({ 
  query, 
  onSuggestionSelect, 
  isVisible, 
  onVisibilityChange,
  inputRef 
}) => {
  const [suggestions, setSuggestions] = useState([])
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const previewRef = useRef(null)

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId
      return (searchQuery) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          if (searchQuery && searchQuery.length >= 2) {
            setIsLoading(true)
            const results = searchSuggestions(searchQuery, 3) // Limit to 3 for cleaner UI
            setSuggestions(results)
            setCurrentSuggestionIndex(0)
            setShowPreview(results.length > 0)
            setIsLoading(false)
            console.log('🔍 Tab complete suggestions:', results.length, 'for query:', searchQuery)
          } else {
            setSuggestions([])
            setCurrentSuggestionIndex(0)
            setShowPreview(false)
          }
        }, 100) // Faster response for tab complete
      }
    })(),
    []
  )

  // Update suggestions when query changes
  useEffect(() => {
    if (isVisible) {
      debouncedSearch(query)
    } else {
      setSuggestions([])
      setCurrentSuggestionIndex(0)
      setShowPreview(false)
    }
  }, [query, isVisible, debouncedSearch])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isVisible || suggestions.length === 0) return

    switch (e.key) {
      case 'Tab':
        e.preventDefault()
        if (suggestions.length > 0) {
          const currentSuggestion = suggestions[currentSuggestionIndex]
          onSuggestionSelect(currentSuggestion.description)
          onVisibilityChange(false)
          console.log('⭐ Tab completed:', currentSuggestion.title)
        }
        break
      case 'ArrowRight':
        if (showPreview) {
          e.preventDefault()
          setCurrentSuggestionIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          )
        }
        break
      case 'ArrowLeft':
        if (showPreview) {
          e.preventDefault()
          setCurrentSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          )
        }
        break
      case 'Enter':
        if (showPreview && suggestions.length > 0) {
          e.preventDefault()
          const currentSuggestion = suggestions[currentSuggestionIndex]
          onSuggestionSelect(currentSuggestion.description)
          onVisibilityChange(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        onVisibilityChange(false)
        setShowPreview(false)
        break
    }
  }, [isVisible, suggestions, currentSuggestionIndex, showPreview, onSuggestionSelect, onVisibilityChange])

  // Attach keyboard listener to input
  useEffect(() => {
    const inputElement = inputRef?.current
    if (inputElement) {
      inputElement.addEventListener('keydown', handleKeyDown)
      return () => inputElement.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, inputRef])

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        previewRef.current && 
        !previewRef.current.contains(event.target) &&
        inputRef?.current &&
        !inputRef.current.contains(event.target)
      ) {
        onVisibilityChange(false)
        setShowPreview(false)
      }
    }

    if (isVisible && showPreview) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVisible, showPreview, onVisibilityChange, inputRef])

  const handleSuggestionClick = (suggestion) => {
    console.log('✨ Clicked suggestion:', suggestion.title)
    onSuggestionSelect(suggestion.description)
    onVisibilityChange(false)
    setShowPreview(false)
  }

  const getCategoryColor = (category) => {
    const colors = {
      'Productivity': 'text-blue-400',
      'Security': 'text-red-400', 
      'Design': 'text-purple-400',
      'Development': 'text-green-400',
      'Shopping': 'text-yellow-400',
      'Social Media': 'text-pink-400',
      'Entertainment': 'text-orange-400',
      'Utility': 'text-gray-400',
      'Privacy': 'text-indigo-400',
      'News': 'text-cyan-400',
      'Finance': 'text-emerald-400',
      'Education': 'text-teal-400',
      'Business': 'text-violet-400',
      'Health': 'text-rose-400',
      'Accessibility': 'text-lime-400',
      'Media': 'text-amber-400',
      'Writing': 'text-sky-400'
    }
    return colors[category] || 'text-gray-400'
  }

  if (!isVisible || !showPreview || suggestions.length === 0) return null

  const currentSuggestion = suggestions[currentSuggestionIndex]

  return (
    <>
      {/* Inline completion hint */}
      {currentSuggestion && (
        <div className="absolute top-full left-0 right-0 z-40 mt-1">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800/90 backdrop-blur-sm border border-slate-600/30 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Command className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-white truncate">
                    {currentSuggestion.title}
                  </span>
                  <span className={cn("text-xs font-medium", getCategoryColor(currentSuggestion.category))}>
                    {currentSuggestion.category}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              {suggestions.length > 1 && (
                <div className="flex items-center space-x-1 text-xs text-slate-400">
                  <span>{currentSuggestionIndex + 1}/{suggestions.length}</span>
                  <div className="flex space-x-0.5">
                    <kbd className="px-1 py-0.5 text-xs bg-slate-700 rounded">←</kbd>
                    <kbd className="px-1 py-0.5 text-xs bg-slate-700 rounded">→</kbd>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-1 text-xs text-slate-400">
                <kbd className="px-1.5 py-0.5 text-xs bg-slate-700 rounded font-mono">Tab</kbd>
                <span>to complete</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded preview on hover/focus */}
      {currentSuggestion && (
        <div 
          ref={previewRef}
          className="absolute top-full left-0 right-0 z-50 mt-12 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 pointer-events-none hover:pointer-events-auto focus-within:pointer-events-auto"
        >
          <div className="bg-slate-800/95 backdrop-blur-lg border border-slate-600/50 rounded-xl shadow-2xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Preview</h3>
              </div>
              {suggestions.length > 1 && (
                <div className="flex space-x-1">
                  {suggestions.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        index === currentSuggestionIndex 
                          ? "bg-purple-400" 
                          : "bg-slate-600"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <div 
              className="cursor-pointer group"
              onClick={() => handleSuggestionClick(currentSuggestion)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">
                  {currentSuggestion.title}
                </h4>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentSuggestion.description}
              </p>
            </div>

            {/* Navigation hint */}
            {suggestions.length > 1 && (
              <div className="mt-3 pt-3 border-t border-slate-600/30">
                <p className="text-xs text-slate-500 flex items-center justify-center">
                  <span className="mr-2">💡</span>
                  Use ← → arrows to browse suggestions
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default TabCompleteSuggestions
