const VARIANT_CLASS = {
  error: "border-red-500/25 bg-red-500/10 text-red-300",
  warning: "border-amber-400/25 bg-amber-400/10 text-amber-100",
}

export default function GovAlertBanner({ variant = "error", children }) {
  return (
    <div className={`border px-3 py-2 text-sm ${VARIANT_CLASS[variant]}`}>{children}</div>
  )
}
