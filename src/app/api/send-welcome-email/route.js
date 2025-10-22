import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import emailService from '@/lib/services/email-service'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to check if welcome email was already sent
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Check if welcome email was already sent
    if (profile.welcome_email_sent) {
      return NextResponse.json({ 
        message: "Welcome email already sent",
        success: true 
      })
    }

    // Send welcome email
    const emailResult = await emailService.sendWelcomeEmail(user)
    
    if (!emailResult.success) {
      console.error('Failed to send welcome email:', emailResult.error)
      return NextResponse.json({ 
        error: "Failed to send welcome email",
        details: emailResult.error 
      }, { status: 500 })
    }

    // Mark welcome email as sent in the database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        welcome_email_sent: true,
        welcome_email_sent_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating welcome email status:', updateError)
      // Don't fail the request if we can't update the database
      // The email was sent successfully
    }

    console.log('Welcome email sent successfully to:', user.email)
    
    return NextResponse.json({ 
      message: "Welcome email sent successfully",
      success: true 
    })

  } catch (error) {
    console.error('Error in send-welcome-email API:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 })
  }
}
