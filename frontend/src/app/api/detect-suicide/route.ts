import { NextRequest, NextResponse } from 'next/server'

interface SuicideDetectionRequest {
	message: string
}

interface SuicideDetectionResponse {
	score: number 
}

export const runtime = 'edge'

export async function POST(request: NextRequest) {
	try {
		const body: SuicideDetectionRequest = await request.json()
		if (!body.message?.trim()) {
			return NextResponse.json(
				{ error: 'Message is required' },
				{ status: 400 }
			)
		}

		// Environment-aware backend URL (same pattern as other routes)
		const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
		const backendUrl = `${baseUrl}/api/detect-suicide`
		
		console.log(`🌐 Using backend URL: ${backendUrl}`)

		const response = await fetch(backendUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ message: body.message }),
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error('Backend error:', errorText)
			return NextResponse.json(
				{ error: 'Backend error', message: errorText },
				{ status: response.status }
			)
		}

		const data: SuicideDetectionResponse = await response.json()
		return NextResponse.json(data, { status: 200 })
	} catch (error) {
		console.error('Error in detect-suicide API route:', error)
		return NextResponse.json(
			{
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error',
				debug: {
					backendUrl: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
					nodeEnv: process.env.NODE_ENV
				}
			},
			{ status: 500 }
		)
	}
}

export async function GET() {
	return NextResponse.json({
		message: 'Detect Suicide API is running',
		timestamp: new Date().toISOString(),
		backendUrl: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
	})
}