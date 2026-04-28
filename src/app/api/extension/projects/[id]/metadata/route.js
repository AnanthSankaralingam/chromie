import { createClient } from "@/lib/supabase/server"
import { extensionJson, extensionOptions } from "@/lib/api/extension-api"
import { normalizeRunAt, normalizeStringList } from "@/lib/api/extension-projects"

export function OPTIONS(request) {
  return extensionOptions(request)
}

async function getAuthenticatedClient(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { response: extensionJson(request, { error: "Unauthorized" }, { status: 401 }) }
  }

  return { supabase, user }
}

async function verifyProjectOwner(supabase, userId, projectId) {
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle()

  return Boolean(project)
}

export async function GET(request, { params }) {
  const auth = await getAuthenticatedClient(request)
  if (auth.response) return auth.response
  const { supabase, user } = auth
  const { id } = await params

  if (!(await verifyProjectOwner(supabase, user.id, id))) {
    return extensionJson(request, { error: "Project not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("extension_project_metadata")
    .select("*")
    .eq("project_id", id)
    .maybeSingle()

  if (error) {
    return extensionJson(request, { error: error.message }, { status: 500 })
  }

  return extensionJson(request, { metadata: data || null })
}

export async function PUT(request, { params }) {
  const auth = await getAuthenticatedClient(request)
  if (auth.response) return auth.response
  const { supabase, user } = auth
  const { id } = await params

  if (!(await verifyProjectOwner(supabase, user.id, id))) {
    return extensionJson(request, { error: "Project not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const now = new Date().toISOString()
  const metadata = {
    project_id: id,
    user_id: user.id,
    enabled: body.enabled !== false,
    match_patterns: normalizeStringList(body.matchPatterns || body.match_patterns, ["*://*/*"]),
    exclude_patterns: normalizeStringList(body.excludePatterns || body.exclude_patterns, []),
    run_at: normalizeRunAt(body.runAt || body.run_at),
    version: body.version || "1.0",
    author: body.author || "user",
    source: body.source || "chromie-extension",
    ai_conversation: Array.isArray(body.aiConversation || body.ai_conversation)
      ? body.aiConversation || body.ai_conversation
      : [],
    installed_at: body.installedAt || body.installed_at || now,
    last_synced_at: now,
    updated_at: body.updatedAt ? new Date(body.updatedAt).toISOString() : now,
  }

  const { data, error } = await supabase
    .from("extension_project_metadata")
    .upsert(metadata, { onConflict: "project_id" })
    .select()
    .single()

  if (error) {
    return extensionJson(request, { error: error.message }, { status: 500 })
  }

  return extensionJson(request, { success: true, metadata: data })
}
