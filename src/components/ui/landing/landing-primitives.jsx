import { ParallaxHatch } from "@/components/ui/landing/landing-motion"

export function HatchBand({ className = "" }) {
  return <ParallaxHatch className={className} />
}

export function SectionLabel({ children }) {
  return (
    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
      {children}
    </p>
  )
}
