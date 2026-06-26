import { ArrowRight } from "lucide-react"

export function PrimaryButton({ href, children, external, className = "" }) {
  const props = external ? { target: "_blank", rel: "noopener noreferrer" } : {}
  return (
    <a
      href={href}
      {...props}
      className={`inline-flex items-center justify-center gap-2 border border-white bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </a>
  )
}
