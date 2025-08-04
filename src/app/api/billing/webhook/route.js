import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

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
  // This function is kept for backward compatibility
  console.log('Checkout session completed:', session.id)
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id)
  
  let plan = 'starter' // default
  let userId = null
  
  // Determine plan based on price ID from the payment URLs
  if (subscription.items && subscription.items.data.length > 0) {
    const priceId = subscription.items.data[0].price.id
    console.log('Price ID:', priceId)
    
    // Map price IDs to plans based on your Stripe setup
    // You'll need to get the actual price IDs from your Stripe dashboard
    // For now, using a simple mapping - update these with your actual price IDs
    if (priceId.includes('price_') && (priceId.includes('pro') || priceId.includes('25'))) {
      plan = 'pro'
    } else {
      plan = 'starter'
    }
  }
  
  // Get customer email to find user
  if (subscription.customer) {
    try {
      const customer = await stripe.customers.retrieve(subscription.customer)
      console.log('Customer email:', customer.email)
      console.log('Customer ID:', customer.id)
      
      if (customer.email) {
        // Find user by email in profiles table (case insensitive)
        console.log('Searching for profile with email:', customer.email)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, email')
          .ilike('email', customer.email)
          .single()
        
        if (profile) {
          userId = profile.id
          console.log('Found user:', userId, 'with email:', profile.email)
        } else {
          console.log('No profile found for email:', customer.email)
          
          // Let's also check what profiles exist
          const { data: allProfiles, error: listError } = await supabase
            .from('profiles')
            .select('id, email')
            .limit(5)
          
          if (allProfiles) {
            console.log('Available profiles:', allProfiles.map(p => ({ id: p.id, email: p.email })))
          }
        }
      } else {
        console.log('No email found for customer:', customer.id)
      }
    } catch (error) {
      console.error('Error retrieving customer:', error)
    }
  }
  
  if (userId) {
    // Update billing table
    const { error: billingError } = await supabase
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

    if (billingError) {
      console.error('Error updating billing record:', billingError)
      throw billingError
    }
    
    // Update profiles table with stripe_customer_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        stripe_customer_id: subscription.customer
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      throw profileError
    }
    
    console.log('Successfully updated billing and profile for user:', userId)
  } else {
    console.log('Could not find user for subscription:', subscription.id)
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id)
  
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
  } else {
    console.log('Successfully updated subscription status')
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id)
  
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
  } else {
    console.log('Successfully canceled subscription')
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded for invoice:', invoice.id)
  
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
  } else {
    console.log('Successfully updated payment status to active')
  }
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed for invoice:', invoice.id)
  
  const { error } = await supabase
    .from('billing')
    .update({
      status: 'past_due'
    })
    .eq('stripe_subscription_id', invoice.subscription)

  if (error) {
    console.error('Error updating failed payment status:', error)
    throw error
  } else {
    console.log('Successfully updated payment status to past_due')
  }
} 