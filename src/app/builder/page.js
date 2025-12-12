import { Suspense } from 'react'
import BuilderPage from '@/components/pages/builder-page'

function BuilderLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-500 border-t-transparent" />
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
