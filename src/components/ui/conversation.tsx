"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAutoScroll } from "@/hooks/use-auto-scroll"

interface ConversationContextValue {
  isAtBottom: boolean
  scrollToBottom: () => void
}

const ConversationContext = React.createContext<ConversationContextValue | null>(null)

const useConversationContext = () => {
  const context = React.useContext(ConversationContext)
  if (!context) {
    throw new Error("ConversationContent must be used within a Conversation component")
  }
  return context
}

interface ConversationProps extends React.HTMLAttributes<HTMLDivElement> {
  initial?: ScrollBehavior
  resize?: ScrollBehavior
}

const Conversation = React.forwardRef<HTMLDivElement, ConversationProps>(
  ({ className, initial = "smooth", resize = "smooth", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative w-full h-full overflow-hidden", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Conversation.displayName = "Conversation"

interface ConversationContentProps extends React.HTMLAttributes<HTMLDivElement> {
  smooth?: boolean
}

const ConversationContent = React.forwardRef<HTMLDivElement, ConversationContentProps>(
  ({ className, children, smooth = false, ...props }, _ref) => {
    const {
      scrollRef,
      isAtBottom,
      autoScrollEnabled,
      scrollToBottom,
      disableAutoScroll,
    } = useAutoScroll({
      smooth,
      content: children,
    })

    const contextValue = React.useMemo(
      () => ({
        isAtBottom,
        scrollToBottom: () => scrollToBottom(),
      }),
      [isAtBottom, scrollToBottom]
    )

    return (
      <ConversationContext.Provider value={contextValue}>
        <div className="relative w-full h-full">
          <div
            ref={scrollRef}
            className={cn(
              "flex flex-col w-full h-full overflow-y-auto",
              className
            )}
            onWheel={disableAutoScroll}
            onTouchMove={disableAutoScroll}
            {...props}
          >
            <div className="flex flex-col gap-4 px-6 py-4">{children}</div>
          </div>
        </div>
      </ConversationContext.Provider>
    )
  }
)
ConversationContent.displayName = "ConversationContent"

interface ConversationEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  icon?: React.ReactNode
}

const ConversationEmptyState = React.forwardRef<HTMLDivElement, ConversationEmptyStateProps>(
  ({ className, title = "No messages yet", description = "Start a conversation to see messages here", icon, children, ...props }, ref) => {
    if (children) {
      return (
        <div ref={ref} className={cn("flex items-center justify-center h-full", className)} {...props}>
          {children}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center h-full text-center p-8",
          className
        )}
        {...props}
      >
        {icon && (
          <div className="mb-4 text-slate-400">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
        <p className="text-sm text-slate-400 max-w-sm">{description}</p>
      </div>
    )
  }
)
ConversationEmptyState.displayName = "ConversationEmptyState"

interface ConversationScrollButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  onScrollToBottom?: () => void
  isAtBottom?: boolean
}

const ConversationScrollButton = React.forwardRef<HTMLButtonElement, ConversationScrollButtonProps>(
  ({ className, children, onScrollToBottom: onScrollToBottomProp, isAtBottom: isAtBottomProp, ...props }, ref) => {
    // Try to get scroll state from context, fallback to props
    let isAtBottom: boolean
    let scrollToBottom: () => void

    try {
      const context = useConversationContext()
      isAtBottom = isAtBottomProp !== undefined ? isAtBottomProp : context.isAtBottom
      scrollToBottom = onScrollToBottomProp || context.scrollToBottom
    } catch {
      // Not within ConversationContent, use props only
      if (isAtBottomProp === undefined || onScrollToBottomProp === undefined) {
        console.warn("ConversationScrollButton should be used within ConversationContent or provide both isAtBottom and onScrollToBottom props")
        return null
      }
      isAtBottom = isAtBottomProp
      scrollToBottom = onScrollToBottomProp
    }

    // If at bottom, don't show the button
    if (isAtBottom) {
      return null
    }

    return (
      <Button
        ref={ref}
        onClick={scrollToBottom}
        size="icon"
        variant="outline"
        className={cn(
          "absolute bottom-2 left-1/2 transform -translate-x-1/2 inline-flex rounded-full shadow-md z-10",
          className
        )}
        aria-label="Scroll to bottom"
        {...props}
      >
        {children || <ChevronDown className="h-4 w-4" />}
      </Button>
    )
  }
)
ConversationScrollButton.displayName = "ConversationScrollButton"

export {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
}

