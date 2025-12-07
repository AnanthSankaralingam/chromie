"use client"

import { useState, useCallback } from "react"

const SESSION_MODAL_SHOWN_KEY = "chromie-session-modal-shown"

// Available onboarding modal types
const MODAL_TYPES = ['test', 'edit', 'download', 'publish']

export function useOnboardingModal() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentModalType, setCurrentModalType] = useState('test')

  // Check if we should show the modal when arriving at builder page
  const checkShouldShowModal = useCallback((hasAutoGenerateParam = false) => {
    if (typeof window === "undefined") return false

    // Check if modal has already been shown in this session
    const hasShownModal = sessionStorage.getItem(SESSION_MODAL_SHOWN_KEY) === "true"

    // Show if user has autoGenerate param AND hasn't seen modal this session
    return hasAutoGenerateParam && !hasShownModal
  }, [])

  // Show a random modal
  const showModal = useCallback(() => {
    if (typeof window === "undefined") return

    // Select a random modal type
    const randomIndex = Math.floor(Math.random() * MODAL_TYPES.length)
    const selectedModalType = MODAL_TYPES[randomIndex]

    setCurrentModalType(selectedModalType)
    setIsModalOpen(true)

    // Mark that modal has been shown in this session
    sessionStorage.setItem(SESSION_MODAL_SHOWN_KEY, "true")
  }, [])

  // Hide the modal
  const hideModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  // Close the modal (same as hide for single modal)
  const handleNext = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  return {
    isModalOpen,
    currentStep: currentModalType,
    checkShouldShowModal,
    showModal,
    hideModal,
    goToNextStep: handleNext
  }
}