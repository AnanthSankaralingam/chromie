"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Command, ArrowRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { searchSuggestions } from "@/lib/data/extension-suggestions"

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
      case 'ArrowDown':
        if (showPreview) {
          e.preventDefault()
          setCurrentSuggestionIndex(prev =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          )
        }
        break
      case 'ArrowUp':
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

  return (
    <div
      ref={previewRef}
      className="absolute top-full left-0 right-0 z-50 mt-1"
    >
      <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-600/20 rounded-lg overflow-hidden">
        {/* Vertical list of suggestions */}
        <div className="max-h-[300px] overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={cn(
                "px-4 py-2.5 cursor-pointer transition-all duration-100 flex items-start justify-between gap-3",
                index === currentSuggestionIndex
                  ? "bg-purple-500/15"
                  : "bg-transparent hover:bg-slate-700/20"
              )}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setCurrentSuggestionIndex(index)}
            >
              <p className={cn(
                "text-sm transition-colors flex-1 truncate",
                index === currentSuggestionIndex ? "text-white" : "text-slate-400"
              )}>
                {suggestion.description}
              </p>
              <span className={cn(
                "text-xs font-medium flex-shrink-0 transition-colors",
                getCategoryColor(suggestion.category),
                index === currentSuggestionIndex ? "opacity-100" : "opacity-60"
              )}>
                {suggestion.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TabCompleteSuggestions
