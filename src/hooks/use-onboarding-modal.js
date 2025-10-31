"use client"

import { useState, useCallback } from "react"

const SESSION_MODAL_SHOWN_KEY = "chromie-session-modal-shown"
const ONBOARDING_ROTATION_INDEX_KEY = "chromie-onboarding-rotation-index"

// Define the 4 rotation sets
const ROTATION_SETS = [
  ['test', 'edit', 'download'], // Set 0 (first visit) - 3 modals
  ['url-navigate'], // Set 1 - 1 modal
  ['publish', 'download'], // Set 2 - 2 modals
  ['test', 'edit', 'download', 'url-navigate', 'publish'] // Set 3 - 5 modals
]

export function useOnboardingModal() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentRotationIndex, setCurrentRotationIndex] = useState(0)
  const [currentModalIndex, setCurrentModalIndex] = useState(0)

  // Load the current rotation index from localStorage
  const loadCurrentRotationIndex = useCallback(() => {
    if (typeof window === "undefined") return 0
    
    const savedIndex = localStorage.getItem(ONBOARDING_ROTATION_INDEX_KEY)
    if (savedIndex !== null) {
      const index = parseInt(savedIndex, 10)
      // Ensure index is valid (0-3)
      if (index >= 0 && index < ROTATION_SETS.length) {
        return index
      }
    }
    return 0 // Default to first rotation set
  }, [])

  // Save the current rotation index to localStorage
  const saveCurrentRotationIndex = useCallback((index) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_ROTATION_INDEX_KEY, index.toString())
    }
  }, [])

  // Get the current step (modal type) based on rotation index and modal index
  const getCurrentStep = useCallback(() => {
    const rotationSet = ROTATION_SETS[currentRotationIndex]
    if (rotationSet && currentModalIndex < rotationSet.length) {
      return rotationSet[currentModalIndex]
    }
    return 'test' // Fallback
  }, [currentRotationIndex, currentModalIndex])

  // Check if we should show the modal when arriving at builder page
  const checkShouldShowModal = useCallback((hasAutoGenerateParam = false) => {
    if (typeof window === "undefined") return false
    
    // Check if modal has already been shown in this session
    const hasShownModal = sessionStorage.getItem(SESSION_MODAL_SHOWN_KEY) === "true"
    
    // Show if user has autoGenerate param AND hasn't seen modal this session
    return hasAutoGenerateParam && !hasShownModal
  }, [])

  // Show the modal with the first modal of current rotation set
  const showModal = useCallback(() => {
    if (typeof window === "undefined") return
    
    // Load current rotation index from localStorage
    const rotationIndex = loadCurrentRotationIndex()
    setCurrentRotationIndex(rotationIndex)
    setCurrentModalIndex(0) // Start at first modal of rotation set
    setIsModalOpen(true)
    
    // Mark that modal has been shown in this session
    sessionStorage.setItem(SESSION_MODAL_SHOWN_KEY, "true")
  }, [loadCurrentRotationIndex])

  // Hide the modal
  const hideModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  // Move to the next modal in the rotation set, or advance to next rotation if complete
  const goToNextStep = useCallback(() => {
    const currentRotationSet = ROTATION_SETS[currentRotationIndex]
    const nextModalIndex = currentModalIndex + 1
    
    // Check if we've completed all modals in the current rotation set
    if (nextModalIndex >= currentRotationSet.length) {
      // Advance to next rotation set (cycle back to 0 after set 3)
      const nextRotationIndex = (currentRotationIndex + 1) % ROTATION_SETS.length
      setCurrentRotationIndex(nextRotationIndex)
      saveCurrentRotationIndex(nextRotationIndex)
      setIsModalOpen(false) // Close modal when rotation set is complete
    } else {
      // Move to next modal in current rotation set
      setCurrentModalIndex(nextModalIndex)
    }
  }, [currentRotationIndex, currentModalIndex, saveCurrentRotationIndex])

  // Get current step for rendering
  const currentStep = getCurrentStep()

  return {
    isModalOpen,
    currentStep,
    checkShouldShowModal,
    showModal,
    hideModal,
    goToNextStep
  }
}