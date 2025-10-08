import { NextRequest, NextResponse } from 'next/server'

type Mood = "very-sad" | "sad" | "neutral" | "happy" | "very-happy";
type Emotion = "belonging" | "calm" | "comfort" | "disappointment" | "gratitude" | "hope" | "joy" | "love" | "sadness" | "strength";

interface MediaAttachment {
  id: string;
  type: "image" | "video" | "audio";
  url: string;
  filename: string;
  caption?: string;
  uploadedAt: string;
  isFavorite: boolean;
}

interface EmotionUpload {
  user_id: string;
  date: string;
  mood: Mood;
  emotion: Emotion;
  title?: string;
  content: string;
  description?: string;
  location?: string;
  people: string[];
  tags: string[];
  gratitude: string[];
  achievements: string[];
  mediaAttachments: MediaAttachment[];
  isFavorite: boolean;
}

interface UploadEmotionResponse {
  success: boolean;
  message: string;
  s3_key?: string;
  bucket?: string;
}

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body: EmotionUpload = await request.json()
    
    // Validate required fields
    if (!body.user_id?.trim()) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    if (!body.date?.trim()) {
      return NextResponse.json(
        { error: 'date is required' },
        { status: 400 }
      )
    }

    if (!body.mood?.trim()) {
      return NextResponse.json(
        { error: 'mood is required' },
        { status: 400 }
      )
    }

    if (!body.emotion?.trim()) {
      return NextResponse.json(
        { error: 'emotion is required' },
        { status: 400 }
      )
    }

    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const backendUrl = `${baseUrl}/api/uploadEmotionsS3`

    console.log('Uploading emotion data to backend:', body)

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error response:', errorText)
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data: UploadEmotionResponse = await response.json()
    console.log('Successfully uploaded emotion data:', data)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error uploading emotion:', error)
    return NextResponse.json(
      { error: 'Failed to upload emotion data' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Upload emotion API is running',
    timestamp: new Date().toISOString()
  })
}
