import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get the user's billing information
  const { data: billing, error } = await supabase
    .from('billing')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching billing:', error)
    return NextResponse.json({ error: 'Failed to fetch billing' }, { status: 500 })
  }

  return NextResponse.json({ 
    billing: billing || null,
    user_id: user.id
  })
} 