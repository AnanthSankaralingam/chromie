import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { PLAN_LIMITS } from '@/lib/constants'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function upsertBillingForUser(userId, payload) {
  const { data: existing, error: selectError } = await supabase
    .from('billing')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (selectError) {
    console.error('Error selecting billing row:', selectError)
    throw selectError
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('billing')
      .update(payload)
      .eq('id', existing.id)
    if (updateError) {
      console.error('Error updating billing row:', updateError)
      throw updateError
    }
    return
  }

  const { error: insertError } = await supabase.from('billing').insert({
    user_id: userId,
    ...payload,
  })
  if (insertError) {
    console.error('Error inserting billing row:', insertError)
    throw insertError
  }
}

const PLAN_BY_PRICE_ID = {
  // Legacy known IDs
  price_1SFlPyCOAm3tJxqm3GX5der2: 'pro',
  price_1THBZSCOAm3tJxqmb7D3A6u0: 'builder',
  // Preferred env-driven IDs
  ...(process.env.STRIPE_PRICE_PRO ? { [process.env.STRIPE_PRICE_PRO]: 'pro' } : {}),
  ...(process.env.STRIPE_PRICE_BUILDER ? { [process.env.STRIPE_PRICE_BUILDER]: 'builder' } : {}),
}

function planFromPriceId(priceId) {
  return PLAN_BY_PRICE_ID[priceId] || 'pro'
}

/**
 * Map Stripe subscription state to ledger + billing rows.
 * Cancel at period end: Stripe keeps status "active" until period end; we mark purchase canceled for visibility.
 */
function subscriptionStateForDb(subscription) {
  const stripeStatus = subscription.status
  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end)
  const periodEndISO = new Date(subscription.current_period_end * 1000).toISOString()

  let purchaseStatus = 'active'
  let billingStatus = 'active'

  if (stripeStatus === 'active' && cancelAtPeriodEnd) {
    purchaseStatus = 'canceled'
    billingStatus = 'active'
  } else if (
    stripeStatus === 'canceled' ||
    stripeStatus === 'unpaid' ||
    stripeStatus === 'incomplete_expired'
  ) {
    purchaseStatus = 'canceled'
    billingStatus = 'canceled'
  } else if (stripeStatus === 'past_due') {
    purchaseStatus = 'past_due'
    billingStatus = 'past_due'
  } else if (stripeStatus !== 'active') {
    purchaseStatus = 'past_due'
    billingStatus = stripeStatus
  }

  return { purchaseStatus, billingStatus, periodEndISO }
}

