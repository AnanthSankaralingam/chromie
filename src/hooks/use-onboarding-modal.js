"use client"

import { useState, useCallback } from "react"

const SESSION_MODAL_SHOWN_KEY = "chromie-session-modal-shown"
const NOTIFY_MODAL_SHOWN_KEY = "chromie-notify-modal-shown"
const NOTIFY_ON_COMPLETE_KEY = "chromie-notify-on-complete"

// Available onboarding modal types (notify is first, shown separately on land)
const MODAL_TYPES = ['notify', 'test', 'edit', 'download', 'publish']

export function useOnboardingModal() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentModalType, setCurrentModalType] = useState('notify')
  const [notifyOnComplete, setNotifyOnCompleteState] = useState(false)

  // Check if user opted in to sound notification (persisted in sessionStorage)
  const getNotifyOnComplete = useCallback(() => {
    if (typeof window === "undefined") return false
    return sessionStorage.getItem(NOTIFY_ON_COMPLETE_KEY) === "true"
  }, [])

  // Check if we should show the notify modal when user lands with autoGenerate
  const checkShouldShowNotifyModal = useCallback((hasAutoGenerateParam = false) => {
    if (typeof window === "undefined") return false
    const hasShownNotify = sessionStorage.getItem(NOTIFY_MODAL_SHOWN_KEY) === "true"
    return hasAutoGenerateParam && !hasShownNotify
  }, [])

  // Show the notify modal (first in list, shown when user lands with autoGenerate)
  const showNotifyModal = useCallback(() => {
    if (typeof window === "undefined") return
    setCurrentModalType('notify')
    setIsModalOpen(true)
    sessionStorage.setItem(NOTIFY_MODAL_SHOWN_KEY, "true")
    // Also mark session modal as shown so we don't show the random modal when generation starts
    sessionStorage.setItem(SESSION_MODAL_SHOWN_KEY, "true")
  }, [])

  // Called when user opts in to sound notification
  const setNotifyOnComplete = useCallback((value) => {
    setNotifyOnCompleteState(value)
    if (typeof window !== "undefined") {
      if (value) {
        sessionStorage.setItem(NOTIFY_ON_COMPLETE_KEY, "true")
      } else {
        sessionStorage.removeItem(NOTIFY_ON_COMPLETE_KEY)
      }
    }
  }, [])

  // Check if we should show the modal when arriving at builder page
  const checkShouldShowModal = useCallback((hasAutoGenerateParam = false) => {
    if (typeof window === "undefined") return false

    // Check if modal has already been shown in this session
    const hasShownModal = sessionStorage.getItem(SESSION_MODAL_SHOWN_KEY) === "true"

    // Show if user has autoGenerate param AND hasn't seen modal this session
    return hasAutoGenerateParam && !hasShownModal
  }, [])

  // Show a random modal (excluding notify - that's shown separately)
  const showModal = useCallback(() => {
    if (typeof window === "undefined") return

    // Select a random modal type (skip 'notify' - it's first and shown on land)
    const otherTypes = MODAL_TYPES.filter(t => t !== 'notify')
    const randomIndex = Math.floor(Math.random() * otherTypes.length)
    const selectedModalType = otherTypes[randomIndex]

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
    goToNextStep: handleNext,
    // Notify modal (first in list)
    checkShouldShowNotifyModal,
    showNotifyModal,
    notifyOnComplete: notifyOnComplete || getNotifyOnComplete(),
    setNotifyOnComplete,
    getNotifyOnComplete,
  }
}