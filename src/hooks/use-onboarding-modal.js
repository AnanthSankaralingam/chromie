"use client"

import { useState, useCallback } from "react"

const SESSION_MODAL_SHOWN_KEY = "chromie-session-modal-shown"
const ONBOARDING_STEP_KEY = "chromie-onboarding-step"

// Define the onboarding steps in order
const ONBOARDING_STEPS = ['test', 'edit', 'download', 'publish']

export function useOnboardingModal() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState('test')

  // Get the next step in the sequence
  const getNextStep = useCallback(() => {
    if (typeof window === "undefined") return 'test'
    
    const currentStepIndex = ONBOARDING_STEPS.indexOf(currentStep)
    const nextStepIndex = (currentStepIndex + 1) % ONBOARDING_STEPS.length
    return ONBOARDING_STEPS[nextStepIndex]
  }, [currentStep])

  // Load the current step from localStorage
  const loadCurrentStep = useCallback(() => {
    if (typeof window === "undefined") return 'test'
    
    const savedStep = localStorage.getItem(ONBOARDING_STEP_KEY)
    return savedStep && ONBOARDING_STEPS.includes(savedStep) ? savedStep : 'test'
  }, [])

  // Save the current step to localStorage
  const saveCurrentStep = useCallback((step) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_STEP_KEY, step)
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

  // Show the modal with the current step
  const showModal = useCallback(() => {
    const stepToShow = loadCurrentStep()
    setCurrentStep(stepToShow)
    setIsModalOpen(true)
    
    // Mark that modal has been shown in this session
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_MODAL_SHOWN_KEY, "true")
    }
  }, [loadCurrentStep])

  // Hide the modal
  const hideModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  // Move to the next step
  const goToNextStep = useCallback(() => {
    const nextStep = getNextStep()
    setCurrentStep(nextStep)
    saveCurrentStep(nextStep)
    setIsModalOpen(false)
  }, [getNextStep, saveCurrentStep])

  return {
    isModalOpen,
    currentStep,
    checkShouldShowModal,
    showModal,
    hideModal,
    goToNextStep
  }
}
