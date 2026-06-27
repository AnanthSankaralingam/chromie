import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { refreshGovAutomationParamsForProfile } from "@/lib/gov-automation-sync"
import { bootstrapGovMonitor } from "@/lib/gov-monitor-bootstrap"
import { getGovProfileForUser, sanitizeGovProfilePatch } from "@/lib/gov-profiles"
import { createServiceClient } from "@/lib/supabase/service"

export const GET = withAuth(async ({ supabase, user }) => {
  try {
    const govProfile = await getGovProfileForUser(supabase, user.id)
    if (!govProfile) {
      return NextResponse.json({ error: "No gov profile linked" }, { status: 403 })
    }
    return NextResponse.json({ gov_profile: govProfile })
  } catch (err) {
    console.error("[gov-profile GET]", err)
    return NextResponse.json({ error: err.message || "Failed to load profile" }, { status: 500 })
  }
})

export const PATCH = withAuth(async ({ request, supabase, user }) => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gov_profile_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }
    if (!profile?.gov_profile_id) {
      return NextResponse.json({ error: "No gov profile linked" }, { status: 403 })
    }

    const body = await request.json()
    const patch = sanitizeGovProfilePatch(body)
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("gov_profiles")
      .update(patch)
      .eq("id", profile.gov_profile_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      await refreshGovAutomationParamsForProfile({ supabase, govProfile: data, userId: user.id })
    } catch (syncError) {
      console.error("[gov-profile PATCH] automation sync:", syncError)
    }

    let monitor = null
    const service = createServiceClient()
    if (service) {
      try {
        monitor = await bootstrapGovMonitor({
          supabase,
          service,
          user,
          govProfile: data,
          mode: "manual",
        })
        console.log("[gov-profile PATCH] monitor invoke", profile.gov_profile_id, {
          invoked: monitor.invoked,
          skipped_reason: monitor.skipped_reason,
        })
      } catch (bootstrapErr) {
        console.error("[gov-profile PATCH] monitor invoke failed", bootstrapErr)
        monitor = {
          error: bootstrapErr.message || "Failed to start contract search.",
        }
      }
    }

    console.log("[gov-profile PATCH] updated", profile.gov_profile_id, Object.keys(patch))
    return NextResponse.json({ gov_profile: data, monitor })
  } catch (err) {
    console.error("[gov-profile PATCH]", err)
    return NextResponse.json({ error: err.message || "Failed to update profile" }, { status: 500 })
  }
})
