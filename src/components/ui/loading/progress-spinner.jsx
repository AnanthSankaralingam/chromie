"use client"

import { useState, useEffect } from "react"
import { CheckCircle, Loader2 } from "lucide-react"

export default function ProgressSpinner({ 
  stages = [], 
  currentStage = 0, 
  isLoading = true,
  className = "" 
}) {
  const [displayedStage, setDisplayedStage] = useState(0)

  // Animate through stages
  useEffect(() => {
    if (!isLoading) return

    const interval = setInterval(() => {
      setDisplayedStage(prev => {
        if (prev < currentStage) {
          return prev + 1
        }
        return prev
      })
    }, 800) // Show each stage for 800ms

    return () => clearInterval(interval)
  }, [currentStage, isLoading])

  // Reset displayed stage when loading starts
  useEffect(() => {
    if (isLoading) {
      setDisplayedStage(0)
    }
  }, [isLoading])

  const progress = stages.length > 0 ? ((displayedStage + 1) / stages.length) * 100 : 0

  return (
    <div className={`text-center ${className}`}>
      {/* Progress Bar */}
      <div className="w-full max-w-md mx-auto mb-6">
        <div className="flex justify-between text-xs text-neutral-500 mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-neutral-800 rounded-full h-1">
          <div 
            className="bg-neutral-600 h-1 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Spinner */}
      <div className="relative mb-6">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-700 border-t-neutral-500 mx-auto" />
        {!isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-neutral-400" />
          </div>
        )}
      </div>

      {/* Current Stage */}
      {stages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-neutral-300">
            {stages[displayedStage]?.title || "Loading"}
          </h3>
          <p className="text-neutral-500 text-sm max-w-md mx-auto">
            {stages[displayedStage]?.description || "Please wait"}
          </p>
        </div>
      )}

      {/* Stage List */}
      {stages.length > 0 && (
        <div className="mt-8 space-y-2 max-w-sm mx-auto">
          {stages.map((stage, index) => (
            <div 
              key={index}
              className={`flex items-center space-x-3 text-sm transition-all duration-300 ${
                index <= displayedStage 
                  ? "text-neutral-400" 
                  : index === displayedStage + 1
                  ? "text-neutral-500"
                  : "text-neutral-600"
              }`}
            >
              <div className="flex-shrink-0">
                {index < displayedStage ? (
                  <CheckCircle className="h-4 w-4 text-neutral-400" />
                ) : index === displayedStage ? (
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-neutral-700" />
                )}
              </div>
              <span className={index <= displayedStage ? "line-through" : ""}>
                {stage.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
