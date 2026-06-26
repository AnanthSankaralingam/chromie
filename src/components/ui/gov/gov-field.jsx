import { LABEL_CLASS } from "@/components/ui/app-dashboard-theme"

export default function GovField({ label, hint, children, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <label className={LABEL_CLASS}>{label}</label>
      {hint ? <p className="mt-0.5 text-xs text-zinc-600">{hint}</p> : null}
      {children}
    </div>
  )
}
