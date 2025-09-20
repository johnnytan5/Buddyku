import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Prepare the backend URL
    const backendUrl = process.env.NODE_ENV === 'development'
      ? 'http://127.0.0.1:8000/api/mood-detection'
      : (process.env.FASTAPI_BACKEND_URL?.replace(/\/?$/, '') + '/api/mood-detection' || 'http://127.0.0.1:8000/api/mood-detection')

    // Forward the file to the backend as multipart/form-data
    const backendForm = new FormData()
    backendForm.append('file', file, 'frame.jpg')

    const resp = await fetch(backendUrl, {
      method: 'POST',
      body: backendForm,
    })

    if (!resp.ok) {
      const errorText = await resp.text()
      return NextResponse.json({ error: 'Backend error', message: errorText }, { status: resp.status })
    }

    const data = await resp.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Mood detection API is running', timestamp: new Date().toISOString() })
}
