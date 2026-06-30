import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import {
  ensureHospitalityAutomation,
  getHospitalityProfileForUser,
} from "@/lib/hospitality"
import { createServiceClient } from "@/lib/supabase/service"
import { invokeWorkflowLambda } from "@/lib/workflow-lambda"

export const POST = withAuth(async ({ user }) => {
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

    const automation = await ensureHospitalityAutomation({
      service,
      user,
      hospitalityProfile,
    })

    await invokeWorkflowLambda({
      automation_id: automation.id,
      dry_tools: true,
    })

    return NextResponse.json({
      ok: true,
      automation_id: automation.id,
      message: "eviivo data pull started on Lambda. Results appear here after the run completes.",
    })
  } catch (err) {
    console.error("[hospitality/run POST]", err)
    return NextResponse.json(
      { error: err.message || "Failed to start hospitality automation." },
      { status: 500 },
    )
  }
})
