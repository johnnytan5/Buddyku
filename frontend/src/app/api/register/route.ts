import { NextRequest, NextResponse } from 'next/server'

interface RegisterRequest {
  email: string
  password: string
  name: string
  phone: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
}

interface RegisterResponse {
  success: boolean
  message: string
  user_id?: string
}

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json()
    
    // Validate required fields
    if (!body.email || !body.password || !body.name || !body.phone) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, name, and phone are required' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const backendUrl = `${baseUrl}/api/register`

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

    const data: RegisterResponse = await response.json()
    return NextResponse.json(data, { status: 200 })
    
  } catch (error) {
    console.error('Error in register API route:', error)
    
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
    message: 'Register API is running',
    timestamp: new Date().toISOString()
  })
}
