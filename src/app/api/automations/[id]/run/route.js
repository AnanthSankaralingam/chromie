import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { invokeWorkflowLambda } from "@/lib/workflow/workflow-lambda"

export const POST = withAuth(async ({ supabase, user, params }) => {
  const { id } = await params

  const { data: automation, error } = await supabase
    .from("automations")
    .select("id, enabled, scenario_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !automation) {
    return NextResponse.json({ error: "Automation not found" }, { status: 404 })
  }
  if (!automation.enabled) {
    return NextResponse.json({ error: "Automation is disabled" }, { status: 400 })
  }

  try {
    await invokeWorkflowLambda({ automation_id: id })
  } catch (err) {
    console.error("[automations/run]", err)
    return NextResponse.json(
      { error: err.message || "Failed to start workflow" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: "Workflow started on Lambda. Runs usually take 1–5 minutes; refresh or wait for the live session.",
    automation_id: id,
  })
})
