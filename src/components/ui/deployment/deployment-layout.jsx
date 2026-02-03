"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"

export default function DeploymentLayout({
  currentStep,
  totalSteps = 5,
  stepTitle,
  stepDescription,
  children,
  onBack,
  onNext,
  canGoBack = true,
  canGoNext = true,
  nextLabel = "Next",
  projectId,
}) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-[#111111]">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Extension Deployment</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/builder?project=${projectId}`)}
              className="text-zinc-400 hover:text-white"
            >
              Return to Builder
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                    ${
                      step < currentStep
                        ? "bg-green-600 text-white"
                        : step === currentStep
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-800 text-zinc-500"
                    }
                  `}
                >
                  {step < currentStep ? "✓" : step}
                </div>
                {step < totalSteps && (
                  <div
                    className={`w-12 h-0.5 mx-1 ${
                      step < currentStep ? "bg-green-600" : "bg-zinc-800"
                    }`}
                  />
                )}
              </div>
            ))}
            <span className="ml-4 text-sm text-zinc-400">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{stepTitle}</h2>
          <p className="text-zinc-400">{stepDescription}</p>
        </div>

        <div className="bg-[#111111] border border-zinc-800 rounded-lg p-6">
          {children}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={!canGoBack}
            className="text-zinc-400 hover:text-white disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={onNext}
            disabled={!canGoNext}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {nextLabel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
