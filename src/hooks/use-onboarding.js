"use client"

import { useState, useEffect, useCallback } from "react"

const ONBOARDING_STORAGE_KEY = "chromie-onboarding-completed"
const TEST_BUTTON_HIGHLIGHT_DURATION = 2500 // 3 seconds
const DOWNLOAD_BUTTON_HIGHLIGHT_DURATION =  2000 // 3 seconds

export function useOnboarding() {
  const [isTestButtonHighlighted, setIsTestButtonHighlighted] = useState(false)
  const [isDownloadButtonHighlighted, setIsDownloadButtonHighlighted] = useState(false)
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false)

  // Check if onboarding is completed on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true"
      setIsOnboardingCompleted(completed)
    }
  }, [])

  // Mark onboarding as completed
  const markOnboardingCompleted = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true")
      setIsOnboardingCompleted(true)
    }
  }, [])

  // Start test button highlight
  const startTestButtonHighlight = useCallback(() => {
    if (isOnboardingCompleted) return
    
    // Stop any existing highlights first
    setIsDownloadButtonHighlighted(false)
    setIsTestButtonHighlighted(true)
    
    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setIsTestButtonHighlighted(false)
    }, TEST_BUTTON_HIGHLIGHT_DURATION)
  }, [isOnboardingCompleted])

  // Start download button highlight
  const startDownloadButtonHighlight = useCallback(() => {
    if (isOnboardingCompleted) return
    
    // Stop any existing highlights first
    setIsTestButtonHighlighted(false)
    setIsDownloadButtonHighlighted(true)
    
    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      setIsDownloadButtonHighlighted(false)
      // Mark onboarding as completed after download button highlight
      markOnboardingCompleted()
    }, DOWNLOAD_BUTTON_HIGHLIGHT_DURATION)
    
    return () => clearTimeout(timer)
  }, [isOnboardingCompleted, markOnboardingCompleted])

  // Stop all highlights
  const stopAllHighlights = useCallback(() => {
    setIsTestButtonHighlighted(false)
    setIsDownloadButtonHighlighted(false)
  }, [])

  return {
    isTestButtonHighlighted,
    isDownloadButtonHighlighted,
    isOnboardingCompleted,
    startTestButtonHighlight,
    startDownloadButtonHighlight,
    stopAllHighlights,
    markOnboardingCompleted
  }
}
