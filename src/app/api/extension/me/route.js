import { createClient } from "@/lib/supabase/server"
import { getUserLimits } from "@/lib/limit-checker"
import { extensionJson, extensionOptions } from "@/lib/api/extension-api"

export function OPTIONS(request) {
  return extensionOptions(request)
}

export async function GET(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return extensionJson(request, { error: "Unauthorized" }, { status: 401 })
  }

  const [{ data: profile }, { data: billing }, { data: purchases }, limits] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("billing")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("purchases").select("*").eq("user_id", user.id).order("purchased_at", { ascending: false }),
    getUserLimits(user.id, supabase),
  ])

  return extensionJson(request, {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || profile?.name || null,
    },
    profile: profile || null,
    billing: billing || null,
    purchases: purchases || [],
    limits,
    features: {
      projectSync: true,
      extensionMetadata: true,
      serverAi: false,
    },
  })
}
