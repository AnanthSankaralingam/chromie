"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FlickeringGrid } from "@/components/ui/flickering-grid"

const STUCK_THRESHOLD_MS = 10000

export function LoadingState({ isLoading, isSettingUpProject }) {
  const [showReloadHint, setShowReloadHint] = useState(false)

  useEffect(() => {
    if (!isLoading && !isSettingUpProject) {
      setShowReloadHint(false)
      return
    }
    const timer = setTimeout(() => setShowReloadHint(true), STUCK_THRESHOLD_MS)
    return () => clearTimeout(timer)
  }, [isLoading, isSettingUpProject])

  if (!isLoading && !isSettingUpProject) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white relative overflow-hidden">
      <FlickeringGrid
        className="absolute inset-0 z-0"
        squareSize={4}
        gridGap={6}
        color="rgb(115, 115, 115)"
        maxOpacity={0.08}
        flickerChance={1.5}
      />
      <div className="text-center relative z-10">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-700 border-t-neutral-500 mx-auto mb-4" />
        <p className="text-sm text-neutral-500">
          {isLoading ? "Loading" : "Setting up project"}
        </p>
        {showReloadHint && (
          <p className="mt-6 text-xs text-neutral-600">
            Taking too long?{" "}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="underline hover:text-neutral-400 transition-colors"
            >
              Reload page
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

export function ErrorState({ projectSetupError, onRetry }) {
  if (!projectSetupError) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white relative overflow-hidden">
      <FlickeringGrid
        className="absolute inset-0 z-0"
        squareSize={4}
        gridGap={6}
        color="rgb(115, 115, 115)"
        maxOpacity={0.08}
        flickerChance={1.5}
      />
      <div className="text-center max-w-md mx-auto px-4 relative z-10">
        <div className="w-12 h-12 rounded-full border border-neutral-600 flex items-center justify-center mx-auto mb-4">
          <span className="text-neutral-400 text-lg">!</span>
        </div>
        <h2 className="text-lg font-medium text-neutral-200 mb-2">Setup Error</h2>
        <p className="text-neutral-500 text-sm mb-6">{projectSetupError}</p>
        <Button
          onClick={onRetry}
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-600"
        >
          Try Again
        </Button>
      </div>
    </div>
  )
} 