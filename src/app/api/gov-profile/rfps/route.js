import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import {
  buildRfpStoragePath,
  getGovProfileForUser,
  GOV_PROFILE_RFP_BUCKET,
  GOV_PROFILE_RFP_MAX_BYTES,
  normalizePastRfpPdfs,
} from "@/lib/gov-profiles"

export const POST = withAuth(async ({ request, supabase, user }) => {
  try {
    const govProfile = await getGovProfileForUser(supabase, user.id)
    if (!govProfile) {
      return NextResponse.json({ error: "No gov profile linked" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file")
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 })
    }

    const filename = file.name || "document.pdf"
    if (!filename.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 })
    }
    if (buffer.length > GOV_PROFILE_RFP_MAX_BYTES) {
      return NextResponse.json({ error: "PDF must be 15 MB or smaller" }, { status: 400 })
    }

    const fileId = randomUUID()
    const storagePath = buildRfpStoragePath(govProfile.id, fileId)
    const entry = {
      id: fileId,
      filename,
      storage_path: storagePath,
      size_bytes: buffer.length,
      uploaded_at: new Date().toISOString(),
    }

    const { error: uploadError } = await supabase.storage
      .from(GOV_PROFILE_RFP_BUCKET)
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (uploadError) {
      console.error("[gov-profile/rfps POST] storage upload:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const pastRfps = [...normalizePastRfpPdfs(govProfile.past_rfps), entry]
    const { data, error } = await supabase
      .from("gov_profiles")
      .update({ past_rfps: pastRfps })
      .eq("id", govProfile.id)
      .select("past_rfps")
      .single()

    if (error) {
      await supabase.storage.from(GOV_PROFILE_RFP_BUCKET).remove([storagePath])
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[gov-profile/rfps POST] uploaded", storagePath, buffer.length, "bytes")
    return NextResponse.json({ pdf: entry, past_rfps: data?.past_rfps ?? pastRfps })
  } catch (err) {
    console.error("[gov-profile/rfps POST]", err)
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 })
  }
})
