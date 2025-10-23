import * as React from "react"
import { cn } from "@/lib/utils"

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", disabled = false, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

    const variants = {
      default: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
      destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
      outline: "border border-gray-600 bg-transparent hover:bg-gray-800 focus-visible:ring-gray-500",
      secondary: "bg-gray-800 text-gray-100 hover:bg-gray-700 focus-visible:ring-gray-500",
      ghost: "hover:bg-gray-800 focus-visible:ring-gray-500",
      link: "text-gray-300 underline-offset-4 hover:underline focus-visible:ring-gray-500",
    }

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    }

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  },
)
Button.displayName = "Button"

export { Button }
