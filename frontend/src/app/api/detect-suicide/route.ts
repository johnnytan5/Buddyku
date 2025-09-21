
import { NextRequest, NextResponse } from 'next/server'

interface SuicideDetectionRequest {
	message: string
}

interface SuicideDetectionResponse {
	risk_level: string
	risk_score: number
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

		const backendUrl = process.env.NODE_ENV === 'development'
			? 'http://backend:8000/api/detect-suicide'
			: (process.env.FASTAPI_BACKEND_URL?.replace(/\/api\/chat$/, '/api/detect-suicide') || 'http://127.0.0.1:8000/api/detect-suicide')

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
			},
			{ status: 500 }
		)
	}
}

export async function GET() {
	return NextResponse.json({
		message: 'Detect Suicide API is running',
		timestamp: new Date().toISOString(),
	})
}
