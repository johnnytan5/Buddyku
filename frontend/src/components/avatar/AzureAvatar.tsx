'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Loader2, Bot } from 'lucide-react'

// Dynamically import the new modular Azure Avatar V2
const AzureAvatarV2 = dynamic(
  () => import('./AzureAvatarV2'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center">
        <div className="w-56 h-56 mx-auto mb-6 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
          <div className="w-52 h-52 bg-white rounded-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading Avatar...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

const AzureAvatarClient = dynamic(
  () => import('./AzureAvatarClient'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center">
        <div className="w-56 h-56 mx-auto mb-6 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
          <div className="w-52 h-52 bg-white rounded-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading Avatar (Fallback)...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

const AzureAvatarFallback = dynamic(
  () => import('./AzureAvatarFallback'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center">
        <div className="w-56 h-56 mx-auto mb-6 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
          <div className="w-52 h-52 bg-white rounded-full flex items-center justify-center">
            <Bot className="w-28 h-28 text-blue-600 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }
)

interface AzureAvatarProps {
  onSpeechRecognized?: (text: string) => void
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
  onAvatarReady?: () => void
  onError?: (error: string) => void
  className?: string
  fallbackToRobot?: boolean
  useNewImplementation?: boolean
  autoStart?: boolean
  showControls?: boolean
  showStatus?: boolean
}

const AzureAvatar: React.FC<AzureAvatarProps> = ({
  onSpeechRecognized,
  onSpeechStart,
  onSpeechEnd,
  onAvatarReady,
  onError,
  className = '',
  fallbackToRobot = true,
  useNewImplementation = true,
  autoStart = true,
  showControls = true,
  showStatus = true
}) => {
  const [useFallback, setUseFallback] = React.useState(false)
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  const hasAzureCredentials = isClient && 
    process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY && 
    process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION &&
    process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY !== 'your_speech_key_here' &&
    process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION !== 'your_region_here'

  if (!isClient) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
        <div className="w-56 h-56 mx-auto mb-6 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
          <div className="w-52 h-52 bg-white rounded-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!hasAzureCredentials && !fallbackToRobot) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Azure Not Configured
          </h3>
          <p className="text-sm text-gray-500 max-w-md">
            Please set NEXT_PUBLIC_AZURE_SPEECH_KEY and NEXT_PUBLIC_AZURE_CUSTOM_ENDPOINT in your .env.local file
          </p>
        </div>
      </div>
    )
  }

  if (!hasAzureCredentials || useFallback) {
    return (
      <AzureAvatarFallback
        onSpeechRecognized={onSpeechRecognized}
        onSpeechStart={onSpeechStart}
        onSpeechEnd={onSpeechEnd}
        onAvatarReady={onAvatarReady}
        onError={onError}
        className={className}
      />
    )
  }

  if (useNewImplementation) {
    return (
      <AzureAvatarV2
        onSpeechRecognized={onSpeechRecognized}
        onSpeechStart={onSpeechStart}
        onSpeechEnd={onSpeechEnd}
        onAvatarReady={onAvatarReady}
        onError={(error) => {
          console.error('Azure Avatar V2 Error:', error)
          onError?.(error)
          if (fallbackToRobot) {
            setUseFallback(true)
          }
        }}
        className={className}
        autoStart={autoStart}
        showControls={showControls}
        showStatus={showStatus}
      />
    )
  }

  return (
    <AzureAvatarClient
      onSpeechRecognized={onSpeechRecognized}
      onSpeechStart={onSpeechStart}
      onSpeechEnd={onSpeechEnd}
      onAvatarReady={onAvatarReady}
      onError={(error) => {
        console.error('Azure Avatar Client Error:', error)
        onError?.(error)
        if (fallbackToRobot) {
          setUseFallback(true)
        }
      }}
      className={className}
    />
  )
}

export default AzureAvatar