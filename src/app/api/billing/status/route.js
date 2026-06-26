import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { subscriptionPurchaseEntitled } from "@/lib/subscription-entitlement"

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get purchase history
  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select('*')
    .eq('user_id', user.id)
    .order('purchased_at', { ascending: false })

  if (purchasesError) {
    console.error('Error fetching purchases:', purchasesError)
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
  }

  // Get current billing record (backwards compatibility)
  const { data: billing, error: billingError } = await supabase
    .from('billing')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (billingError) {
    console.error('Error fetching billing:', billingError)
    return NextResponse.json({ error: 'Failed to fetch billing' }, { status: 500 })
  }

  // If no billing record, derive from purchases (e.g. manual Pro grants)
  let effectiveBilling = billing
  if (!effectiveBilling && purchases?.length > 0) {
    const now = new Date()
    const activeSubscription = purchases.find(
      (p) =>
        p.plan === 'pro' &&
        subscriptionPurchaseEntitled(p, now)
    )
    if (activeSubscription) {
      effectiveBilling = {
        plan: activeSubscription.plan,
        status: 'active',
        valid_until: activeSubscription.expires_at
      }
    }
  }

  return NextResponse.json({ 
    billing: effectiveBilling || null,
    purchases: purchases || [],
    user_id: user.id
  })
} 