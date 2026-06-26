import { BTN_OUTLINE, BTN_PRIMARY, CARD_CLASS } from "@/components/ui/app-dashboard-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function GovSignInGate({ message, onSignIn, className = "mt-8" }) {
  return (
    <Card className={`${className} ${CARD_CLASS}`}>
      <CardContent className="px-5 py-6">
        <p className="text-sm text-zinc-400">{message}</p>
        <Button className={`mt-5 ${BTN_PRIMARY}`} onClick={onSignIn}>
          Sign in to continue
        </Button>
      </CardContent>
    </Card>
  )
}

export function GovProfileRequiredGate({
  title = "Create your company profile first",
  description,
  onSetup,
  className = "mt-8",
}) {
  return (
    <Card className={`${className} ${CARD_CLASS}`}>
      <CardHeader>
        <CardTitle className="text-base font-bold text-white">{title}</CardTitle>
        <CardDescription className="text-zinc-400">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className={BTN_PRIMARY} onClick={onSetup}>
          Set up company profile
        </Button>
      </CardContent>
    </Card>
  )
}

export function GovForbiddenState({ title, description, actionLabel, onAction }) {
  return (
    <div className="py-10 text-center sm:py-20">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-3 text-sm text-zinc-400">{description}</p>
      <Button className={`mt-6 ${BTN_OUTLINE}`} onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  )
}