export async function POST(request) {
  console.log('Webhook received')
  
  if (!stripe) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 })
  }
  
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  console.log('Signature header:', signature ? 'Present' : 'Missing')
  console.log('Webhook secret:', process.env.STRIPE_WEBHOOK_SECRET ? 'Present' : 'Missing')

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
    console.log('Event type:', event.type)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    console.error('Error details:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Processing checkout.session.completed')
        await handleCheckoutSessionCompleted(event.data.object)
        break
      
      case 'customer.subscription.created':
        console.log('Processing customer.subscription.created')
        await handleSubscriptionCreated(event.data.object)
        break
      
      case 'customer.subscription.updated':
        console.log('Processing customer.subscription.updated')
        await handleSubscriptionUpdated(event.data.object)
        break
      
      case 'customer.subscription.deleted':
        console.log('Processing customer.subscription.deleted')
        await handleSubscriptionDeleted(event.data.object)
        break
      
      case 'invoice.payment_succeeded':
        console.log('Processing invoice.payment_succeeded')
        await handlePaymentSucceeded(event.data.object)
        break
      
      case 'invoice.payment_failed':
        console.log('Processing invoice.payment_failed')
        await handlePaymentFailed(event.data.object)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    console.log('Webhook processed successfully')
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session) {
  console.log('Checkout session completed:', session.id)

  if (session.mode === 'payment') {
    console.log('Ignoring deprecated one-time checkout session:', session.id)
    return
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id)
  const priceId = subscription.items.data[0].price.id
  const plan = planFromPriceId(priceId)
  
  const customer = await stripe.customers.retrieve(subscription.customer)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', customer.email)
    .single()
  
  if (!profile) {
    console.error('User not found for subscription')
    return
  }
  
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.pro

  // Create purchase record for subscription
  const { error: purchaseInsertError } = await supabase
    .from('purchases')
    .insert({
      user_id: profile.id,
      stripe_subscription_id: subscription.id,
      stripe_payment_intent_id: null,
      plan,
      purchase_type: 'subscription',
      status: 'active',
      credits_purchased: limits.monthly_credits,
      expires_at: new Date(subscription.current_period_end * 1000).toISOString()
    })
  if (purchaseInsertError) {
    console.error('Error creating subscription purchase record:', purchaseInsertError)
    throw purchaseInsertError
  }
  
  // Reset usage for the user's billing cycle anchor.
  const cycleAnchorISO = new Date(
    (subscription.current_period_start || Math.floor(Date.now() / 1000)) * 1000
  ).toISOString()
  
  const { error: tokenUsageUpsertError } = await supabase
    .from('token_usage')
    .upsert(
      {
        user_id: profile.id,
        total_credits: 0,
        total_tokens: 0,
        browser_minutes: 0,
        extension_proxy_tokens: 0,
        monthly_reset: cycleAnchorISO,
        extension_proxy_monthly_reset: cycleAnchorISO,
      },
      { onConflict: 'user_id' }
    )
  if (tokenUsageUpsertError) {
    console.error('Error upserting token_usage on subscription:', tokenUsageUpsertError)
    throw tokenUsageUpsertError
  }
  
  // Update billing table for backwards compatibility
  await upsertBillingForUser(profile.id, {
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    plan,
    status: 'active',
    valid_until: new Date(subscription.current_period_end * 1000).toISOString()
  })
  
  console.log(`${plan} subscription created for user:`, profile.id)
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id)
  const { purchaseStatus, billingStatus, periodEndISO } =
    subscriptionStateForDb(subscription)

  const { error: purchaseUpdateError } = await supabase
    .from('purchases')
    .update({
      expires_at: periodEndISO,
      status: purchaseStatus,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (purchaseUpdateError) {
    console.error('Error updating purchases on subscription update:', purchaseUpdateError)
    throw purchaseUpdateError
  }

  const { error: billingUpdateError } = await supabase
    .from('billing')
    .update({
      status: billingStatus,
      valid_until: periodEndISO,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (billingUpdateError) {
    console.error('Error updating billing on subscription update:', billingUpdateError)
    throw billingUpdateError
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id)
  
  // Mark subscription as canceled
  await supabase
    .from('purchases')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id)
  
  // Update billing table for backwards compatibility
  await supabase
    .from('billing')
    .update({
      status: 'canceled',
      valid_until: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)
  
  console.log('Subscription canceled:', subscription.id)
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded for invoice:', invoice.id)
  
  // On successful payment, reset usage for the new month
  if (!invoice.subscription) return
  
  const { data: purchase } = await supabase
    .from('purchases')
    .select('user_id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single()
  
  if (purchase) {
    const linePeriodStart = invoice?.lines?.data?.[0]?.period?.start
    const cycleAnchorISO = linePeriodStart
      ? new Date(linePeriodStart * 1000).toISOString()
      : new Date().toISOString()
    
    await supabase
      .from('token_usage')
      .update({
        total_credits: 0,
        total_tokens: 0,
        browser_minutes: 0,
        extension_proxy_tokens: 0,
        monthly_reset: cycleAnchorISO,
        extension_proxy_monthly_reset: cycleAnchorISO,
      })
      .eq('user_id', purchase.user_id)
    
    // Update billing table
    await supabase
      .from('billing')
      .update({
        status: 'active',
        valid_until: invoice?.lines?.data?.[0]?.period?.end
          ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
          : new Date().toISOString()
      })
      .eq('stripe_subscription_id', invoice.subscription)
    
    console.log('Reset usage for subscription renewal:', purchase.user_id)
  }
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed for invoice:', invoice.id)
  
  if (!invoice.subscription) return
  
  // Update billing table
  await supabase
    .from('billing')
    .update({
      status: 'past_due'
    })
    .eq('stripe_subscription_id', invoice.subscription)
  
  console.log('Successfully updated payment status to past_due')
}