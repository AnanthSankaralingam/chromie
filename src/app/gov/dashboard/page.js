import { Suspense } from "react"
import GovDashboardPage from "@/components/pages/gov-dashboard-page"

export const metadata = {
  title: "Government Dashboard",
  description: "Schedule government contract monitoring and review automation audits.",
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GovDashboardPage />
    </Suspense>
  )
}
