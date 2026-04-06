/**
 * Derive paid plan flags from GET /api/billing/status JSON.
 * Kept in sync with server-side checkPaidPlan semantics for UI.
 */
export function derivePaidPlanFromStatusResponse(data) {
  if (!data) {
    return { isPaid: false, plan: 'free' }
  }

  const purchases = data.purchases || []

  const hasActivePurchase = purchases.some((p) => {
    if (p.status !== 'active') return false
    if (p.purchase_type === 'subscription') {
      if (!p.expires_at) return true
      return new Date(p.expires_at) > new Date()
    }
    return p.purchase_type === 'one_time'
  })

  const hasActiveBilling = data.billing?.status === 'active'
  const userIsPaid = hasActivePurchase || hasActiveBilling

  let plan = 'free'
  if (hasActivePurchase) {
    const activePurchase = purchases.find((p) => {
      if (p.status !== 'active') return false
      if (p.purchase_type === 'subscription') {
        return !p.expires_at || new Date(p.expires_at) > new Date()
      }
      return p.purchase_type === 'one_time'
    })
    plan = activePurchase?.plan || 'free'
  } else if (hasActiveBilling) {
    plan = data.billing?.plan || 'free'
  }

  return { isPaid: userIsPaid, plan }
}
