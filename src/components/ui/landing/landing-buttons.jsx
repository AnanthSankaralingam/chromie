import { ArrowRight } from "lucide-react"

export function PrimaryButton({ href, children, external, className = "", onClick, disabled }) {
  const props = external ? { target: "_blank", rel: "noopener noreferrer" } : {}
  const Component = onClick ? "button" : "a"
  return (
    <Component
      href={onClick ? undefined : href}
      onClick={onClick}
      disabled={disabled}
      type={onClick ? "button" : undefined}
      {...props}
      className={`inline-flex items-center justify-center gap-2 border border-white bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Component>
  )
}

export function SecondaryButton({ href, children, className = "", onClick, disabled }) {
  const Component = onClick ? "button" : "a"
  return (
    <Component
      href={onClick ? undefined : href}
      onClick={onClick}
      disabled={disabled}
      type={onClick ? "button" : undefined}
      className={`inline-flex items-center justify-center gap-2 border border-white/25 bg-transparent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </Component>
  )
}
