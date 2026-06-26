import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { resolveGovHomePath } from "@/lib/gov-auth-redirect"

export const metadata = {
  title: "Dashboard",
  description: "Schedule and run Chromie browser workflows.",
}

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  redirect(await resolveGovHomePath(supabase, user.id))
}
