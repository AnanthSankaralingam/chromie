"use client"

import { useState, useEffect, useRef } from "react"
import { extensionSuggestions } from "@/lib/extension-suggestions"

const TypingSuggestions = ({ 
  className = "",
  typingSpeed = 50,
  pauseDuration = 3000,
  eraseSpeed = 50,
  erasePause = 1500,
  isActive = true
}) => {
  const [currentSuggestion, setCurrentSuggestion] = useState("")
  const [isTyping, setIsTyping] = useState(true)
  const [isErasing, setIsErasing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const timeoutRef = useRef(null)
  const intervalRef = useRef(null)

  // Get a curated list of inspiring suggestions from the extension suggestions
  const suggestions = [
    "a to-do list manager that helps you stay organized",
    "a password generator for secure online accounts", 
    "a color picker tool for designers and developers",
    "a price tracker for online shopping deals",
    "a dark mode extension for any website",
    "a screenshot tool with editing capabilities",
    "a news aggregator from multiple sources",
    "a time tracking tool for productivity",
    "a weather widget with location updates",
    "a grammar checker for better writing",
    "a bookmark organizer with smart tags",
    "a social media scheduler for content creators",
    "a expense tracker for personal finance",
    "a reading mode enhancer for articles",
    "a Pomodoro timer for better focus",
    "a translation tool for any webpage",
    "a flashcard study tool for students",
    "a custom ad blocker with filters"
  ]

  const typeText = (text, speed, onComplete) => {
    let index = 0
    console.log('⌨️ Starting type animation:', { text, speed })
    intervalRef.current = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index))
        index++
      } else {
        clearInterval(intervalRef.current)
        console.log('✅ Type animation completed')
        onComplete?.()
      }
    }, speed)
  }

  const eraseText = (textToErase, speed, onComplete) => {
    // Now we pass the text to erase as a parameter
    let index = textToErase.length
    console.log('🗑️ Starting erase animation:', { textToErase, speed, currentLength: textToErase.length })
    
    intervalRef.current = setInterval(() => {
      if (index >= 0) {
        setDisplayText(textToErase.slice(0, index))
        index--
      } else {
        clearInterval(intervalRef.current)
        console.log('✅ Erase animation completed')
        onComplete?.()
      }
    }, speed)
  }

  const stopAnimation = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsTyping(false)
    setIsErasing(false)
  }

  const cycleSuggestions = () => {
    if (!isActive) return

    const nextIndex = (currentIndex + 1) % suggestions.length
    const nextSuggestion = suggestions[nextIndex]
    setCurrentIndex(nextIndex)
    setCurrentSuggestion(nextSuggestion)
    
    // Start typing the new suggestion
    setIsErasing(false)
    setIsTyping(true)
    typeText(nextSuggestion, typingSpeed, () => {
      setIsTyping(false)
      
      // Wait before starting to erase
      timeoutRef.current = setTimeout(() => {
        if (!isActive) return
        console.log('🔄 Starting erase phase for:', nextSuggestion)
        setIsErasing(true)
        
        // Pass the full suggestion text to eraseText
        eraseText(nextSuggestion, eraseSpeed, () => {
          setIsErasing(false)
          console.log('🔄 Erase phase completed, waiting before next cycle')
          // Wait before starting next cycle
          if (isActive) {
            timeoutRef.current = setTimeout(cycleSuggestions, erasePause)
          }
        })
      }, pauseDuration)
    })
  }

  // Initialize the typing effect
  useEffect(() => {
    if (!isActive) {
      stopAnimation()
      return
    }

    if (suggestions.length > 0) {
      const firstSuggestion = suggestions[0]
      setCurrentSuggestion(firstSuggestion)
      typeText(firstSuggestion, typingSpeed, () => {
        setIsTyping(false)
        // Start the cycle after initial typing
        timeoutRef.current = setTimeout(() => {
          if (!isActive) return
          console.log('🔄 Starting initial erase phase for:', firstSuggestion)
          setIsErasing(true)
          
          // Pass the full suggestion text to eraseText
          eraseText(firstSuggestion, eraseSpeed, () => {
            setIsErasing(false)
            console.log('🔄 Initial erase phase completed, starting cycle')
            if (isActive) {
              timeoutRef.current = setTimeout(cycleSuggestions, erasePause)
            }
          })
        }, pauseDuration)
      })
    }

    return () => {
      stopAnimation()
    }
  }, [isActive])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation()
    }
  }, [])

  return (
    <div className={`relative ${className}`}>
      <span className={`text-slate-500 transition-all duration-200 ${
        isErasing ? 'text-slate-400' : 'text-slate-500'
      }`}>
        {displayText}
      </span>
      <span 
        className={`inline-block w-0.5 h-5 ml-1 transition-all duration-200 ${
          isTyping ? 'bg-purple-400' : isErasing ? 'bg-red-400' : 'bg-purple-400'
        } ${
          (isTyping || isErasing) && isActive ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          animation: (isTyping || isErasing) && isActive ? 'blink 1s infinite' : 'none'
        }}
      />
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default TypingSuggestions