import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-neutral-900 text-white hover:bg-neutral-800 focus-visible:ring-neutral-900",
        destructive: "bg-red-50 text-red-600 hover:bg-red-100 focus-visible:ring-red-500",
        outline: "border-2 border-neutral-200 bg-transparent text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-900 focus-visible:ring-neutral-400",
        secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus-visible:ring-neutral-500",
        ghost: "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/50 focus-visible:ring-neutral-400",
        link: "text-neutral-900 underline-offset-4 hover:underline focus-visible:ring-neutral-500 p-0",
        minimal: "text-neutral-600 hover:text-neutral-900 focus-visible:ring-neutral-400 bg-transparent hover:bg-transparent",
        minimalDark: "text-white/80 hover:text-white hover:bg-white/5 focus-visible:ring-white/20 bg-transparent",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
        iconSm: "h-8 w-8",
        iconLg: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * @typedef {Object} ButtonProps
 * @property {boolean} [asChild] - Render as child component
 * @property {string} [variant] - Button variant
 * @property {string} [size] - Button size
 * @extends {React.ButtonHTMLAttributes<HTMLButtonElement>}
 */

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
