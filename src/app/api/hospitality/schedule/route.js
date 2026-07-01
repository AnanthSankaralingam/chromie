import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import {
  resolveScheduleFieldsFromBody,
  syncAndPersistAutomationSchedule,
} from "@/lib/workflow/automation-schedule-sync"
import {
  ensureHospitalityAutomation,
  getHospitalityProfileForUser,
} from "@/lib/hospitality"
import { createServiceClient } from "@/lib/supabase/service"

export const PATCH = withAuth(async ({ request, user }) => {
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
      return NextResponse.json({ error: "Set up a hospitality profile first." }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const automation = await ensureHospitalityAutomation({
      service,
      user,
      hospitalityProfile,
    })

    let scheduleFields
    try {
      scheduleFields = resolveScheduleFieldsFromBody(body, automation)
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }

    const { data, error } = await service
      .from("automations")
      .update({
        ...scheduleFields,
        enabled: body.enabled !== false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", automation.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const synced = await syncAndPersistAutomationSchedule(service, data)
    return NextResponse.json({ automation: synced })
  } catch (err) {
    console.error("[hospitality/schedule PATCH]", err)
    return NextResponse.json(
      { error: err.message || "Failed to update hospitality schedule." },
      { status: 500 },
    )
  }
})
