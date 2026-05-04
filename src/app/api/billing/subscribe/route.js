import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

const PRICE_BY_PLAN = {
  pro: process.env.STRIPE_PRICE_PRO,
  builder: process.env.STRIPE_PRICE_BUILDER,
}

function appBaseUrl(request) {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  return request.nextUrl.origin
}

export async function GET(request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan = request.nextUrl.searchParams.get('plan')
  if (plan !== 'pro' && plan !== 'builder') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const priceId = PRICE_BY_PLAN[plan]
  if (!priceId) {
    console.error('[billing/subscribe] Missing STRIPE_PRICE_PRO or STRIPE_PRICE_BUILDER for plan:', plan)
    return NextResponse.json({ error: 'Subscription pricing not configured' }, { status: 503 })
  }

  const base = appBaseUrl(request)
  const successUrl = `${base}/profile`
  const cancelUrl = `${base}/`

  const [{ data: profile }, { data: billingRow }] = await Promise.all([
    supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle(),
    supabase
      .from('billing')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const existingCustomerId =
    profile?.stripe_customer_id || billingRow?.stripe_customer_id || undefined

  const sessionParams = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan },
    subscription_data: {
      metadata: { user_id: user.id, plan },
    },
  }

  if (existingCustomerId) {
    sessionParams.customer = existingCustomerId
  } else {
    sessionParams.customer_email = user.email
  }

  const session = await stripe.checkout.sessions.create(sessionParams)
  return NextResponse.redirect(session.url, 303)
}
