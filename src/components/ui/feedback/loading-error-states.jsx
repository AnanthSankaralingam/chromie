import { Button } from "@/components/ui/button"

export function LoadingState({ isLoading, isSettingUpProject }) {
  if (!isLoading && !isSettingUpProject) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-semibold mb-2">Setup Error</h2>
        <p className="text-slate-300 mb-6">{projectSetupError}</p>
        <Button 
          onClick={onRetry}
          className="bg-purple-600 hover:bg-purple-700"
        >
          Try Again
        </Button>
      </div>
    </div>
  )
} 