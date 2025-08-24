import { NextResponse } from "next/server"

export async function POST(request) {
  // Dev-only safety: block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  // Lazy import to avoid adding a top-level dependency cost on prod edge
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const body = await request.json()
    const userId = body?.user_id
    const rowId = body?.id
    const tokensThisRequest = Number(body?.tokensThisRequest || 0)
    const modelUsed = typeof body?.model === 'string' ? body.model : 'unknown'

    if (!userId || !rowId) {
      return NextResponse.json({ error: 'user_id and id are required' }, { status: 400 })
    }
    if (!Number.isFinite(tokensThisRequest) || tokensThisRequest < 0) {
      return NextResponse.json({ error: 'tokensThisRequest must be a non-negative number' }, { status: 400 })
    }

    // Fetch existing row strictly by id and user_id
    const { data: existingUsage, error: fetchError } = await supabase
      .from('token_usage')
      .select('id, user_id, total_tokens, monthly_reset, model')
      .eq('id', rowId)
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch token usage row' }, { status: 500 })
    }

    if (!existingUsage) {
      return NextResponse.json({ error: 'Specified token_usage row not found' }, { status: 404 })
    }

    const now = new Date()
    // Use beginning of current month as the reset anchor
    let effectiveMonthlyReset = existingUsage?.monthly_reset
    if (!effectiveMonthlyReset) {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      effectiveMonthlyReset = firstDayOfMonth.toISOString()
    }

    const monthlyResetDate = effectiveMonthlyReset ? new Date(effectiveMonthlyReset) : null
    let resetDatePlusOneMonth = null
    if (monthlyResetDate) {
      resetDatePlusOneMonth = new Date(monthlyResetDate)
      resetDatePlusOneMonth.setMonth(resetDatePlusOneMonth.getMonth() + 1)
    }

    const isResetDue = monthlyResetDate ? now >= resetDatePlusOneMonth : false

    // Determine new totals and monthly_reset state
    let newTotalTokens
    let newMonthlyReset = existingUsage?.monthly_reset

    if (!existingUsage.monthly_reset) {
      newTotalTokens = (existingUsage.total_tokens || 0) + tokensThisRequest
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      newMonthlyReset = firstDayOfMonth.toISOString()
    } else if (isResetDue) {
      newTotalTokens = tokensThisRequest
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      newMonthlyReset = firstDayOfMonth.toISOString()
    } else {
      newTotalTokens = (existingUsage.total_tokens || 0) + tokensThisRequest
    }

    console.log(`[TEST] Updating token usage - id: ${rowId}, user: ${userId}, +${tokensThisRequest} => ${newTotalTokens}`)

    const { data: updatedRows, error: updateError } = await supabase
      .from('token_usage')
      .update({
        total_tokens: newTotalTokens,
        monthly_reset: newMonthlyReset,
        model: modelUsed,
      })
      .eq('id', rowId)
      .eq('user_id', userId)
      .select('id, user_id, total_tokens, monthly_reset, model')

    if (updateError) {
      console.error('[TEST] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update token usage' }, { status: 500 })
    }

    return NextResponse.json({ success: true, row: updatedRows?.[0] || null })
  } catch (error) {
    console.error('[TEST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

