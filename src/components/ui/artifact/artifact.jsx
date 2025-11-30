import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const Artifact = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-slate-600/50 bg-gradient-to-r from-slate-800/50 to-slate-700/50 text-white shadow-lg backdrop-blur-sm",
      className
    )}
    {...props}
  />
))
Artifact.displayName = "Artifact"

const ArtifactHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-start justify-between gap-4 border-b border-slate-600/50 p-4",
      className
    )}
    {...props}
  />
))
ArtifactHeader.displayName = "ArtifactHeader"

const ArtifactTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-slate-100", className)}
    {...props}
  />
))
ArtifactTitle.displayName = "ArtifactTitle"

const ArtifactDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("mt-1 text-sm text-slate-300", className)}
    {...props}
  />
))
ArtifactDescription.displayName = "ArtifactDescription"

const ArtifactContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-auto p-4", className)}
    {...props}
  />
))
ArtifactContent.displayName = "ArtifactContent"

const ArtifactActions = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2", className)}
    {...props}
  />
))
ArtifactActions.displayName = "ArtifactActions"

const ArtifactAction = React.forwardRef(
  ({ className, tooltip, onClick, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10",
          className
        )}
        onClick={onClick}
        title={tooltip}
        {...props}
      >
        {children}
      </Button>
    )
  }
)
ArtifactAction.displayName = "ArtifactAction"

const ArtifactClose = React.forwardRef(({ className, onClick, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </Button>
  )
})
ArtifactClose.displayName = "ArtifactClose"

export {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactContent,
  ArtifactActions,
  ArtifactAction,
  ArtifactClose,
}

