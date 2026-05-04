import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { subscriptionPurchaseEntitled } from "@/lib/subscription-entitlement"

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

function isResourceMissingError(err) {
  return (
    err?.code === "resource_missing" || err?.raw?.code === "resource_missing"
  )
}

/**
 * Customer must exist, not be deleted, and work with the current API key.
 * Deleted customers still return 200 from retrieve with { deleted: true }; portal then fails.
 */
async function customerUsableForPortal(customerId) {
  try {
    const c = await stripe.customers.retrieve(customerId)
    if (!c || c.deleted === true) return false
    return true
  } catch (err) {
    if (isResourceMissingError(err)) return false
    throw err
  }
}

function pickNewestUsableCustomer(customers) {
  if (!customers?.length) return null
  const active = customers.filter((c) => c && c.deleted !== true)
  if (!active.length) return null
  const sorted = active.sort((a, b) => b.created - a.created)
  return sorted[0].id
}

/**
 * Collect candidate cus_ ids from DB, verify each against Stripe, then fall back to
 * customers.list(email) in the current API key mode.
 */
async function resolveVerifiedStripeCustomerId(userId, email, supabase) {
  const candidates = []

  const { data: billingRows } = await supabase
    .from("billing")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })

  for (const row of billingRows || []) {
    if (row.stripe_customer_id) candidates.push(row.stripe_customer_id)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle()

  if (profile?.stripe_customer_id) {
    candidates.push(profile.stripe_customer_id)
  }

  const { data: purchases, error: purchasesError } = await supabase
    .from("purchases")
    .select(
      "stripe_subscription_id, status, expires_at, purchase_type, purchased_at"
    )
    .eq("user_id", userId)
    .eq("purchase_type", "subscription")
    .not("stripe_subscription_id", "is", null)
    .order("purchased_at", { ascending: false })

  if (purchasesError) {
    console.error("[billing/portal] purchases lookup:", purchasesError)
  } else {
    const now = new Date()
    const subId =
      purchases?.find((p) => subscriptionPurchaseEntitled(p, now))
        ?.stripe_subscription_id || purchases?.[0]?.stripe_subscription_id

    if (subId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subId)
        const c = sub.customer
        const id = typeof c === "string" ? c : c?.id
        if (id) candidates.push(id)
      } catch (err) {
        console.warn(
          "[billing/portal] subscription not in this Stripe mode or deleted:",
          subId,
          err.message
        )
      }
    }
  }

  const seen = new Set()
  for (const id of candidates) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    if (await customerUsableForPortal(id)) {
      return id
    }
    console.warn("[billing/portal] ignoring missing/deleted/wrong-mode customer id:", id)
  }

  if (email) {
    const { data: byEmail } = await stripe.customers.list({ email, limit: 20 })
    const best = pickNewestUsableCustomer(byEmail)
    if (best && (await customerUsableForPortal(best))) {
      console.log("[billing/portal] resolved customer via email list:", email)
      return best
    }
  }

  return null
}

export async function GET() {
  if (!stripe) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 })
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let customerId
  try {
    customerId = await resolveVerifiedStripeCustomerId(
      user.id,
      user.email,
      supabase
    )
  } catch (err) {
    console.error("[billing/portal] resolve customer:", err)
    return NextResponse.json(
      { error: "Could not verify billing with Stripe" },
      { status: 502 }
    )
  }

  if (!customerId) {
    return NextResponse.json(
      {
        error:
          "No Stripe customer found for this account. Check that STRIPE_SECRET_KEY matches the mode (test vs live) used at checkout.",
      },
      { status: 404 }
    )
  }

  try {
    console.log("[billing/portal] creating portal session for customer:", customerId)
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/profile`,
    })
    return NextResponse.redirect(session.url)
  } catch (err) {
    console.error("[billing/portal] billingPortal.sessions.create:", err)
    return NextResponse.json(
      { error: err.message || "Stripe portal session failed" },
      { status: 502 }
    )
  }
}
