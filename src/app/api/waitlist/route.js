import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { name, email, useCase } = await request.json();

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

    // Log the waitlist request
    console.log('✨ New Waitlist Signup:', {
      name,
      email,
      useCase: useCase || 'N/A',
      timestamp: new Date().toISOString(),
    });

    // In a production environment, you would:
    // 1. Store this in your database
    // 2. Send a notification email to your team
    // 3. Send a confirmation email to the user
    // 4. Add to email marketing list (Mailchimp, ConvertKit, etc.)

    // For now, we'll just return success
    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist',
    });

  } catch (error) {
    console.error('Error processing waitlist request:', error);
    return NextResponse.json(
      { error: 'Failed to process waitlist request' },
      { status: 500 }
    );
  }
}
