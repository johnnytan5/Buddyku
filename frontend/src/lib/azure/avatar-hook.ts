'use client'

import { useEffect, useRef, useCallback } from 'react'
import { AzureConnectionManager } from './connection-manager'
import { useAvatarState } from './avatar-state'
import { AVATAR_CONFIGS, AvatarCallbacks, TIMEOUTS, MAX_RECONNECT_ATTEMPTS } from './types'

interface UseAzureAvatarOptions extends AvatarCallbacks {
  autoStart?: boolean
  avatarConfigIndex?: number
  enableContinuousConversation?: boolean
}

export function useAzureAvatar(options: UseAzureAvatarOptions = {}) {
  const { state, actions } = useAvatarState()
  
  // Refs for persistent objects
  const connectionManagerRef = useRef<AzureConnectionManager | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Queue for pending media tracks that arrived before elements were ready
  const pendingVideoTrackRef = useRef<{ event: RTCTrackEvent } | null>(null)
  const pendingAudioTrackRef = useRef<{ event: RTCTrackEvent } | null>(null)
  // Get Azure credentials
  const credentials = {
    speechKey: process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || '',
    speechRegion: process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || ''
  }

  // Validate credentials
  const hasValidCredentials = credentials.speechKey && credentials.speechRegion &&
    credentials.speechKey !== 'your_speech_key_here' &&
    credentials.speechRegion !== 'your_region_here'

  // Error handler with callback
  const handleError = useCallback((error: string) => {
    console.error('🚨 Avatar Error:', error)
    actions.setError(error)
    options.onError?.(error)
  }, [actions, options])

  // Function to assign media track to element with retry
  const assignMediaTrack = useCallback((event: RTCTrackEvent) => {
    const { track } = event
    console.log(`📺 Attempting to assign ${track.kind} track`)
    
    const mediaElement = track.kind === 'video' ? videoRef.current : audioRef.current
    console.log(`📺 Media element for ${track.kind}:`, mediaElement ? 'Found' : 'NOT FOUND')
    
    if (!mediaElement) {
      // Store the track event for later processing
      if (track.kind === 'video') {
        console.log('📺 Queueing video track for later assignment')
        pendingVideoTrackRef.current = { event }
      } else {
        console.log('📺 Queueing audio track for later assignment')
        pendingAudioTrackRef.current = { event }
      }
      return false
    }

    console.log(`📺 Setting srcObject for ${track.kind}`)
    console.log(`📺 Stream details:`, {
      streamId: event.streams[0]?.id,
      streamActive: event.streams[0]?.active,
      videoTracks: event.streams[0]?.getVideoTracks().length,
      audioTracks: event.streams[0]?.getAudioTracks().length
    })
    
    mediaElement.srcObject = event.streams[0]
    
    // Add more detailed logging for video element
    if (track.kind === 'video') {
      if (mediaElement instanceof HTMLVideoElement) {
        console.log(`📺 Video element state after setting srcObject:`, {
          srcObject: !!mediaElement.srcObject,
          videoWidth: mediaElement instanceof HTMLVideoElement ? mediaElement.videoWidth : undefined,
          videoHeight: mediaElement instanceof HTMLVideoElement ? mediaElement.videoHeight : undefined,
          readyState: mediaElement.readyState,
          networkState: mediaElement.networkState,
          paused: mediaElement.paused,
          ended: mediaElement.ended,
          currentTime: mediaElement.currentTime
        })
      }
      
      // Force video to load and play
      mediaElement.load()
    }
    
    mediaElement.play().then(() => {
      console.log(`▶️ ${track.kind} playback started successfully`)
      if (track.kind === 'video') {
        console.log(`📺 Video playing:`, {
          videoWidth: mediaElement instanceof HTMLVideoElement ? mediaElement.videoWidth : undefined,
          videoHeight: mediaElement instanceof HTMLVideoElement ? mediaElement.videoHeight : undefined,
          duration: mediaElement.duration,
          currentTime: mediaElement.currentTime
        })
      }
    }).catch(error => {
      console.error(`❌ ${track.kind} playback error:`, error)
      if (error.name === 'NotAllowedError') {
        actions.setAudioBlocked(true)
        console.warn(`▶️ Playback blocked: ${error.message}. User interaction required.`)
      } else {
        console.error(`▶️ Playback error: ${error.message}`)
      }
    })
    
    return true
  }, [actions])

  // Process pending tracks when elements become available
  const processPendingTracks = useCallback(() => {
    console.log('📺 Processing pending tracks...')
    
    // Process pending video track
    if (pendingVideoTrackRef.current && videoRef.current) {
      console.log('📺 Processing queued video track')
      if (assignMediaTrack(pendingVideoTrackRef.current.event)) {
        pendingVideoTrackRef.current = null
      }
    }
    
    // Process pending audio track
    if (pendingAudioTrackRef.current && audioRef.current) {
      console.log('📺 Processing queued audio track')
      if (assignMediaTrack(pendingAudioTrackRef.current.event)) {
        pendingAudioTrackRef.current = null
      }
    }
  }, [assignMediaTrack])



  // Initialize avatar
  const initializeAvatar = useCallback(async () => {
    if (state.isLoading) return

    // Ensure connection manager is initialized
    if (!connectionManagerRef.current) {
      const langCode = 'en-US'
      connectionManagerRef.current = new AzureConnectionManager(credentials, langCode)
    }

    try {
      actions.initializeStart()

      // Initialize Speech SDK
      await connectionManagerRef.current.initializeSDK()

      // Verify SDK is ready before proceeding
      if (!connectionManagerRef.current.isReadyForAvatar) {
        throw new Error('Speech SDK not properly initialized')
      }

      // Get avatar configuration
      const avatarConfig = AVATAR_CONFIGS[options.avatarConfigIndex || 0]
      if (!avatarConfig) {
        throw new Error('Invalid avatar configuration index')
      }
      actions.updateConfig(avatarConfig)

      // Fetch ICE servers
      const iceServers = await connectionManagerRef.current.fetchICEServers()

      // Setup WebRTC
      const peerConnection = await connectionManagerRef.current.setupWebRTC(iceServers)

      // Setup WebRTC event handlers
      setupWebRTCHandlers(peerConnection)

      // Create avatar synthesizer
      const avatarSDKConfig = connectionManagerRef.current.createAvatarConfig(
        avatarConfig.character, 
        avatarConfig.style, 
        avatarConfig.background
      )
      
      connectionManagerRef.current.createAvatarSynthesizer(avatarSDKConfig)

      // Create speech recognizer
      connectionManagerRef.current.createSpeechRecognizer()

      // Start avatar session
      await connectionManagerRef.current.startAvatarSession(peerConnection)

      actions.initializeSuccess()
      actions.setAvatarReady()
      actions.setSessionActive(true)
      
      options.onAvatarReady?.()
      console.log('✅ Avatar initialized successfully')

    } catch (error) {
      const errorMessage = `Avatar initialization failed: ${error}`
      handleError(errorMessage)
      
      // Attempt reconnection if not too many attempts
      if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        scheduleReconnect()
      }
    }
  }, [state.isLoading, state.reconnectAttempts, actions, options, handleError, credentials])

  // Setup WebRTC event handlers
  const setupWebRTCHandlers = useCallback((peerConnection: RTCPeerConnection) => {
    // Handle incoming media tracks
    peerConnection.ontrack = (event) => {
      console.log(`📺 WebRTC ${event.track.kind} track received`)
      console.log(`📺 Track details:`, {
        kind: event.track.kind,
        id: event.track.id,
        label: event.track.label,
        readyState: event.track.readyState,
        enabled: event.track.enabled,
        muted: event.track.muted
      })
      console.log(`📺 Streams:`, event.streams.length, event.streams)
      
      // Try to assign the track immediately, or queue it for later
      assignMediaTrack(event)
    }

    // Handle connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log('🔗 WebRTC connection state:', peerConnection.iceConnectionState)
      
      if (peerConnection.iceConnectionState === 'connected') {
        actions.setSessionActive(true)
        resetSessionTimeout()
      } else if (peerConnection.iceConnectionState === 'disconnected' || 
                 peerConnection.iceConnectionState === 'failed') {
        actions.setSessionActive(false)
        if (!state.isReconnecting && state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          scheduleReconnect()
        }
      }
    }

    // Handle data channel for events
    peerConnection.addEventListener('datachannel', (event) => {
      const dataChannel = event.channel
      dataChannel.onmessage = (e) => {
        try {
          const webRTCEvent = JSON.parse(e.data)
          handleWebRTCEvent(webRTCEvent)
        } catch (error) {
          console.error('❌ Failed to parse WebRTC event:', error)
        }
      }
    })
  }, [actions, state.isReconnecting, state.reconnectAttempts, assignMediaTrack])

  // Handle WebRTC events from Azure
  const handleWebRTCEvent = useCallback((event: any) => {
    console.log('📨 WebRTC event:', event.event?.eventType)
    
    switch (event.event?.eventType) {
      case 'EVENT_TYPE_TURN_START':
        actions.startSpeaking()
        break
      case 'EVENT_TYPE_SESSION_END':
        actions.setSessionActive(false)
        if (!state.isReconnecting && state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          scheduleReconnect()
        }
        break
      case 'EVENT_TYPE_SWITCH_TO_IDLE':
        actions.stopSpeaking()
        break
    }
  }, [actions, state.isReconnecting, state.reconnectAttempts])

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) return

    actions.startReconnect()
    const delay = TIMEOUTS.RECONNECT_DELAY * Math.pow(2, state.reconnectAttempts)
    
    console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${state.reconnectAttempts + 1})`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null
      initializeAvatar()
    }, delay)
  }, [actions, state.reconnectAttempts, initializeAvatar])

  // Reset session timeout
  const resetSessionTimeout = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current)
    }
    
    sessionTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Session timeout - closing inactive session')
      actions.setSessionActive(false)
    }, TIMEOUTS.SESSION_IDLE)
  }, [actions])

  // Speak text with queue management
  const speakText = useCallback(async (text: string): Promise<boolean> => {
    if (!text?.trim() || !connectionManagerRef.current?.hasAvatarSynthesizer) {
      return false
    }

    try {
      // Add to queue if currently speaking
      if (state.isSpeaking) {
        actions.addToQueue(text)
        return true
      }

      actions.startSpeaking()
      resetSessionTimeout()
      
      const success = await connectionManagerRef.current.speakText(text)
      
      if (success) {
        // Calculate estimated speaking duration (roughly 150 words per minute)
        const wordCount = text.split(' ').length
        const estimatedDuration = (wordCount / 150) * 60 * 1000 // Convert to milliseconds
        const minDuration = 2000 // Minimum 2 seconds
        const maxDuration = 15000 // Maximum 15 seconds
        const speakingDuration = Math.max(minDuration, Math.min(maxDuration, estimatedDuration))
        
        console.log(`🗣️ Speaking for approximately ${speakingDuration}ms (${wordCount} words)`)
        
        // Process queue after estimated speaking duration
        setTimeout(() => {
          actions.stopSpeaking()
          if (state.spokenTextQueue.length > 0) {
            const nextText = state.spokenTextQueue[0]
            actions.removeFromQueue()
            speakText(nextText)
          }
        }, speakingDuration)
      } else {
        actions.stopSpeaking()
      }
      
      return success
    } catch (error) {
      console.error('❌ Speak text error:', error)
      actions.stopSpeaking()
      return false
    }
  }, [state.isSpeaking, state.spokenTextQueue, actions, resetSessionTimeout])

  // Stop speaking
  const stopSpeaking = useCallback(async () => {
    try {
      if (connectionManagerRef.current?.hasAvatarSynthesizer) {
        await connectionManagerRef.current.stopSpeaking()
      }
      actions.stopSpeaking()
      // Clear the queue
      while (state.spokenTextQueue.length > 0) {
        actions.removeFromQueue()
      }
    } catch (error) {
      console.error('❌ Stop speaking error:', error)
    }
  }, [actions, state.spokenTextQueue])

  // Resume audio playback
  const resumeAudio = useCallback(async () => {
    if (!state.isAudioBlocked) return

    console.log('🎧 Attempting to resume audio playback...')
    
    try {
      if (videoRef.current) await videoRef.current.play()
      if (audioRef.current) await audioRef.current.play()
      
      actions.setAudioBlocked(false)
      console.log('✅ Audio playback resumed successfully')
    } catch (error) {
      console.error('❌ Failed to resume audio playback:', error)
    }
  }, [state.isAudioBlocked, actions])

  // Start listening
  const startListening = useCallback(async () => {
    if (state.isAudioBlocked) {
      await resumeAudio()
    }
  
    if (!connectionManagerRef.current?.hasRecognizer || state.isListening) return

    try {
      actions.startListening()
      resetSessionTimeout()
      options.onSpeechStart?.()
      
      await connectionManagerRef.current.startContinuousRecognition({
        onRecognized: (text: string) => {
          console.log('🎙️ Speech recognized:', text)
          actions.stopListening()
          options.onSpeechRecognized?.(text)
          options.onSpeechEnd?.()
        },
        onStarted: () => {
          console.log('🎙️ Speech recognition started')
        },
        onStopped: () => {
          console.log('🎙️ Speech recognition stopped') 
          actions.stopListening()
          options.onSpeechEnd?.()
        },
        onError: (error: string) => {
          console.error('🎙️ Speech recognition error:', error)
          actions.stopListening()
          options.onSpeechEnd?.()
          handleError(`Speech recognition failed: ${error}`)
        }
      })
    } catch (error) {
      actions.stopListening()
      handleError(`Failed to start listening: ${error}`)
    }
  }, [state.isListening, state.isAudioBlocked, actions, options, resetSessionTimeout, handleError, resumeAudio])

  // Stop listening
  const stopListening = useCallback(async () => {
    try {
      if (connectionManagerRef.current?.hasRecognizer) {
        await connectionManagerRef.current.stopContinuousRecognition()
      }
      actions.stopListening()
      options.onSpeechEnd?.()
    } catch (error) {
      console.error('❌ Stop listening error:', error)
    }
  }, [actions, options])

  // Toggle continuous conversation
  const toggleContinuousConversation = useCallback(() => {
    actions.toggleContinuous()
  }, [actions])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current)
      }
      if (connectionManagerRef.current) {
        connectionManagerRef.current.cleanup()
      }
    }
  }, [])

  // Auto-initialize if enabled
  useEffect(() => {
    if (options.autoStart && hasValidCredentials && !state.isInitialized && !state.isLoading) {
      // Ensure we don't re-initialize if already started
      if (!connectionManagerRef.current) {
        initializeAvatar()
      }
    }
  }, [options.autoStart, hasValidCredentials, state.isInitialized, state.isLoading, initializeAvatar])

  // Process pending tracks when elements become available
  useEffect(() => {
    if (state.avatarReady) {
      console.log('📺 Avatar ready, checking for pending tracks...')
      processPendingTracks()
      
      // Set up periodic retry for pending tracks
      const retryInterval = setInterval(() => {
        if (pendingVideoTrackRef.current || pendingAudioTrackRef.current) {
          console.log('📺 Retrying pending track assignment...')
          processPendingTracks()
        }
      }, 1000) // Check every second
      
      return () => clearInterval(retryInterval)
    }
  }, [state.avatarReady, processPendingTracks])

  // Expose global avatar instance for compatibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).azureAvatar = {
        speakText,
        startListening,
        stopListening,
        stopSpeaking,
        isReady: state.avatarReady && state.sessionActive,
        isListening: state.isListening,
        isSpeaking: state.isSpeaking,
        isReconnecting: state.isReconnecting,
        currentConfig: state.currentAvatarConfig
      }
    }
  }, [speakText, startListening, stopListening, stopSpeaking, state])

  return {
    // State
    ...state,
    hasValidCredentials,
    
    // Actions
    initializeAvatar,
    speakText,
    stopSpeaking,
    startListening,
    stopListening,
    toggleContinuousConversation,
    clearError: actions.clearError,
    
    // Refs for video/audio elements
    videoRef,
    audioRef
  }
}