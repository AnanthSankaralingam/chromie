"use client"

import { useState, useEffect, useRef } from "react"
import { extensionSuggestions } from "@/lib/data/extension-suggestions"

const TypingSuggestions = ({
  className = "",
  typingSpeed = 50,
  pauseDuration = 8000,
  eraseSpeed = 50,
  erasePause = 8000,
  isActive = true
}) => {
  const [currentSuggestion, setCurrentSuggestion] = useState("")
  const [isTyping, setIsTyping] = useState(true)
  const [isErasing, setIsErasing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const timeoutRef = useRef(null)
  const intervalRef = useRef(null)
  const isMountedRef = useRef(false)
  const isActiveRef = useRef(isActive)

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
    // Clear any existing interval before starting a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    let index = 0
    intervalRef.current = setInterval(() => {
      if (!isMountedRef.current || !isActiveRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        return
      }
      if (index <= text.length) {
        setDisplayText(text.slice(0, index))
        index++
      } else {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        onComplete?.()
      }
    }, speed)
  }

  const eraseText = (textToErase, speed, onComplete) => {
    // Now we pass the text to erase as a parameter
    // Clear any existing interval before starting a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    let index = textToErase.length
    
    intervalRef.current = setInterval(() => {
      if (!isMountedRef.current || !isActiveRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        return
      }
      if (index >= 0) {
        setDisplayText(textToErase.slice(0, index))
        index--
      } else {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        onComplete?.()
      }
    }, speed)
  }

  const stopAnimation = () => {
    isActiveRef.current = false
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

    setCurrentIndex(prevIndex => {
      const nextIndex = (prevIndex + 1) % suggestions.length
      const nextSuggestion = suggestions[nextIndex]
      setCurrentSuggestion(nextSuggestion)
      
      // Start typing the new suggestion
      setIsErasing(false)
      setIsTyping(true)
      typeText(nextSuggestion, typingSpeed, () => {
        setIsTyping(false)
        
        // Wait before starting to erase
        timeoutRef.current = setTimeout(() => {
          if (!isActive) return
          setIsErasing(true)
          
          // Pass the full suggestion text to eraseText
          eraseText(nextSuggestion, eraseSpeed, () => {
            setIsErasing(false)
            // Wait before starting next cycle
            if (isActive) {
              timeoutRef.current = setTimeout(cycleSuggestions, erasePause)
            }
          })
        }, pauseDuration)
      })
      
      return nextIndex
    })
  }

  // Initialize the typing effect & react to isActive changes
  useEffect(() => {
    isActiveRef.current = isActive
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
          if (!isMountedRef.current || !isActiveRef.current) return
          setIsErasing(true)
          
          // Pass the full suggestion text to eraseText
          eraseText(firstSuggestion, eraseSpeed, () => {
            setIsErasing(false)
            if (isActiveRef.current) {
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

  // Mount/unmount lifecycle tracking & page visibility handling
  useEffect(() => {
    isMountedRef.current = true

    const handleVisibilityOrPageHide = () => {
      // Stop when page is hidden or being unloaded
      stopAnimation()
    }

    window.addEventListener('visibilitychange', handleVisibilityOrPageHide)
    window.addEventListener('pagehide', handleVisibilityOrPageHide)

    return () => {
      isMountedRef.current = false
      window.removeEventListener('visibilitychange', handleVisibilityOrPageHide)
      window.removeEventListener('pagehide', handleVisibilityOrPageHide)
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