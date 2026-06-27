import { BTN_OUTLINE } from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"

export default function OpportunityEmptyState({ onGoToMonitor }) {
  return (
    <div className="mt-10 border border-white/10 bg-black/30 px-6 py-14 text-center">
      <p className="text-base font-medium text-zinc-300">No opportunities yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
        Run the contract search monitor below. Matching contracts will appear here after each successful
        run.
      </p>
      <Button className={`mt-6 ${BTN_OUTLINE}`} onClick={onGoToMonitor}>
        Set up contract search
      </Button>
    </div>
  )
}
