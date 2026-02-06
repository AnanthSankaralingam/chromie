import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Insert into Supabase
    const supabase = createClient();
    const { data, error } = await supabase
      .from('waitlist')
      .insert([
        {
          name,
          email,
          use_case: useCase || null,
        }
      ])
      .select();

    if (error) {
      // Handle duplicate email
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This email is already on the waitlist' },
          { status: 409 }
        );
      }

      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      );
    }

    // Log the waitlist request
    console.log('✨ New Waitlist Signup:', {
      name,
      email,
      useCase: useCase || 'N/A',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist',
      data: data[0],
    });

  } catch (error) {
    console.error('Error processing waitlist request:', error);
    return NextResponse.json(
      { error: 'Failed to process waitlist request' },
      { status: 500 }
    );
  }
}
