"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronRight, Lightbulb, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { searchSuggestions } from "@/lib/extension-suggestions"

const AutocompleteSuggestions = ({ 
  query, 
  onSuggestionSelect, 
  isVisible, 
  onVisibilityChange,
  inputRef 
}) => {
  const [suggestions, setSuggestions] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef(null)
  const suggestionRefs = useRef([])

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId
      return (searchQuery) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          if (searchQuery && searchQuery.length >= 2) {
            setIsLoading(true)
            const results = searchSuggestions(searchQuery, 6)
            setSuggestions(results)
            setSelectedIndex(-1)
            setIsLoading(false)
            console.log('🔍 Found suggestions:', results.length, 'for query:', searchQuery)
          } else {
            setSuggestions([])
            setSelectedIndex(-1)
          }
        }, 150) // 150ms debounce
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
      setSelectedIndex(-1)
    }
  }, [query, isVisible, debouncedSearch])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isVisible || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault()
          handleSuggestionClick(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onVisibilityChange(false)
        setSelectedIndex(-1)
        break
    }
  }, [isVisible, suggestions, selectedIndex, onVisibilityChange])

  // Attach keyboard listener to input
  useEffect(() => {
    const inputElement = inputRef?.current
    if (inputElement) {
      inputElement.addEventListener('keydown', handleKeyDown)
      return () => inputElement.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, inputRef])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [selectedIndex])

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        inputRef?.current &&
        !inputRef.current.contains(event.target)
      ) {
        onVisibilityChange(false)
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVisible, onVisibilityChange, inputRef])

  const handleSuggestionClick = (suggestion) => {
    console.log('✨ Selected suggestion:', suggestion.title)
    onSuggestionSelect(suggestion.description)
    onVisibilityChange(false)
    setSelectedIndex(-1)
  }

  const getCategoryColor = (category) => {
    const colors = {
      'Productivity': 'text-blue-400 bg-blue-400/10',
      'Security': 'text-red-400 bg-red-400/10', 
      'Design': 'text-purple-400 bg-purple-400/10',
      'Development': 'text-green-400 bg-green-400/10',
      'Shopping': 'text-yellow-400 bg-yellow-400/10',
      'Social Media': 'text-pink-400 bg-pink-400/10',
      'Entertainment': 'text-orange-400 bg-orange-400/10',
      'Utility': 'text-gray-400 bg-gray-400/10',
      'Privacy': 'text-indigo-400 bg-indigo-400/10',
      'News': 'text-cyan-400 bg-cyan-400/10',
      'Finance': 'text-emerald-400 bg-emerald-400/10',
      'Education': 'text-teal-400 bg-teal-400/10',
      'Business': 'text-violet-400 bg-violet-400/10',
      'Health': 'text-rose-400 bg-rose-400/10',
      'Accessibility': 'text-lime-400 bg-lime-400/10',
      'Media': 'text-amber-400 bg-amber-400/10',
      'Writing': 'text-sky-400 bg-sky-400/10'
    }
    return colors[category] || 'text-gray-400 bg-gray-400/10'
  }

  if (!isVisible) return null

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 z-50 mt-2 bg-slate-800/95 backdrop-blur-lg border border-slate-600/50 rounded-xl shadow-2xl max-h-96 overflow-y-auto animate-in slide-in-from-top-2 duration-200"
    >
      {isLoading ? (
        <div className="p-4 flex items-center justify-center text-slate-400">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent mr-2" />
          Searching suggestions...
        </div>
      ) : suggestions.length > 0 ? (
        <>
          <div className="p-3 border-b border-slate-600/30">
            <div className="flex items-center text-xs text-slate-400 font-medium">
              <Search className="h-3 w-3 mr-1.5" />
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found
            </div>
          </div>
          <div className="py-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                ref={el => suggestionRefs.current[index] = el}
                className={cn(
                  "px-4 py-3 cursor-pointer transition-all duration-150 border-l-2 border-transparent",
                  "hover:bg-slate-700/50 hover:border-purple-500/50",
                  selectedIndex === index && "bg-slate-700/70 border-purple-500"
                )}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-1">
                      <Lightbulb className="h-3.5 w-3.5 text-yellow-400 mr-2 flex-shrink-0" />
                      <h4 className="text-sm font-medium text-white truncate">
                        {suggestion.title}
                      </h4>
                      <span className={cn(
                        "ml-2 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0",
                        getCategoryColor(suggestion.category)
                      )}>
                        {suggestion.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {suggestion.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 ml-2 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : query && query.length >= 2 ? (
        <div className="p-4 text-center text-slate-400">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No suggestions found for "{query}"</p>
          <p className="text-xs mt-1 opacity-75">Try a different keyword or describe what you want to build</p>
        </div>
      ) : null}
      
      {/* Footer with tip */}
      {suggestions.length > 0 && (
        <div className="p-3 border-t border-slate-600/30 bg-slate-900/50">
          <p className="text-xs text-slate-500 flex items-center">
            <span className="mr-2">💡</span>
            Use ↑↓ arrows to navigate, Enter to select, Esc to close
          </p>
        </div>
      )}
    </div>
  )
}

export default AutocompleteSuggestions
