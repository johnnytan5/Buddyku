import { NextRequest, NextResponse } from 'next/server'

interface MessageSummary {
  role: string
  content: string
}

interface SummaryRequest {
  messages: MessageSummary[]
}

interface MoodSummaryResponse {
  date: string
  mood: "very-sad" | "sad" | "neutral" | "happy" | "very-happy"
  emotion: "belonging" | "calm" | "comfort" | "disappointment" | "gratitude" | "hope" | "joy" | "love" | "sadness" | "strength"
  content: string
  gratitude: string[]
  achievements: string[]
  isFavorite: boolean
}

// Set runtime to 'edge' to enable streaming and Web API usage
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body: SummaryRequest = await request.json()

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const backendUrl = `${baseUrl}/api/generate-summary`

    console.log('Calling backend summary API:', backendUrl)
    console.log('Request body:', JSON.stringify(body, null, 2))

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: body.messages
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend summary error:', errorText)
      throw new Error(`Backend responded with status: ${response.status} - ${errorText}`)
    }

    const summaryData: MoodSummaryResponse = await response.json()
    console.log('Received summary data:', summaryData)

    return NextResponse.json(summaryData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })

  } catch (error) {
    console.error('Error in summary API route:', error)

    // Return fallback summary data on error
    const fallbackSummary: MoodSummaryResponse = {
      date: new Date().toISOString().split('T')[0],
      mood: 'sad',
      emotion: 'sadness',
      content: 'Had a conversation about feelings and emotional experiences. The discussion provided a space for reflection and sharing.',
      gratitude: ['Having someone to talk to'],
      achievements: ['Opened up about feelings'],
      isFavorite: false
    }

    console.log('Returning fallback summary due to error')
    return NextResponse.json(fallbackSummary, {
      status: 200, // Return 200 with fallback data instead of error
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Summary API is running',
    endpoint: '/api/generate-summary',
    timestamp: new Date().toISOString()
  })
}