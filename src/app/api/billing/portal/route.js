import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

export async function GET() {
  if (!stripe) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 })
  }

  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get the user's billing information to find their Stripe customer ID
  const { data: billing, error: billingError } = await supabase
    .from('billing')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (billingError || !billing?.stripe_customer_id) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
  }

  // Create a Stripe customer portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/profile`,
  })

  // Redirect to the customer portal
  return NextResponse.redirect(session.url)
} 