"use client"

import TestStepModal from "./test-step-modal"
import EditStepModal from "./edit-step-modal"
import DownloadStepModal from "./download-step-modal"
import PublishStepModal from "./publish-step-modal"
import UrlNavigateStepModal from "./url-navigate-step-modal"

export default function OnboardingModal({
  isOpen,
  onClose,
  currentStep,
  currentStepNumber,
  totalSteps,
  isLastStep,
  onNext
}) {
  // Common props to pass to all step modals
  const commonProps = {
    isOpen,
    onClose,
    onNext,
    currentStepNumber,
    totalSteps,
    isLastStep
  }

  // Render the appropriate step modal based on currentStep
  switch (currentStep) {
    case 'test':
      return <TestStepModal {...commonProps} />
    case 'url-navigate':
      return <UrlNavigateStepModal {...commonProps} />
    case 'edit':
      return <EditStepModal {...commonProps} />
    case 'download':
      return <DownloadStepModal {...commonProps} />
    case 'publish':
      return <PublishStepModal {...commonProps} />
    default:
      return <TestStepModal {...commonProps} />
  }
}
