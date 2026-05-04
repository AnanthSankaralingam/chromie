import { subscriptionPurchaseEntitled } from '@/lib/subscription-entitlement'

/**
 * Derive paid plan flags from GET /api/billing/status JSON.
 * Kept in sync with server-side checkPaidPlan semantics for UI.
 */
export function derivePaidPlanFromStatusResponse(data) {
  if (!data) {
    return { isPaid: false, plan: 'free' }
  }

  const purchases = data.purchases || []

  const hasActivePurchase = purchases.some((p) =>
    subscriptionPurchaseEntitled(p, new Date())
  )

  const hasActiveBilling = data.billing?.status === 'active'
  const userIsPaid = hasActivePurchase || hasActiveBilling

  let plan = 'free'
  if (hasActivePurchase) {
    const activePurchase = purchases.find((p) =>
      subscriptionPurchaseEntitled(p, new Date())
    )
    plan = activePurchase?.plan || 'free'
  } else if (hasActiveBilling) {
    plan = data.billing?.plan || 'free'
  }

  return { isPaid: userIsPaid, plan }
}
