'use client'

import { useState, useCallback, useRef } from 'react'

interface UseAzureAvatarProps {
  onSpeechRecognized?: (text: string) => void
  onError?: (error: string) => void
}

export const useAzureAvatar = ({ onSpeechRecognized, onError }: UseAzureAvatarProps = {}) => {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [avatarReady, setAvatarReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reference to track if avatar is available globally
  const avatarRef = useRef<any>(null)

  // Initialize avatar reference from global scope
  const initializeAvatarRef = useCallback(() => {
    if (typeof window !== 'undefined') {
      avatarRef.current = (window as any).azureAvatar
    }
  }, [])

  // Speak text through the avatar
  const speakText = useCallback(async (text: string) => {
    if (!text?.trim()) return false

    try {
      // Try to get avatar from global scope if not available
      if (!avatarRef.current && typeof window !== 'undefined') {
        avatarRef.current = (window as any).azureAvatar
      }

      if (avatarRef.current?.speakText) {
        setIsSpeaking(true)
        await avatarRef.current.speakText(text)
        setIsSpeaking(false)
        return true
      } else {
        console.warn('Azure Avatar not available, cannot speak text')
        return false
      }
    } catch (error) {
      console.error('Error speaking text:', error)
      setIsSpeaking(false)
      const errorMessage = `Failed to speak: ${error}`
      setError(errorMessage)
      onError?.(errorMessage)
      return false
    }
  }, [onError])

  // Handle speech recognition result
  const handleSpeechRecognized = useCallback((text: string) => {
    onSpeechRecognized?.(text)
  }, [onSpeechRecognized])

  // Handle speech start
  const handleSpeechStart = useCallback(() => {
    setIsListening(true)
    setError(null)
  }, [])

  // Handle speech end
  const handleSpeechEnd = useCallback(() => {
    setIsListening(false)
  }, [])

  // Handle avatar ready
  const handleAvatarReady = useCallback(() => {
    setAvatarReady(true)
    setError(null)
    initializeAvatarRef()
  }, [initializeAvatarRef])

  // Handle avatar error
  const handleAvatarError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    setIsListening(false)
    setIsSpeaking(false)
    onError?.(errorMessage)
  }, [onError])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    isListening,
    isSpeaking,
    avatarReady,
    error,
    
    // Actions
    speakText,
    clearError,
    
    // Event handlers for Avatar component
    handleSpeechRecognized,
    handleSpeechStart,
    handleSpeechEnd,
    handleAvatarReady,
    handleAvatarError
  }
}