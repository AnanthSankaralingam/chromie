import { ACCENT, CARD_CLASS, LABEL_CLASS } from "@/components/ui/app-dashboard-theme"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "lucide-react"

export default function OpportunityStats({ total, openDeadlines, highFitCount }) {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-3">
      <Card className={CARD_CLASS}>
        <CardContent className="px-4 py-3">
          <p className={LABEL_CLASS}>Total</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{total}</p>
        </CardContent>
      </Card>
      <Card className={CARD_CLASS}>
        <CardContent className="px-4 py-3">
          <p className={LABEL_CLASS}>Open deadlines</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums">
            <Calendar className="h-5 w-5 text-zinc-500" />
            {openDeadlines}
          </p>
        </CardContent>
      </Card>
      <Card className={CARD_CLASS}>
        <CardContent className="px-4 py-3">
          <p className={LABEL_CLASS}>High fit (90%+)</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${ACCENT}`}>{highFitCount}</p>
        </CardContent>
      </Card>
    </div>
  )
}
