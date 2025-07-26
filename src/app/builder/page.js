import { Suspense } from 'react'
import BuilderPage from '@/components/pages/builder-page'

function BuilderLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
    </div>
  )
}

export default function Builder() {
  return (
    <Suspense fallback={<BuilderLoading />}>
      <BuilderPage />
    </Suspense>
  )
}
