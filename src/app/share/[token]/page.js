import ShareExtensionPage from "@/components/pages/share-extension-page"
import Link from "next/link"
import Image from "next/image"

export default async function SharePage({ params }) {
  const { token } = await params

  return (
    <div className="min-h-screen bg-black">
      {/* Chrome Web Store style header */}
      <header className="border-b border-gray-800 bg-black px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Image src="/chromie-logo-1.png" alt="Chromie" width={28} height={28} className="shrink-0" />
            <span className="font-semibold text-white">chromie.dev</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Build your own extension
          </Link>
        </div>
      </header>
      <ShareExtensionPage token={token} />
    </div>
  )
}
