import { NextRequest, NextResponse } from 'next/server'

interface Message {
  role: string
  content: string
}

interface ChatRequest {
  message: string
  message_history?: Message[]
}

// Set runtime to 'edge' to enable streaming and Web API usage
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    
    if (!body.message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const backendUrl = process.env.NODE_ENV === 'development' 
      ? 'http://127.0.0.1:8000/api/chat'
      : (process.env.FASTAPI_BACKEND_URL || 'http://127.0.0.1:8000/api/chat')

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: body.message,
        message_history: body.message_history || [],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      throw new Error(`Backend responded with status: ${response.status} - ${errorText}`);
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/plain',
      },
      status: 200,
    })
    
  } catch (error) {
    console.error('Error in chat API route:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Chat API is running',
    timestamp: new Date().toISOString()
  })
}