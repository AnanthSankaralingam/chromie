import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { refreshGovAutomationParamsForProfile } from "@/lib/gov-automation-sync"
import {
  findPastRfpPdf,
  getGovProfileForUser,
  GOV_PROFILE_RFP_BUCKET,
  normalizePastRfpPdfs,
  requireGovProfileServiceClient,
} from "@/lib/gov-profiles"

export const GET = withAuth(async ({ supabase, user, params }) => {
  try {
    const { id: fileId } = await params
    const govProfile = await getGovProfileForUser(supabase, user.id)
    if (!govProfile) {
      return NextResponse.json({ error: "No gov profile linked" }, { status: 403 })
    }

    const pdf = findPastRfpPdf(govProfile.past_rfps, fileId)
    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }

    let service
    try {
      service = requireGovProfileServiceClient()
    } catch (serviceError) {
      console.error("[gov-profile/rfps GET] service client:", serviceError)
      return NextResponse.json({ error: serviceError.message }, { status: 500 })
    }

    const { data, error } = await service.storage
      .from(GOV_PROFILE_RFP_BUCKET)
      .createSignedUrl(pdf.storage_path, 60 * 10)

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || "Failed to create download URL" }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl, pdf })
  } catch (err) {
    console.error("[gov-profile/rfps GET]", err)
    return NextResponse.json({ error: err.message || "Download failed" }, { status: 500 })
  }
})

export const DELETE = withAuth(async ({ supabase, user, params }) => {
  try {
    const { id: fileId } = await params
    const govProfile = await getGovProfileForUser(supabase, user.id)
    if (!govProfile) {
      return NextResponse.json({ error: "No gov profile linked" }, { status: 403 })
    }

    const pdf = findPastRfpPdf(govProfile.past_rfps, fileId)
    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }

    let service
    try {
      service = requireGovProfileServiceClient()
    } catch (serviceError) {
      console.error("[gov-profile/rfps DELETE] service client:", serviceError)
      return NextResponse.json({ error: serviceError.message }, { status: 500 })
    }

    const { error: storageError } = await service.storage
      .from(GOV_PROFILE_RFP_BUCKET)
      .remove([pdf.storage_path])

    if (storageError) {
      console.error("[gov-profile/rfps DELETE] storage:", storageError)
      return NextResponse.json({ error: storageError.message }, { status: 500 })
    }

    const pastRfps = normalizePastRfpPdfs(govProfile.past_rfps).filter((row) => row.id !== fileId)
    const { data, error } = await service
      .from("gov_profiles")
      .update({ past_rfps: pastRfps })
      .eq("id", govProfile.id)
      .select("past_rfps")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      await refreshGovAutomationParamsForProfile({
        supabase,
        govProfile: { ...govProfile, past_rfps: data?.past_rfps ?? pastRfps },
        userId: user.id,
      })
    } catch (syncError) {
      console.error("[gov-profile/rfps DELETE] automation sync:", syncError)
    }

    console.log("[gov-profile/rfps DELETE] removed", pdf.storage_path)
    return NextResponse.json({ ok: true, past_rfps: data?.past_rfps ?? pastRfps })
  } catch (err) {
    console.error("[gov-profile/rfps DELETE]", err)
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 500 })
  }
})
