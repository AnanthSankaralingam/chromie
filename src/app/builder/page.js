import { Suspense } from 'react'
import BuilderPage from '@/components/pages/builder-page'

export const metadata = {
  title: "Extension Builder",
  description: "Use the AI-powered chromie.dev builder to generate, edit, and download Chrome extensions instantly. Describe what you want and watch it get built in real time.",
  alternates: {
    canonical: "https://chromie.dev/builder",
  },
  openGraph: {
    title: "Extension Builder | chromie.dev",
    description: "Build Chrome extensions in real time with AI. Describe, preview, and download your extension in seconds.",
    url: "https://chromie.dev/builder",
  },
}

function BuilderLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A0A0F] via-[#0F111A] to-[#0A0A0F] text-white">
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
