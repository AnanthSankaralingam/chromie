import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import DashboardPage from "@/components/pages/dashboard-page"

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

  return <DashboardPage />
}
