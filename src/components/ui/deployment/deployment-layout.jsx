"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { FlickeringGrid } from "@/components/ui/flickering-grid"

export default function DeploymentLayout({
  currentStep,
  totalSteps = 5,
  stepTitle,
  stepDescription,
  children,
  onBack,
  onNext,
  onStepClick,
  canGoBack = true,
  canGoNext = true,
  nextLabel = "Next",
  projectId,
}) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white relative">
      {/* Flickering Grid Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <FlickeringGrid
          className="absolute inset-0 z-0"
          squareSize={4}
          gridGap={6}
          color="rgb(99, 102, 241)"
          maxOpacity={0.12}
          flickerChance={2.0}
        />
      </div>

      {/* Header */}
      <div className="border-b border-zinc-800 bg-[#111111]/80 backdrop-blur-sm relative z-10">
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
                <button
                  onClick={() => onStepClick?.(step)}
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                    transition-all duration-200 cursor-pointer
                    ${
                      step < currentStep
                        ? "bg-green-600 text-white hover:bg-green-700 hover:scale-110"
                        : step === currentStep
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-110"
                        : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 hover:scale-110"
                    }
                  `}
                  title={`Go to Step ${step}`}
                >
                  {step < currentStep ? "✓" : step}
                </button>
                {step < totalSteps && (
                  <div
                    className={`w-12 h-0.5 mx-1 transition-colors ${
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
      <div className="max-w-5xl mx-auto px-6 py-8 relative z-10">
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
