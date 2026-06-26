import { APP_PAGE } from "@/components/ui/app-dashboard-theme"

export default function GovLoadingState({ message = "Loading…" }) {
  return (
    <div className={`${APP_PAGE} flex items-center justify-center`}>
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  )
}
