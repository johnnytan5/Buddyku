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

    // Fix: Use hardcoded Docker service name for now
    const backendUrl = 'http://backend:8000/fetch-all-emotions'

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching emotions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emotions' },
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
