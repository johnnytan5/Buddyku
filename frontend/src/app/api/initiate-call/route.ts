import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to_number, user_id, initial_mood, custom_prompt } = body;

    // Validate required fields
    if (!to_number) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Make request to backend AI calling endpoint
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/ai-calling/initiate-ai-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to_number,
        user_id,
        initial_mood,
        custom_prompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Backend AI calling error:', data);
      return NextResponse.json(
        { error: data.detail || 'Failed to initiate AI call' },
        { status: response.status }
      );
    }

    console.log('AI call initiated successfully:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error initiating AI call:', error);
    return NextResponse.json(
      { error: 'Internal server error while initiating AI call' },
      { status: 500 }
    );
  }
}