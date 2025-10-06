"use client"

import { useState, useCallback } from "react"

const SESSION_MODAL_SHOWN_KEY = "chromie-session-modal-shown"

export function useOnboardingModal() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Check if we should show the modal when arriving at builder page
  const checkShouldShowModal = useCallback((hasAutoGenerateParam = false) => {
    if (typeof window === "undefined") return false
    
    // Check if modal has already been shown in this session
    const hasShownModal = sessionStorage.getItem(SESSION_MODAL_SHOWN_KEY) === "true"
    
    // Show if user has autoGenerate param AND hasn't seen modal this session
    return hasAutoGenerateParam && !hasShownModal
  }, [])

  // Show the modal
  const showModal = useCallback(() => {
    setIsModalOpen(true)
    // Mark that modal has been shown in this session
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_MODAL_SHOWN_KEY, "true")
    }
  }, [])

  // Hide the modal
  const hideModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  return {
    isModalOpen,
    checkShouldShowModal,
    showModal,
    hideModal
  }
}
