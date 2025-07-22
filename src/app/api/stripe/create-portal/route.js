import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { stripeService } from "@/lib/stripe"

export async function POST(request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (profileError || !profile || !profile.stripe_customer_id) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Create billing portal session
    const session = await stripeService.createBillingPortalSession(
      profile.stripe_customer_id,
      `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Error creating portal session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
