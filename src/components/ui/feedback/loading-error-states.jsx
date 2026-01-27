import { Button } from "@/components/ui/button"
import { FlickeringGrid } from "@/components/ui/flickering-grid"

export function LoadingState({ isLoading, isSettingUpProject }) {
  if (!isLoading && !isSettingUpProject) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white relative overflow-hidden">
      <FlickeringGrid
        className="absolute inset-0 z-0"
        squareSize={4}
        gridGap={6}
        color="rgb(59, 130, 246)"
        maxOpacity={0.15}
        flickerChance={0.3}
      />
      <div className="text-center relative z-10">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
        <p className="text-slate-300">
          {isLoading ? "Loading..." : "Setting up your project..."}
        </p>
      </div>
    </div>
  )
}

export function ErrorState({ projectSetupError, onRetry }) {
  if (!projectSetupError) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white relative overflow-hidden">
      <FlickeringGrid
        className="absolute inset-0 z-0"
        squareSize={4}
        gridGap={6}
        color="rgb(59, 130, 246)"
        maxOpacity={0.15}
        flickerChance={0.3}
      />
      <div className="text-center max-w-md mx-auto px-4 relative z-10">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-semibold mb-2">Setup Error</h2>
        <p className="text-slate-300 mb-6">{projectSetupError}</p>
        <Button
          onClick={onRetry}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Try Again
        </Button>
      </div>
    </div>
  )
} 