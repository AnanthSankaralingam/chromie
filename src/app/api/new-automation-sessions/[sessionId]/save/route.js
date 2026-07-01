import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { companyDomainFromEmail } from "@/lib/gov/gov-domain"
import {
  NEW_AUTOMATION_SCENARIO_ID,
  ensureProfileBrowserbaseContextId,
} from "@/lib/new-automation/recording-context"
import { createServiceClient } from "@/lib/supabase/service"

const MAX_ITEMS = 500

function toArray(value) {
  return Array.isArray(value) ? value.slice(0, MAX_ITEMS) : []
}

export const POST = withAuth(async ({ request, supabase, user, params }) => {
  const { sessionId } = await params
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const description = String(body.description || "").trim().slice(0, 4000)
  const name =
    String(body.name || "").trim().slice(0, 200) ||
    (description ? description.slice(0, 80) : "Recorded automation")

  const activity = toArray(body.activity)
  const pagesVisited = toArray(body.pagesVisited)
  const logs = toArray(body.logs)
  const transcriptMeta =
    body.transcriptMeta && typeof body.transcriptMeta === "object"
      ? body.transcriptMeta
      : null

  // Company scope = corporate work-email domain, so teammates can access it.
  // Consumer providers (gmail.com, etc.) return null → stays private to creator.
  const companyId = companyDomainFromEmail(user.email)

  // Stamp the identity-level context (frozen on the profile) onto the row so the
  // runner uses it directly — never null, so it never falls back to the shared
  // per-scenario context. This is the same id the recording session used.
  let browserbaseContextId = null
  try {
    const service = createServiceClient()
    if (service) {
      const resolved = await ensureProfileBrowserbaseContextId(service, user)
      browserbaseContextId = resolved.contextId
    } else {
      console.warn("[new-automation-sessions/save] service client unavailable; no persisted context")
      browserbaseContextId = String(body.browserbaseContextId || "").trim() || null
    }
  } catch (contextErr) {
    console.warn("[new-automation-sessions/save] context resolve failed", contextErr)
    browserbaseContextId = String(body.browserbaseContextId || "").trim() || null
  }

  // Everything the recorder captured lives in `params` to keep the table lean;
  // only `company_id` and `browserbase_context_id` need to be real columns.
  const { data, error } = await supabase
    .from("automations")
    .insert({
      user_id: user.id,
      company_id: companyId,
      browserbase_context_id: browserbaseContextId,
      name,
      scenario_id: NEW_AUTOMATION_SCENARIO_ID,
      params: {
        source: "new_automation_page",
        description,
        browserbase_session_id: sessionId,
        pages_visited: pagesVisited,
        action_transcript: activity,
        recording_meta: transcriptMeta,
        logs,
      },
      enabled: false,
    })
    .select()
    .single()

  if (error) {
    console.error("[new-automation-sessions/save]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ automation: data, companyId, browserbaseContextId })
})
