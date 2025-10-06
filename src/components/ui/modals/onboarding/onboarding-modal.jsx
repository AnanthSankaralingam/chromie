"use client"

import TestStepModal from "./test-step-modal"
import EditStepModal from "./edit-step-modal"
import DownloadStepModal from "./download-step-modal"
import PublishStepModal from "./publish-step-modal"

export default function OnboardingModal({ 
  isOpen, 
  onClose,
  currentStep,
  onNext
}) {
  // Render the appropriate step modal based on currentStep
  switch (currentStep) {
    case 'test':
      return (
        <TestStepModal
          isOpen={isOpen}
          onClose={onClose}
          onNext={onNext}
        />
      )
    case 'edit':
      return (
        <EditStepModal
          isOpen={isOpen}
          onClose={onClose}
          onNext={onNext}
        />
      )
    case 'download':
      return (
        <DownloadStepModal
          isOpen={isOpen}
          onClose={onClose}
          onNext={onNext}
        />
      )
    case 'publish':
      return (
        <PublishStepModal
          isOpen={isOpen}
          onClose={onClose}
          onNext={onNext}
        />
      )
    default:
      return (
        <TestStepModal
          isOpen={isOpen}
          onClose={onClose}
          onNext={onNext}
        />
      )
  }
}
