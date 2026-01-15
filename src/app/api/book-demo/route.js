import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { name, email, company, message } = await request.json();

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Log the demo request
    console.log('📅 New Demo Request:', {
      name,
      email,
      company: company || 'N/A',
      message: message || 'N/A',
      timestamp: new Date().toISOString(),
    });

    // In a production environment, you would:
    // 1. Store this in your database
    // 2. Send a notification email to your team
    // 3. Send a confirmation email to the user
    // 4. Integrate with a calendar booking system (Calendly, Cal.com, etc.)

    // For now, we'll just return success
    return NextResponse.json({
      success: true,
      message: 'Demo request received successfully',
    });

  } catch (error) {
    console.error('Error processing demo request:', error);
    return NextResponse.json(
      { error: 'Failed to process demo request' },
      { status: 500 }
    );
  }
}
