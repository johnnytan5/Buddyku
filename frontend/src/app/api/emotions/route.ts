import { NextRequest, NextResponse } from 'next/server'

interface EmotionRequest {
  user_id: string
}

interface EmotionUploadRequest {
  user_id: string
  date: string
  mood: "very-sad" | "sad" | "neutral" | "happy" | "very-happy"
  emotion: "belonging" | "calm" | "comfort" | "disappointment" | "gratitude" | "hope" | "joy" | "love" | "sadness" | "strength"
  title?: string
  content: string
  description?: string
  location?: string
  people?: string[]
  tags?: string[]
  gratitude?: string[]
  achievements?: string[]
  mediaAttachments?: any[]
  isFavorite?: boolean
}

export const runtime = 'edge'

// GET - Fetch all emotions for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const backendUrl = `${baseUrl}/api/fetch-all-emotions`

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error:', errorText)
      return NextResponse.json(
        { error: 'Backend error', message: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
    
  } catch (error) {
    console.error('Error in emotions API route:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - Upload new emotion entry
export async function POST(request: NextRequest) {
  try {
    const body: EmotionUploadRequest = await request.json()
    
    if (!body.user_id || !body.content) {
      return NextResponse.json(
        { error: 'User ID and content are required' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const backendUrl = `${baseUrl}/api/uploadEmotionsS3`

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error:', errorText)
      return NextResponse.json(
        { error: 'Backend error', message: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
    
  } catch (error) {
    console.error('Error in emotions upload API route:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
