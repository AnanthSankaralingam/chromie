import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { HyperbrowserService } from "@/lib/hyperbrowser-service"
import { browserBaseService } from "@/lib/browserbase-service"

export async function POST() {
  const supabase = createClient()

  try {
    console.log('Starting browser session cleanup process...')

    // Clean up expired sessions using both services
    const hyperbrowserService = new HyperbrowserService()
    const hyperbrowserResult = await hyperbrowserService.cleanupExpiredSessions(supabase)
    const browserbaseResult = await browserBaseService.cleanupExpiredSessions(supabase)

    const totalCleaned = (hyperbrowserResult.cleaned || 0) + (browserbaseResult.cleaned || 0)
    const allErrors = [
      ...(hyperbrowserResult.errors || []),
      ...(browserbaseResult.errors || [])
    ]

    console.log(`Cleanup completed: ${totalCleaned} sessions cleaned`)

    return NextResponse.json({
      success: true,
      cleaned: totalCleaned,
      hyperbrowser: hyperbrowserResult,
      browserbase: browserbaseResult,
      errors: allErrors.length > 0 ? allErrors : undefined
    })

  } catch (error) {
    console.error("Error during session cleanup:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to cleanup sessions" 
    }, { status: 500 })
  }
}
