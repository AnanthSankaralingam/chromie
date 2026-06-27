import { BTN_OUTLINE } from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"

export default function OpportunityEmptyState({ monitorStatus, onScrollToMonitor }) {
  const activeRun = monitorStatus?.active_run
  const hasSchedule = monitorStatus?.schedule?.enabled

  return (
    <div className="mt-10 border border-white/10 bg-black/30 px-6 py-14 text-center">
      <p className="text-base font-medium text-zinc-300">No opportunities yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
        {activeRun
          ? "Your first automatic contract search is running now. Matching opportunities will appear here when it completes."
          : hasSchedule
            ? "Chromie searches government sources automatically each day. Your next search is scheduled — results will appear here after a successful run."
            : "Complete company onboarding to start automatic contract searches. Results will appear here after each successful run."}
      </p>
      {onScrollToMonitor ? (
        <Button className={`mt-6 ${BTN_OUTLINE}`} onClick={onScrollToMonitor}>
          View search status
        </Button>
      ) : null}
    </div>
  )
}
