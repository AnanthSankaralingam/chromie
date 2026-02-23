"use client"

import NotifyStepModal from "./notify-step-modal"
import TestStepModal from "./test-step-modal"
import EditStepModal from "./edit-step-modal"
import DownloadStepModal from "./download-step-modal"
import PublishStepModal from "./publish-step-modal"

export default function OnboardingModal({
  isOpen,
  onClose,
  currentStep,
  onNext,
  onNotifyOptIn,
  onNotifyOptOut,
}) {
  // Common props to pass to all step modals
  const commonProps = {
    isOpen,
    onClose,
    onNext
  }

  // Render the appropriate step modal based on currentStep (notify is first in list)
  switch (currentStep) {
    case 'notify':
      return (
        <NotifyStepModal
          isOpen={isOpen}
          onClose={onClose}
          onOptIn={onNotifyOptIn}
          onOptOut={onNotifyOptOut}
        />
      )
    case 'test':
      return <TestStepModal {...commonProps} />
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
