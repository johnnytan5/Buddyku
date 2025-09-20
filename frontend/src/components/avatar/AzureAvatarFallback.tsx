'use client'

import React, { useState, useCallback } from 'react'
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, Bot, Sparkles } from 'lucide-react'

interface AzureAvatarFallbackProps {
  onSpeechRecognized?: (text: string) => void
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
  onAvatarReady?: () => void
  onError?: (error: string) => void
  className?: string
}

const AzureAvatarFallback: React.FC<AzureAvatarFallbackProps> = ({
  onSpeechRecognized,
  onSpeechStart,
  onSpeechEnd,
  onAvatarReady,
  onError,
  className = ''
}) => {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Simulate speech recognition using Web Speech API as fallback
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      onError?.('Speech recognition not supported in this browser')
      return
    }

    try {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.lang = 'en-US'
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onstart = () => {
        setIsListening(true)
        onSpeechStart?.()
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        onSpeechRecognized?.(transcript)
        setIsListening(false)
        onSpeechEnd?.()
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        onSpeechEnd?.();
        if (event.error === 'not-allowed') {
          onError?.('Microphone access denied. Please allow microphone permissions.');
        } else if (event.error === 'aborted') {
          onError?.('Speech recognition was aborted. Try again or check your browser settings.');
        } else if (event.error === 'no-speech') {
          onError?.('No speech detected. Please try speaking again.');
        } else {
          onError?.(`Speech recognition error: ${event.error}`);
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        onSpeechEnd?.()
      }

      recognition.start()
    } catch (error) {
      onError?.(`Speech recognition failed: ${error}`)
      setIsListening(false)
      onSpeechEnd?.()
    }
      }, [onSpeechRecognized, onSpeechStart, onSpeechEnd, onError])

  // Simulate text-to-speech using Web Speech API
  const speakText = useCallback((text: string) => {
    if (!text.trim()) return

    if ('speechSynthesis' in window) {
      try {
        setIsSpeaking(true)
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'
        
        utterance.onend = () => {
          setIsSpeaking(false)
        }
        
        utterance.onerror = () => {
          setIsSpeaking(false)
        }

        speechSynthesis.speak(utterance)
      } catch (error) {
        console.error('Text-to-speech error:', error)
        setIsSpeaking(false)
      }
    }
  }, [])

  // Expose speakText function globally
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).azureAvatar = { speakText }
    }
  }, [speakText])

  // Signal ready state
  React.useEffect(() => {
    onAvatarReady?.()
  }, [onAvatarReady])

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Robot Avatar */}
      <div className="relative inline-block">
        <div className={`w-56 h-56 mx-auto mb-6 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl transform transition-all duration-1000 ${isSpeaking ? 'scale-105 shadow-blue-500/50' : 'scale-100'}`}>
          <div className="w-52 h-52 bg-white rounded-full flex items-center justify-center">
            <Bot className={`w-28 h-28 text-blue-600 ${isSpeaking ? 'animate-bounce' : 'animate-pulse'}`} />
          </div>
          
          {/* Glow effect */}
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 ${isSpeaking ? 'opacity-30 animate-pulse' : 'opacity-20 animate-ping'}`} />
        </div>

        {/* Speech Bubble */}
        <div className="absolute -top-6 -right-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl px-6 py-3 shadow-xl transform hover:scale-105 transition-transform duration-300">
          <div className="text-sm font-medium">
            {isListening 
              ? ('Listening...')
              : isSpeaking
              ? ('Speaking...')
              : ('Hi! How can I help?')
            }
          </div>
          <div className="absolute bottom-0 left-8 transform translate-y-1/2 rotate-45 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600" />
          {/* Sparkle effect */}
          <Sparkles className="absolute -top-2 -right-2 w-4 h-4 text-yellow-300 animate-spin" />
        </div>
      </div>

      {/* Voice Control Button */}
      <button
        onClick={startListening}
        disabled={isListening || isSpeaking}
        className={`p-4 rounded-full transition-all duration-300 ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-green-500 hover:bg-green-600'
        } text-white shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
        title={
          isListening
            ? ('Listening...')
            : ('Press to speak')
        }
      >
        {isListening ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>

      {/* Status Indicator */}
      <div className="mt-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-sm text-gray-600 font-medium">
            {'Fallback Mode (Browser)'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default AzureAvatarFallback