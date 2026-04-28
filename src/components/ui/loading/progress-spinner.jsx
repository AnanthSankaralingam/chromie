"use client"

import { useState, useLayoutEffect, useRef } from "react"
import { CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { nextLoadingEducationIndex } from "@/lib/utils/loading-education-index"

/** Indeterminate bar — CSS-only motion, no timers tied to load duration. */
export function LoadingIndeterminateBar({ className = "" }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
        <div className="absolute inset-y-0 left-0 w-[36%] rounded-full bg-gradient-to-r from-neutral-600 via-neutral-300 to-neutral-600 chromie-loading-indeterminate" />
      </div>
    </div>
  )
}

export default function ProgressSpinner({
  stages = [],
  isLoading = true,
  className = "",
}) {
  const [tipIndex, setTipIndex] = useState(0)
  const overlayActiveRef = useRef(false)

  useLayoutEffect(() => {
    if (!isLoading) {
      overlayActiveRef.current = false
      return
    }
    if (stages.length === 0) return
    if (!overlayActiveRef.current) {
      overlayActiveRef.current = true
      setTipIndex(nextLoadingEducationIndex(stages.length))
    }
  }, [isLoading, stages.length])

  const stage = stages[tipIndex]

  return (
    <div className={`text-center ${className}`}>
      <div className="max-w-md mx-auto mb-6">
        {isLoading ? (
          <LoadingIndeterminateBar />
        ) : (
          <div className="h-1.5 w-full rounded-full bg-neutral-700">
            <div className="h-1.5 w-full rounded-full bg-neutral-400 transition-all duration-500" />
          </div>
        )}
      </div>

      <div className="relative mb-6">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-700 border-t-neutral-500 mx-auto" />
        {!isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-neutral-400" />
          </div>
        )}
      </div>

      {stages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-neutral-300">
            {stage?.title || "Loading"}
          </h3>
          <p className="text-neutral-500 text-sm max-w-md mx-auto leading-relaxed">
            {stage?.description || "Please wait"}
          </p>
        </div>
      )}
    </div>
  )
}
