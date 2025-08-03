import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { email, plan = 'starter' } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create a test billing record
    const { error: billingError } = await supabase
      .from('billing')
      .upsert({
        user_id: profile.id,
        stripe_customer_id: 'cus_test_' + Date.now(),
        stripe_subscription_id: 'sub_test_' + Date.now(),
        plan: plan,
        status: 'active',
        created_at: new Date().toISOString(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })

    if (billingError) {
      console.error('Error creating test billing record:', billingError)
      return NextResponse.json({ error: 'Failed to create billing record' }, { status: 500 })
    }

    // Update profile with test stripe_customer_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_customer_id: 'cus_test_' + Date.now()
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test billing record created',
      user_id: profile.id,
      plan: plan
    })

  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      { error: 'Test webhook failed' },
      { status: 500 }
    )
  }
} 