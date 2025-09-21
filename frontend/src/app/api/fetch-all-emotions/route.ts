import { NextRequest, NextResponse } from 'next/server'

interface UserEmotionFetch {
  user_id: string
}

interface JournalEntry {
  date: string
  mood: string
  emotion: string
  title?: string
  content: string
  description?: string
  location?: string
  people: string[]
  tags: string[]
  gratitude: string[]
  achievements: string[]
  mediaAttachments: any[]
  isFavorite: boolean
}

interface FetchAllEmotionsResponse {
  user_id: string
  journal_entries: Record<string, JournalEntry>
}

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body: UserEmotionFetch = await request.json()
    
    if (!body.user_id?.trim()) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Prepare the backend URL
    const backendUrl = process.env.NODE_ENV === 'development'
      ? 'http://127.0.0.1:8000/fetch-all-emotions'
      : (process.env.FASTAPI_BACKEND_URL?.replace(/\/?$/, '') + '/fetch-all-emotions' || 'http://127.0.0.1:8000/fetch-all-emotions')

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: body.user_id,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error:', errorText)
      return NextResponse.json(
        { 
          error: 'Backend error', 
          message: errorText,
          status: response.status 
        }, 
        { status: response.status }
      )
    }

    const data: FetchAllEmotionsResponse = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error in fetch-all-emotions API route:', error)
    
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
    message: 'Fetch all emotions API is running',
    timestamp: new Date().toISOString()
  })
}
