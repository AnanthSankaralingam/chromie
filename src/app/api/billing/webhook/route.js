import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { PLAN_LIMITS } from '@/lib/constants'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
  
  const isOneTime = session.mode === 'payment' // vs 'subscription'
  const customer = session.customer
  const paymentIntent = session.payment_intent
  
  // Get line items to determine plan
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
  const priceId = lineItems.data[0]?.price?.id
  
  // Map Stripe price IDs to plans (get actual IDs from Stripe dashboard)
  const PRICE_ID_MAP = {
    'price_XXXSTARTER': 'starter',  // Replace with actual price IDs
    'price_XXXPRO': 'pro',
    'price_XXXLEGEND': 'legend'
  }
  
  const plan = PRICE_ID_MAP[priceId] || 'starter'
  
  if (isOneTime) {
    await handleOneTimePurchase(customer, plan, paymentIntent)
  }
  // Subscriptions handled by subscription.created event
}

async function handleOneTimePurchase(stripeCustomerId, plan, paymentIntentId) {
  // Find user
  const customer = await stripe.customers.retrieve(stripeCustomerId)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', customer.email)
    .single()
  
  if (!profile) {
    console.error('User not found for email:', customer.email)
    return
  }
  
  const limits = PLAN_LIMITS[plan]
  
  // Create purchase record (ledger)
  const { error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      user_id: profile.id,
      stripe_payment_intent_id: paymentIntentId,
      plan,
      purchase_type: 'one_time',
      status: 'active',
      tokens_purchased: limits.monthly_tokens,
      browser_minutes_purchased: limits.monthly_browser_minutes,
      projects_purchased: limits.max_projects,
      expires_at: null // One-time purchases never expire
    })
  
  if (purchaseError) {
    console.error('Error creating purchase record:', purchaseError)
    throw purchaseError
  }
  
  // Update billing table for backwards compatibility
  await supabase
    .from('billing')
    .upsert({
      user_id: profile.id,
      stripe_customer_id: stripeCustomerId,
      plan,
      status: 'active',
      purchase_count: supabase.raw('COALESCE(purchase_count, 0) + 1'),
      has_one_time_purchase: true
    })
  
  console.log('One-time purchase recorded:', plan, 'for user:', profile.id)
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id)
  
  const priceId = subscription.items.data[0].price.id
  const plan = 'legend' // Only Legend is subscription
  
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
  
  const limits = PLAN_LIMITS.legend
  
  // Create purchase record for subscription
  await supabase
    .from('purchases')
    .insert({
      user_id: profile.id,
      stripe_subscription_id: subscription.id,
      stripe_payment_intent_id: null,
      plan: 'legend',
      purchase_type: 'subscription',
      status: 'active',
      tokens_purchased: limits.monthly_tokens,
      browser_minutes_purchased: limits.monthly_browser_minutes,
      projects_purchased: limits.max_projects,
      expires_at: new Date(subscription.current_period_end * 1000).toISOString()
    })
  
  // Reset token usage for new billing cycle
  const firstDayOfMonth = new Date()
  firstDayOfMonth.setDate(1)
  firstDayOfMonth.setHours(0, 0, 0, 0)
  
  await supabase
    .from('token_usage')
    .upsert({
      user_id: profile.id,
      total_tokens: 0,
      browser_minutes: 0,
      monthly_reset: firstDayOfMonth.toISOString()
    })
  
  // Update billing table for backwards compatibility
  await supabase
    .from('billing')
    .upsert({
      user_id: profile.id,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      plan: 'legend',
      status: 'active',
      valid_until: new Date(subscription.current_period_end * 1000).toISOString()
    })
  
  console.log('Legend subscription created for user:', profile.id)
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id)
  
  // Update expires_at when subscription renews
  await supabase
    .from('purchases')
    .update({
      expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      status: subscription.status === 'active' ? 'active' : 'past_due'
    })
    .eq('stripe_subscription_id', subscription.id)
  
  // Update billing table for backwards compatibility
  await supabase
    .from('billing')
    .update({
      status: subscription.status,
      valid_until: new Date(subscription.current_period_end * 1000).toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)
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
    const firstDayOfMonth = new Date()
    firstDayOfMonth.setDate(1)
    firstDayOfMonth.setHours(0, 0, 0, 0)
    
    await supabase
      .from('token_usage')
      .update({
        total_tokens: 0,
        browser_minutes: 0,
        monthly_reset: firstDayOfMonth.toISOString()
      })
      .eq('user_id', purchase.user_id)
    
    // Update billing table
    await supabase
      .from('billing')
      .update({
        status: 'active',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('stripe_subscription_id', invoice.subscription)
    
    console.log('Reset usage for Legend renewal:', purchase.user_id)
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