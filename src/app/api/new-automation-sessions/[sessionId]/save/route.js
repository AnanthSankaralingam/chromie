import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { companyDomainFromEmail } from "@/lib/gov/gov-domain"

/** Scenario id for automations captured via the self-serve /new recorder. */
const NEW_AUTOMATION_SCENARIO_ID = "custom_recorded_automation"
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

  // Everything the recorder captured lives in `params` to keep the table lean;
  // only `company_id` needs to be a real column (for the RLS policy).
  const { data, error } = await supabase
    .from("automations")
    .insert({
      user_id: user.id,
      company_id: companyId,
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

  return NextResponse.json({ automation: data, companyId })
})
