"use client"

import { useState, useEffect, useRef } from "react"
import { extensionSuggestions } from "@/lib/data/extension-suggestions"

const PersonaChipCarousel = ({
  onSuggestionSelect,
  isVisible = true,
  className = ""
}) => {
  const [selectedPersona, setSelectedPersona] = useState(null)
  const [personaSuggestions, setPersonaSuggestions] = useState([])
  const scrollContainerRef = useRef(null)
  const animationRef = useRef(null)

  // Extract unique personas from suggestions
  const personas = [...new Set(extensionSuggestions.map(s => s.persona))]
    .filter(p => p) // Remove any undefined/null
    .sort()

  // Auto-scroll animation
  useEffect(() => {
    if (!isVisible || selectedPersona) return

    const container = scrollContainerRef.current
    if (!container) return

    let scrollPosition = 0
    const scrollSpeed = 0.3 // pixels per frame - slow and readable

    const animate = () => {
      if (!container) return

      scrollPosition += scrollSpeed

      // Reset scroll when we've scrolled past the first set of chips
      if (scrollPosition >= container.scrollWidth / 2) {
        scrollPosition = 0
      }

      container.scrollLeft = scrollPosition
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isVisible, selectedPersona])

  const handlePersonaClick = (persona) => {
    // If clicking the same persona, close it
    if (selectedPersona === persona) {
      setSelectedPersona(null)
      setPersonaSuggestions([])
      return
    }

    // Get up to 3 suggestions for this persona
    const suggestions = extensionSuggestions
      .filter(s => s.persona === persona)
      .slice(0, 3)

    setSelectedPersona(persona)
    setPersonaSuggestions(suggestions)
  }

  const handleSuggestionClick = (suggestion) => {
    onSuggestionSelect?.(suggestion.description)
    setSelectedPersona(null)
    setPersonaSuggestions([])
  }

  if (!isVisible) return null

  return (
    <div className={`w-full ${className}`}>
      {/* Persona Chips Carousel */}
      <div className="relative overflow-hidden mb-4">
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-hidden whitespace-nowrap"
          style={{ scrollBehavior: selectedPersona ? 'smooth' : 'auto' }}
        >
          {/* Duplicate the personas array to create seamless loop */}
          {[...personas, ...personas].map((persona, index) => (
            <button
              key={`${persona}-${index}`}
              onClick={() => handlePersonaClick(persona)}
              className={`
                inline-flex items-center px-6 py-2.5 rounded-full text-sm font-medium
                transition-all duration-200 flex-shrink-0
                ${selectedPersona === persona
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white'
                }
              `}
            >
              {persona}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions List */}
      {selectedPersona && personaSuggestions.length > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-xs text-slate-400 mb-2 px-1">
            Suggestions for {selectedPersona}:
          </div>
          {personaSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="
                w-full text-left px-4 py-3 rounded-lg
                bg-slate-800/50 border border-slate-700
                hover:bg-slate-700/50 hover:border-purple-500/50
                transition-all duration-200
                group
              "
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-white mb-1 group-hover:text-purple-300 transition-colors">
                    {suggestion.title}
                  </div>
                  <div className="text-xs text-slate-400 line-clamp-2">
                    {suggestion.description}
                  </div>
                </div>
                <div className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-400 flex-shrink-0">
                  {suggestion.category}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default PersonaChipCarousel
