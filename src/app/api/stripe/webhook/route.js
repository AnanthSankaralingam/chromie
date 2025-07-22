import { NextResponse } from "next/server"
import { headers } from "next/headers"
import stripe from "@/lib/stripe"
import { supabase } from "@/lib/supabase"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request) {
  try {
    const body = await request.text()
    const signature = headers().get("stripe-signature")

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 })
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // Handle the event
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object)
        break

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object)
        break

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 400 })
  }
}

async function handleSubscriptionUpdate(subscription) {
  try {
    // Get customer to find user
    const customer = await stripe.customers.retrieve(subscription.customer)

    // Find user by customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", subscription.customer)
      .single()

    if (!profile) {
      console.error("Profile not found for customer:", subscription.customer)
      return
    }

    // Determine plan from price ID
    let plan = "free"
    if (subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id
      // Map price IDs to plans (configure these in your environment)
      if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
        plan = "pro"
      } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
        plan = "enterprise"
      }
    }

    // Calculate valid until date
    const validUntil = new Date(subscription.current_period_end * 1000)

    // Update subscription in database
    await supabase.from("subscriptions").upsert(
      {
        user_id: profile.id,
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        plan,
        status: subscription.status,
        valid_until: validUntil.toISOString(),
      },
      {
        onConflict: "user_id",
      },
    )

    console.log("Subscription updated for user:", profile.id)
  } catch (error) {
    console.error("Error handling subscription update:", error)
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    // Update subscription status to canceled
    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        valid_until: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id)

    console.log("Subscription canceled:", subscription.id)
  } catch (error) {
    console.error("Error handling subscription deletion:", error)
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    if (invoice.subscription) {
      // Extend subscription validity
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
      const validUntil = new Date(subscription.current_period_end * 1000)

      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          valid_until: validUntil.toISOString(),
        })
        .eq("stripe_subscription_id", invoice.subscription)

      console.log("Payment succeeded for subscription:", invoice.subscription)
    }
  } catch (error) {
    console.error("Error handling payment success:", error)
  }
}

async function handlePaymentFailed(invoice) {
  try {
    if (invoice.subscription) {
      await supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("stripe_subscription_id", invoice.subscription)

      console.log("Payment failed for subscription:", invoice.subscription)
    }
  } catch (error) {
    console.error("Error handling payment failure:", error)
  }
}
