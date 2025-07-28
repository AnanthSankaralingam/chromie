import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session) {
  const { userId, plan } = session.metadata
  
  // Update user's billing status in Supabase
  const { error } = await supabase
    .from('billing')
    .upsert({
      user_id: userId,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      plan: plan,
      status: 'active',
      created_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    })

  if (error) {
    console.error('Error updating billing record:', error)
    throw error
  }
}

async function handleSubscriptionCreated(subscription) {
  const { userId, plan } = subscription.metadata
  
  const { error } = await supabase
    .from('billing')
    .upsert({
      user_id: userId,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      plan: plan,
      status: subscription.status,
      created_at: new Date().toISOString(),
      valid_until: new Date(subscription.current_period_end * 1000).toISOString()
    })

  if (error) {
    console.error('Error updating subscription record:', error)
    throw error
  }
}

async function handleSubscriptionUpdated(subscription) {
  const { error } = await supabase
    .from('billing')
    .update({
      status: subscription.status,
      valid_until: new Date(subscription.current_period_end * 1000).toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription:', error)
    throw error
  }
}

async function handleSubscriptionDeleted(subscription) {
  const { error } = await supabase
    .from('billing')
    .update({
      status: 'canceled',
      valid_until: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

async function handlePaymentSucceeded(invoice) {
  const { error } = await supabase
    .from('billing')
    .update({
      status: 'active',
      valid_until: new Date(invoice.period_end * 1000).toISOString()
    })
    .eq('stripe_subscription_id', invoice.subscription)

  if (error) {
    console.error('Error updating payment status:', error)
    throw error
  }
}

async function handlePaymentFailed(invoice) {
  const { error } = await supabase
    .from('billing')
    .update({
      status: 'past_due'
    })
    .eq('stripe_subscription_id', invoice.subscription)

  if (error) {
    console.error('Error updating failed payment status:', error)
    throw error
  }
} 