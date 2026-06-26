import AppBarDashboard from "@/components/ui/app-bars/app-bar-dashboard"
import { APP_PAGE } from "@/components/ui/app-dashboard-theme"
import { FilmGrain } from "@/components/ui/landing/landing-motion"
import AuthModal from "@/components/ui/modals/modal-auth"

const MAX_WIDTH_CLASS = {
  lg: "max-w-lg",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
}

export default function GovPageShell({
  maxWidth = "4xl",
  mainClassName = "",
  showOpportunities = true,
  authOpen = false,
  onAuthClose,
  authRedirect,
  children,
}) {
  const widthClass = MAX_WIDTH_CLASS[maxWidth] || MAX_WIDTH_CLASS["4xl"]

  return (
    <div className={APP_PAGE}>
      <FilmGrain />
      <AppBarDashboard showOpportunities={showOpportunities} />
      <main
        className={`relative z-[1] mx-auto ${widthClass} px-4 py-10 sm:px-6 ${mainClassName}`.trim()}
      >
        {children}
      </main>
      {authRedirect ? (
        <AuthModal isOpen={authOpen} onClose={onAuthClose} redirectUrl={authRedirect} />
      ) : null}
    </div>
  )
}
