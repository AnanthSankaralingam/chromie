import { CARD_CLASS } from "@/components/ui/app-dashboard-theme"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

function userInitials(user) {
  const fromName = user?.user_metadata?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
  return fromName || user?.email?.[0]?.toUpperCase() || "U"
}

export default function UserProfileCard({ user }) {
  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name

  return (
    <Card className={CARD_CLASS}>
      <CardContent className="flex items-center gap-4 px-4 py-4">
        <Avatar className="h-11 w-11 border border-white/15">
          <AvatarImage src={user?.user_metadata?.picture} alt={displayName || user?.email} />
          <AvatarFallback className="bg-white text-sm font-semibold text-black">
            {userInitials(user)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          {displayName ? <p className="truncate font-medium text-white">{displayName}</p> : null}
          <p className={`truncate text-sm text-zinc-400 ${displayName ? "mt-0.5" : ""}`}>
            {user?.email}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
