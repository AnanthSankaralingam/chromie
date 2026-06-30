import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import {
  ensureHospitalityAutomation,
  getHospitalityProfileForUser,
  loadHospitalityRuns,
  sanitizeHospitalityProfileInput,
  upsertHospitalityProfileForUser,
} from "@/lib/hospitality"
import { createServiceClient } from "@/lib/supabase/service"
import { EVIIVO_DATA_PULL_SCENARIO_ID } from "@/lib/workflow-automations"

async function loadAutomation(service, userId) {
  const { data, error } = await service
    .from("automations")
    .select("*")
    .eq("user_id", userId)
    .eq("scenario_id", EVIIVO_DATA_PULL_SCENARIO_ID)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data || null
}

export const GET = withAuth(async ({ user }) => {
  try {
    const service = createServiceClient()
    if (!service) {
      return NextResponse.json(
        { error: "Server is missing Supabase service credentials." },
        { status: 500 },
      )
    }

    const hospitalityProfile = await getHospitalityProfileForUser(service, user.id)
    if (!hospitalityProfile) {
      return NextResponse.json({
        status: "needs_setup",
        hospitality_profile: null,
        automation: null,
        runs: [],
      })
    }

    const [automation, runs] = await Promise.all([
      loadAutomation(service, user.id),
      loadHospitalityRuns(service, hospitalityProfile.id, 20),
    ])

    return NextResponse.json({
      status: "ready",
      hospitality_profile: hospitalityProfile,
      automation,
      runs,
    })
  } catch (err) {
    console.error("[hospitality GET]", err)
    return NextResponse.json(
      { error: err.message || "Failed to load hospitality dashboard." },
      { status: 500 },
    )
  }
})

export const POST = withAuth(async ({ request, user }) => {
  try {
    const service = createServiceClient()
    if (!service) {
      return NextResponse.json(
        { error: "Server is missing Supabase service credentials." },
        { status: 500 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const input = sanitizeHospitalityProfileInput(body)
    const hospitalityProfile = await upsertHospitalityProfileForUser({
      service,
      user,
      input,
    })
    const automation = await ensureHospitalityAutomation({
      service,
      user,
      hospitalityProfile,
    })
    const runs = await loadHospitalityRuns(service, hospitalityProfile.id, 20)

    return NextResponse.json({
      status: "ready",
      hospitality_profile: hospitalityProfile,
      automation,
      runs,
    })
  } catch (err) {
    console.error("[hospitality POST]", err)
    return NextResponse.json(
      { error: err.message || "Failed to save hospitality profile." },
      { status: 500 },
    )
  }
})
