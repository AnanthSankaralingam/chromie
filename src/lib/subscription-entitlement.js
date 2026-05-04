/**
 * Subscription still entitled to paid limits until expires_at.
 * We mark purchases `canceled` when Stripe sets cancel_at_period_end while status stays `active`.
 */
export function subscriptionPurchaseEntitled(purchase, now = new Date()) {
  if (!purchase || purchase.purchase_type !== 'subscription') return false
  if (purchase.status !== 'active' && purchase.status !== 'canceled') return false
  if (!purchase.expires_at) return purchase.status === 'active'
  return new Date(purchase.expires_at) > now
}
