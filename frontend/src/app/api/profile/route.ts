import { NextRequest, NextResponse } from 'next/server'

interface ProfileRequest {
  user_id: string
}

interface ProfileResponse {
  user_id: string
  email: string
  name: string
  phone: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  created_at?: string
  last_login?: string
}

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body: ProfileRequest = await request.json()
    
    if (!body.user_id?.trim()) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const backendUrl = `${baseUrl}/api/profile/${body.user_id}`

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error:', errorText)
      return NextResponse.json(
        { error: 'Backend error', message: errorText },
        { status: response.status }
      )
    }

    const data: ProfileResponse = await response.json()
    return NextResponse.json(data, { status: 200 })
    
  } catch (error) {
    console.error('Error in profile API route:', error)
    
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
    message: 'Profile API is running',
    timestamp: new Date().toISOString()
  })
}
