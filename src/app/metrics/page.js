import { Suspense } from 'react'
import MetricsPage from "@/components/pages/metrics-page"

function MetricsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-500 border-t-transparent" />
    </div>
  )
}

export default function Metrics() {
  return (
    <Suspense fallback={<MetricsLoading />}>
      <MetricsPage />
    </Suspense>
  )
}
