import ShareExtensionPage from "@/components/pages/share-extension-page"
import AppBar from "@/components/ui/app-bars/app-bar"

export default function SharePage({ params }) {
  const { token } = params

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <AppBar />
      <ShareExtensionPage token={token} />
    </div>
  )
}
