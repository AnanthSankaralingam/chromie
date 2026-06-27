import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import emailService from "@/lib/services/email-service"
import { createServiceClient } from "@/lib/supabase/service"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase()
}

function isAllowedRedirect(redirectTo, requestOrigin) {
  try {
    const target = new URL(redirectTo)
    const origin = new URL(requestOrigin).origin
    return target.origin === origin
  } catch {
    return false
  }
}

async function generateMagicLink(service, email, redirectTo) {
  const attempt = (type) =>
    service.auth.admin.generateLink({
      type,
      email,
      options: { redirectTo },
    })

  let result = await attempt("magiclink")
  if (!result.error) {
    return result
  }

  const message = result.error.message?.toLowerCase() || ""
  if (message.includes("not found") || message.includes("user not found")) {
    result = await attempt("signup")
  }

  return result
}

async function sendSupabaseMagicLink(email, redirectTo) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return { success: false, error: "Supabase auth is not configured." }
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  })

  if (error) {
    console.error("[auth/magic-link] Supabase OTP fallback failed:", error)
    return { success: false, error: error.message }
  }

  console.log("[auth/magic-link] Supabase OTP fallback sent", email)
  return { success: true, provider: "supabase" }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const email = normalizeEmail(body.email)
    const redirectTo = String(body.redirectTo || "").trim()

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    if (!redirectTo || !isAllowedRedirect(redirectTo, request.url)) {
      return NextResponse.json({ error: "Invalid redirect URL" }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn("[auth/magic-link] RESEND not configured, using Supabase OTP")
      const fallback = await sendSupabaseMagicLink(email, redirectTo)
      if (!fallback.success) {
        return NextResponse.json(
          { error: fallback.error || "Could not send sign-in email." },
          { status: 500 },
        )
      }
      return NextResponse.json({ success: true, provider: fallback.provider })
    }

    const service = createServiceClient()
    if (!service) {
      console.warn("[auth/magic-link] service client unavailable, using Supabase OTP")
      const fallback = await sendSupabaseMagicLink(email, redirectTo)
      if (!fallback.success) {
        return NextResponse.json(
          { error: fallback.error || "Could not send sign-in email." },
          { status: 500 },
        )
      }
      return NextResponse.json({ success: true, provider: fallback.provider })
    }

    const { data, error } = await generateMagicLink(service, email, redirectTo)
    if (error) {
      console.error("[auth/magic-link] generateLink failed, using Supabase OTP:", error)
      const fallback = await sendSupabaseMagicLink(email, redirectTo)
      if (!fallback.success) {
        return NextResponse.json({ error: "Could not create sign-in link." }, { status: 500 })
      }
      return NextResponse.json({ success: true, provider: fallback.provider })
    }

    const magicLinkUrl = data?.properties?.action_link
    if (!magicLinkUrl) {
      console.error("[auth/magic-link] missing action_link, using Supabase OTP")
      const fallback = await sendSupabaseMagicLink(email, redirectTo)
      if (!fallback.success) {
        return NextResponse.json({ error: "Could not create sign-in link." }, { status: 500 })
      }
      return NextResponse.json({ success: true, provider: fallback.provider })
    }

    const emailResult = await emailService.sendMagicLinkEmail(email, magicLinkUrl)
    if (!emailResult.success) {
      console.warn("[auth/magic-link] Resend failed, using Supabase OTP:", emailResult.error)
      const fallback = await sendSupabaseMagicLink(email, redirectTo)
      if (!fallback.success) {
        return NextResponse.json(
          { error: fallback.error || "Could not send sign-in email. Please try again." },
          { status: 503 },
        )
      }
      return NextResponse.json({ success: true, provider: fallback.provider })
    }

    return NextResponse.json({ success: true, provider: "resend" })
  } catch (error) {
    console.error("[auth/magic-link] unexpected error:", error)
    return NextResponse.json({ error: "Could not send sign-in email." }, { status: 500 })
  }
}
