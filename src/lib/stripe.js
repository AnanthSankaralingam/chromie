import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

export const stripeService = {
  // Create customer
  async createCustomer(email, name) {
    return stripe.customers.create({
      email,
      name,
      metadata: {
        source: "chromie-ai",
      },
    })
  },

  // Create checkout session
  async createCheckoutSession(customerId, priceId, successUrl, cancelUrl) {
    return stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    })
  },

  // Create billing portal session
  async createBillingPortalSession(customerId, returnUrl) {
    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
  },

  // Get subscription
  async getSubscription(subscriptionId) {
    return stripe.subscriptions.retrieve(subscriptionId)
  },

  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })
  },
}

export default stripe
