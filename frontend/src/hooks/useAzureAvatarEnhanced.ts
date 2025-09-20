'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface UseAzureAvatarEnhancedProps {
  onSpeechRecognized?: (text: string) => void
  onError?: (error: string) => void
  autoProcessSpeech?: boolean
  chatEndpoint?: string
}

export const useAzureAvatarEnhanced = ({ 
  onSpeechRecognized, 
  onError,
  autoProcessSpeech = true,
  chatEndpoint = '/api/chat'
}: UseAzureAvatarEnhancedProps = {}) => {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [avatarReady, setAvatarReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Reference to track if avatar is available globally
  const avatarRef = useRef<any>(null)
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize avatar reference from global scope
  const initializeAvatarRef = useCallback(() => {
    if (typeof window !== 'undefined') {
      avatarRef.current = (window as any).azureAvatar
      if (avatarRef.current?.isReady) {
        setAvatarReady(true)
      }
    }
  }, [])

  // Enhanced speak text with better error handling
  const speakText = useCallback(async (text: string): Promise<boolean> => {
    if (!text?.trim()) return false

    try {
      // Try to get avatar from global scope if not available
      if (!avatarRef.current && typeof window !== 'undefined') {
        avatarRef.current = (window as any).azureAvatar
      }

      if (avatarRef.current?.speakText) {
        setIsSpeaking(true)
        setError(null)
        
        // Calculate estimated speaking duration
        const wordCount = text.split(' ').length
        const estimatedDuration = Math.max(2000, Math.min(15000, (wordCount / 150) * 60 * 1000))
        
        // Set timeout for speaking based on text length
        const speakingTimeout = setTimeout(() => {
          setIsSpeaking(false)
          console.warn('Speaking timeout - force stopping')
        }, estimatedDuration + 5000) // Add 5 seconds buffer
        
        const success = await avatarRef.current.speakText(text)
        clearTimeout(speakingTimeout)
        
        // Don't immediately stop speaking - let the avatar hook manage the duration
        // The avatar hook will handle stopping the speaking state after the estimated duration
        
        return success
      } else {
        // Fallback to browser speech synthesis
        console.warn('Azure Avatar not available, using browser TTS fallback')
        return await fallbackSpeak(text)
      }
    } catch (error) {
      console.error('Error speaking text:', error)
      setIsSpeaking(false)
      
      // Try fallback speech synthesis
      try {
        console.log('🔄 Trying fallback speech synthesis...')
        return await fallbackSpeak(text)
      } catch (fallbackError) {
        console.error('Fallback speech synthesis also failed:', fallbackError)
        const errorMessage = `Failed to speak: ${error}`
        setError(errorMessage)
        onError?.(errorMessage)
        return false
      }
    }
  }, [onError])

  // Fallback speak using browser Speech Synthesis API
  const fallbackSpeak = useCallback(async (text: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        try {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.lang = 'en-US'
          utterance.rate = 0.9
          utterance.pitch = 1
          
          utterance.onend = () => {
            setIsSpeaking(false)
            resolve(true)
          }
          
          utterance.onerror = () => {
            setIsSpeaking(false)
            resolve(false)
          }

          setIsSpeaking(true)
          speechSynthesis.speak(utterance)
        } catch (error) {
          console.error('Fallback speech synthesis error:', error)
          setIsSpeaking(false)
          resolve(false)
        }
      } else {
        resolve(false)
      }
    })
  }, [])

  // Process user speech input with backend integration
  const processSpeechWithBackend = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isProcessing) return

    setIsProcessing(true)
    setError(null)

    // Clear any existing timeout
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current)
    }

    // Set processing timeout
    processingTimeoutRef.current = setTimeout(() => {
      setIsProcessing(false)
      setError('Request timeout - please try again')
    }, 30000) // 30 second timeout

    try {
      console.log('🗣️ Processing user input:', userInput)
      
      // Call the chat API
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          message_history: []
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('🤖 Backend response:', data)
      
      // Speak the response through the avatar
      if (data.response) {
        await speakText(data.response)
        console.log('✅ Response spoken successfully')
      } else {
        throw new Error('No response from backend')
      }

    } catch (error) {
      console.error('❌ Error processing speech:', error)
      const errorMessage = 'Sorry, there was an error processing your request. Please try again.'
      setError(errorMessage)
      onError?.(errorMessage)
      
      // Speak error message
      await speakText(errorMessage)
    } finally {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
      }
      setIsProcessing(false)
    }
  }, [isProcessing, chatEndpoint, speakText, onError])

  // Enhanced speech recognition handler
  const handleSpeechRecognized = useCallback((text: string) => {
    console.log('🎙️ Speech recognized:', text)
    setError(null)
    onSpeechRecognized?.(text)
    
    // Auto-process if enabled
    if (autoProcessSpeech && avatarReady) {
      processSpeechWithBackend(text)
    }
  }, [onSpeechRecognized, autoProcessSpeech, avatarReady, processSpeechWithBackend])

  // Handle speech start
  const handleSpeechStart = useCallback(() => {
    setIsListening(true)
    setError(null)
    console.log('🎙️ Speech recognition started')
  }, [])

  // Handle speech end
  const handleSpeechEnd = useCallback(() => {
    setIsListening(false)
    console.log('🎙️ Speech recognition ended')
  }, [])

  // Handle avatar ready
  const handleAvatarReady = useCallback(() => {
    setAvatarReady(true)
    setError(null)
    initializeAvatarRef()
    console.log('✅ Avatar ready for interaction')
  }, [initializeAvatarRef])

  // Handle avatar error with enhanced recovery
  const handleAvatarError = useCallback((errorMessage: string) => {
    console.error('🚨 Avatar error:', errorMessage)
    setError(errorMessage)
    setIsListening(false)
    setIsSpeaking(false)
    setIsProcessing(false)
    onError?.(errorMessage)
    
    // Try to reinitialize avatar after a delay
    setTimeout(() => {
      initializeAvatarRef()
    }, 2000)
  }, [onError, initializeAvatarRef])

  // Clear error and reset state
  const clearError = useCallback(() => {
    setError(null)
    setIsProcessing(false)
  }, [])

  // Manual trigger for speech processing (for text input)
  const processTextInput = useCallback(async (text: string) => {
    if (text.trim()) {
      await processSpeechWithBackend(text)
    }
  }, [processSpeechWithBackend])

  // Stop current speaking
  const stopSpeaking = useCallback(async () => {
    try {
      if (avatarRef.current?.stopSpeaking) {
        await avatarRef.current.stopSpeaking()
      } else {
        // Fallback: stop browser speech synthesis
        if ('speechSynthesis' in window) {
          speechSynthesis.cancel()
        }
      }
      setIsSpeaking(false)
    } catch (error) {
      console.error('Error stopping speech:', error)
      setIsSpeaking(false)
    }
  }, [])

  // Start listening manually
  const startListening = useCallback(async () => {
    try {
      // Try to get avatar from global scope if not available
      if (!avatarRef.current && typeof window !== 'undefined') {
        avatarRef.current = (window as any).azureAvatar
      }

      if (avatarRef.current?.startListening && !isListening && avatarReady) {
        await avatarRef.current.startListening()
        console.log('🎙️ Started listening manually')
      } else {
        console.warn('Avatar not available, not ready, or already listening')
      }
    } catch (error) {
      console.error('❌ Error starting listening:', error)
      setError(`Failed to start listening: ${error}`)
    }
  }, [isListening, avatarReady])

  // Stop listening
  const stopListening = useCallback(async () => {
    try {
      if (avatarRef.current?.stopListening) {
        await avatarRef.current.stopListening()
      }
      setIsListening(false)
    } catch (error) {
      console.error('Error stopping listening:', error)
      setIsListening(false)
    }
  }, [])

  // Periodically check avatar status
  useEffect(() => {
    const checkAvatarStatus = () => {
      if (typeof window !== 'undefined') {
        const globalAvatar = (window as any).azureAvatar
        if (globalAvatar) {
          avatarRef.current = globalAvatar
          const newAvatarReady = globalAvatar.isReady || false
          if (newAvatarReady !== avatarReady) {
            setAvatarReady(newAvatarReady)
          }
          
          // Sync state with global avatar
          if (globalAvatar.isListening !== undefined && globalAvatar.isListening !== isListening) {
            setIsListening(globalAvatar.isListening)
          }
          if (globalAvatar.isSpeaking !== undefined && globalAvatar.isSpeaking !== isSpeaking) {
            setIsSpeaking(globalAvatar.isSpeaking)
          }
        }
      }
    }

    const interval = setInterval(checkAvatarStatus, 1000)
    return () => clearInterval(interval)
  }, [avatarReady, isListening, isSpeaking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    isListening,
    isSpeaking,
    avatarReady,
    error,
    isProcessing,
    
    // Actions
    speakText,
    processTextInput,
    startListening,
    stopSpeaking,
    stopListening,
    clearError,
    
    // Event handlers for Avatar component
    handleSpeechRecognized,
    handleSpeechStart,
    handleSpeechEnd,
    handleAvatarReady,
    handleAvatarError
  }
}