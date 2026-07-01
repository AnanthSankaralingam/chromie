import { terminateBrowserbaseSession } from "@/lib/browserbase"
import { createServiceClient } from "@/lib/supabase/service"

/**
 * Mark a run cancelled and tear down Browserbase. Lambda exits when the browser disconnects.
 */
export async function stopWorkflowRun(run) {
  const service = createServiceClient()
  if (!service) {
    throw new Error("Server cannot update runs (missing SUPABASE_SERVICE_ROLE_KEY)")
  }

  const now = new Date().toISOString()

  const { data: updated, error } = await service
    .from("workflow_runs")
    .update({
      cancel_requested_at: now,
      status: "cancelled",
      finished_at: now,
      success: false,
      error_message: "Stopped by user",
    })
    .eq("id", run.id)
    .eq("status", "running")
    .select("id")
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!updated) {
    const { data: current } = await service
      .from("workflow_runs")
      .select("status")
      .eq("id", run.id)
      .maybeSingle()
    if (current?.status === "cancelled") {
      return { alreadyStopped: true }
    }
    throw new Error("Run is not active")
  }

  if (run.browserbase_session_id) {
    try {
      await terminateBrowserbaseSession(run.browserbase_session_id)
    } catch (err) {
      console.error("[workflow-run-stop] Browserbase terminate:", err)
      // Run is already marked cancelled; browser may already be gone.
    }
  }

  return { ok: true }
}
