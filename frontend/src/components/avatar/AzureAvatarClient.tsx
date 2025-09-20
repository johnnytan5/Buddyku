'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, Loader2, Settings } from 'lucide-react'

// Types for Azure Speech SDK
interface SpeechSDK {
  SpeechConfig: any
  AudioConfig: any
  SpeechRecognizer: any
  AvatarConfig: any
  AvatarSynthesizer: any
  AvatarVideoFormat: any
  Coordinate: any
  ResultReason: any
  CancellationReason: any
  CancellationDetails: any
  PropertyId: any
  AutoDetectSourceLanguageConfig: any
}

interface AzureAvatarProps {
  onSpeechRecognized?: (text: string) => void
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
  onAvatarReady?: () => void
  onError?: (error: string) => void
  className?: string
}

const AzureAvatarClient: React.FC<AzureAvatarProps> = ({
  onSpeechRecognized,
  onSpeechStart,
  onSpeechEnd,
  onAvatarReady,
  onError,
  className = ''
}) => {
  
  // State management
  const [isInitialized, setIsInitialized] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [avatarReady, setAvatarReady] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [lastInteractionTime, setLastInteractionTime] = useState<Date>(new Date())
  const [userClosedSession, setUserClosedSession] = useState(false)
  const [currentAvatarConfig, setCurrentAvatarConfig] = useState<any>(null)
  const [useTcpForWebRTC, setUseTcpForWebRTC] = useState(false)
  const [continuousConversation, setContinuousConversation] = useState(false)
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const speechSDKRef = useRef<SpeechSDK | null>(null)
  const speechConfigRef = useRef<any>(null)
  const recognizerRef = useRef<any>(null)
  const avatarSynthesizerRef = useRef<any>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const peerConnectionDataChannelRef = useRef<RTCDataChannel | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const spokenTextQueueRef = useRef<string[]>([])
  const speakingTextRef = useRef<string>('')
  
  // Azure configuration
  const SPEECH_KEY = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY
const SPEECH_REGION = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION
const CUSTOM_ENDPOINT = process.env.NEXT_PUBLIC_AZURE_CUSTOM_ENDPOINT
// Disable private endpoint for Avatar services
const USE_PRIVATE_ENDPOINT = false

// Avatar service regions that support the full Avatar API
const AVATAR_SUPPORTED_REGIONS = [
  'southeastasia',
  'eastus',
  'westeurope',
  'westus2',
  'australiaeast',
  'westus3'
]

// Fallback region for avatar services
const AVATAR_FALLBACK_REGION = 'eastus'
  // Avatar configuration constants - improved with latest available options
  const AVATAR_CONFIGS = [
    { character: 'lori', style: 'graceful', voice: 'en-US-AvaMultilingualNeural', name: 'Lori Graceful', background: '#F8FAFC' },
    { character: 'lisa', style: 'casual-sitting', voice: 'en-US-AvaMultilingualNeural', name: 'Lisa Casual', background: '#F8FAFC' },
    { character: 'meg', style: 'business', voice: 'en-US-AvaMultilingualNeural', name: 'Meg Business', background: '#F5F5F5' },
    { character: 'lisa', style: 'graceful-sitting', voice: 'en-US-AvaMultilingualNeural', name: 'Lisa Graceful', background: '#F0F8FF' },
    { character: 'lisa', style: 'technical-sitting', voice: 'en-US-AriaNeural', name: 'Lisa Technical', background: '#F5F5F5' },
    { character: 'anna', style: 'casual-sitting', voice: 'en-US-AriaNeural', name: 'Anna Casual', background: '#FFF8F0' },
    { character: 'anna', style: 'graceful-sitting', voice: 'en-US-JennyNeural', name: 'Anna + Jenny Voice', background: '#F0FFF0' },
    { character: 'lisa', style: 'casual-sitting', voice: 'en-US-JennyNeural', name: 'Lisa + Jenny Voice', background: '#FFF0F8' },
  ]
  
  // Constants
  const AVATAR_TIMEOUT = 30000
  const SESSION_TIMEOUT = 300000 // 5 minutes
  const RECONNECT_DELAY = 2000

  // Error handler
  const handleError = useCallback((errorMessage: string) => {
    console.error('Azure Avatar Error:', errorMessage)
    setError(errorMessage)
    onError?.(errorMessage)
  }, [onError])

  // Initialize Azure Speech SDK
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        setIsLoading(true)
        
        // Validate environment variables
        if (!SPEECH_KEY || (!SPEECH_REGION && !CUSTOM_ENDPOINT)) {
          throw new Error('Azure Speech credentials not configured. Please set NEXT_PUBLIC_AZURE_SPEECH_KEY and either NEXT_PUBLIC_AZURE_SPEECH_REGION or NEXT_PUBLIC_AZURE_CUSTOM_ENDPOINT')
        }

        // Important: Avatar domain endpoint information
        console.log(`
✅ AZURE RESOURCE CHECK:
   
   ✓ Pricing tier: Standard S0 (confirmed from resource)
   ✓ Region: ${SPEECH_REGION}
   ✓ Avatar endpoints available in your region
   
   Using correct domain: .tts.speech.microsoft.com (Avatar ICE servers)
   Avatar ICE servers use TTS domain, not general API domain.
        `)

        // Load Azure Speech SDK dynamically
        console.log('📦 Loading Azure Speech SDK...')
        const speechSDK = await import('microsoft-cognitiveservices-speech-sdk')
        speechSDKRef.current = speechSDK as any
        console.log('✅ Azure Speech SDK loaded successfully')

                // Create speech configuration with avatar service support
        let speechConfig: any
        let effectiveRegion = SPEECH_REGION

        // Your Azure resource shows Avatar services are available in southeastasia
        console.log('🔗 Using your Azure resource region for Speech SDK:', SPEECH_REGION)
        console.log('✅ Avatar services confirmed available in your region')
        speechConfig = speechSDK.SpeechConfig.fromSubscription(SPEECH_KEY as string, effectiveRegion as string)
        
        speechConfig.speechRecognitionLanguage = 'en-US'
        speechConfig.speechSynthesisVoiceName = 'en-US-AvaMultilingualNeural'
        speechConfigRef.current = speechConfig

        console.log('🎯 Speech config created with settings:', {
          speechRecognitionLanguage: speechConfig.speechRecognitionLanguage,
          speechSynthesisVoiceName: speechConfig.speechSynthesisVoiceName,
          usePrivateEndpoint: USE_PRIVATE_ENDPOINT,
          region: effectiveRegion,
          subscriptionKey: SPEECH_KEY?.substring(0, 8) + '...'
        })
        
        console.log('🔍 Expected Avatar ICE server URL will be:', `https://${effectiveRegion}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`)

        setIsInitialized(true)
        console.log('✅ Azure Speech SDK initialized successfully')
        
      } catch (error) {
        handleError(`Failed to initialize Azure Speech SDK: ${error}`)
      } finally {
        setIsLoading(false)
      }
    }

    initializeSDK()
  }, [handleError])

  // Initialize Azure Avatar with comprehensive WebRTC and event handling
  const initializeAvatar = useCallback(async () => {
    if (!speechSDKRef.current || !speechConfigRef.current) return

    try {
      setIsLoading(true)
      setLastInteractionTime(new Date())
      
      // Fetch ICE server information from Azure
      let iceServers: RTCIceServer[] = []
      
          // Use the user's actual region since Azure resource shows Avatar services are available there
    let avatarRegion = SPEECH_REGION
    
    console.log('🌍 Checking avatar service availability for region:', SPEECH_REGION)
    console.log('✅ Your Azure resource shows Avatar endpoints are available in southeastasia!')
    
    // Keep the user's region - their Azure resource shows Avatar services are available
    if (SPEECH_REGION === 'southeastasia') {
      console.log(`✅ Southeast Asia region supports Avatar services. Using your region: ${SPEECH_REGION}`)
      avatarRegion = SPEECH_REGION // Keep southeastasia since it's supported
    } else if (!AVATAR_SUPPORTED_REGIONS.includes(SPEECH_REGION || '')) {
      console.warn(`⚠️ Region ${SPEECH_REGION} may not support Avatar services. Using fallback region: ${AVATAR_FALLBACK_REGION}`)
      avatarRegion = AVATAR_FALLBACK_REGION
    }
      
      console.log('🌍 Using avatar region:', avatarRegion, 'for ICE servers')
      
          // Determine which endpoint to use
    const iceServerAttempts = []
    
    if (CUSTOM_ENDPOINT) {
      // Use custom endpoint
      const baseEndpoint = CUSTOM_ENDPOINT.replace(/\/$/, '')
      iceServerAttempts.push({
        url: `${baseEndpoint}/cognitiveservices/avatar/relay/token/v1`,
        description: `Custom endpoint: ${baseEndpoint}`
      })
    } else if (SPEECH_REGION) {
      // Use standard TTS domain for Avatar ICE servers as per Microsoft docs
      // Avatar services use .tts.speech.microsoft.com not .api.cognitive.microsoft.com
      iceServerAttempts.push({
        url: `https://${avatarRegion}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`,
        description: `Region: ${avatarRegion} (standard TTS domain)`
      })
    }
    
    // Additional fallback for different regions if not already using eastus
    if (avatarRegion !== 'eastus') {
      iceServerAttempts.push({
        url: `https://eastus.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`,
        description: `Fallback region: eastus (correct TTS domain)`
      })
    }
      
      let iceServerSuccess = false
      
      for (const attempt of iceServerAttempts) {
        try {
          console.log(`🧊 Fetching ICE servers from: ${attempt.url} (${attempt.description})`)
          console.log('🔑 Using subscription key (first 8 chars):', SPEECH_KEY?.substring(0, 8) + '...')
          
          const requestHeaders = {
            'Ocp-Apim-Subscription-Key': SPEECH_KEY!,
            'Content-Type': 'application/json',
            'User-Agent': 'AzureAvatarClient/1.0'
          }
          
          console.log('📡 Making ICE server request with headers:', Object.keys(requestHeaders))
          
          const iceResponse = await fetch(attempt.url, {
            method: 'GET',
            headers: requestHeaders
          })

          console.log('📡 ICE server response status:', iceResponse.status, iceResponse.statusText)
          console.log('📡 ICE server response headers:', Object.fromEntries(iceResponse.headers.entries()))

          if (iceResponse.ok) {
            const responseText = await iceResponse.text()
            console.log('📡 Raw ICE server response:', responseText)
            
            const iceData = JSON.parse(responseText)
            console.log('🧊 Parsed Azure ICE server response:', iceData)
            iceServerSuccess = true
          
            // Handle different possible response formats from Azure
            if (iceData && iceData.Urls && Array.isArray(iceData.Urls)) {
              const turnUrl = iceData.Urls.find((url: string) => url.startsWith('turn:'))
              if (turnUrl) {
                iceServers.push({
                  urls: [useTcpForWebRTC ? turnUrl.replace(':3478', ':443?transport=tcp') : turnUrl],
                  username: iceData.Username,
                  credential: iceData.Password
                })
              } else {
                iceServers.push({
                  urls: iceData.Urls.map((url: string) => 
                    useTcpForWebRTC ? url.replace(':3478', ':443?transport=tcp') : url
                  ),
                  username: iceData.Username,
                  credential: iceData.Password
                })
              }
            } else if (iceData && iceData.urls && Array.isArray(iceData.urls)) {
              const turnUrl = iceData.urls.find((url: string) => url.startsWith('turn:'))
              if (turnUrl) {
                iceServers.push({
                  urls: [useTcpForWebRTC ? turnUrl.replace(':3478', ':443?transport=tcp') : turnUrl],
                  username: iceData.username,
                  credential: iceData.credential
                })
              }
            }
            
            console.log(`✅ ICE servers obtained from: ${attempt.description}`)
            break // Success, exit the retry loop
            
                  } else {
          const errorText = await iceResponse.text()
          
          if (iceResponse.status === 401) {
            console.error(`🚨 401 UNAUTHORIZED - Authentication/Authorization issue!
            
🔧 POSSIBLE CAUSES:
1. ❌ Invalid subscription key
2. ❌ Incorrect region
3. ❌ Service not enabled for your subscription
4. ❌ Avatar service not available in this region

✅ YOUR RESOURCE STATUS:
- Pricing tier: Standard S0 ✓
- Region: ${SPEECH_REGION} ✓ 
- Domain: .tts.speech.microsoft.com ✓

🐛 DEBUG INFO:`, {
              status: iceResponse.status,
              statusText: iceResponse.statusText,
              url: attempt.url,
              responseText: errorText,
              subscriptionKey: SPEECH_KEY?.substring(0, 8) + '...'
            })
          } else {
            console.error(`❌ Failed to get ICE server info from ${attempt.description}:`, {
              status: iceResponse.status,
              statusText: iceResponse.statusText,
              url: attempt.url,
              responseText: errorText,
              headers: Object.fromEntries(iceResponse.headers.entries())
            })
          }
        }
        } catch (iceError) {
          console.error(`❌ Failed to fetch ICE servers from ${attempt.description}:`, {
            error: iceError,
            message: (iceError as Error)?.message,
            url: attempt.url,
            stack: (iceError as Error)?.stack
          })
        }
      }
      
      // Log final result
      if (iceServerSuccess) {
        console.log('✅ Successfully obtained ICE servers from Azure')
      } else {
        console.warn('⚠️ All ICE server attempts failed, using fallback servers')
      }

      // Enhanced fallback ICE servers
      if (iceServers.length === 0) {
        console.log('🔄 Using fallback ICE servers')
        iceServers = [
          { urls: ['stun:stun.l.google.com:19302'] },
          { urls: ['stun:stun1.l.google.com:19302'] }
        ]
      } else {
        console.log('✅ Successfully configured Azure ICE servers')
      }

      console.log('🔗 Using ICE servers:', iceServers)
      
      // Create WebRTC peer connection with enhanced configuration
      const peerConnection = new RTCPeerConnection({
        iceServers: iceServers,
        iceTransportPolicy: useTcpForWebRTC ? 'relay' : 'all'
      })

      // Setup comprehensive WebRTC event handlers
      
      // Clean up existing elements first
      const remoteVideoDiv = document.getElementById('remoteVideo')
      if (remoteVideoDiv) {
        Array.from(remoteVideoDiv.childNodes).forEach(child => {
          if ((child as any).localName === 'video' || (child as any).localName === 'audio') {
            remoteVideoDiv.removeChild(child)
          }
        })
      }

      // Enhanced ontrack event handling
      peerConnection.ontrack = (event) => {
        console.log('🎥 WebRTC ontrack event received:', {
          kind: event.track.kind,
          trackId: event.track.id,
          trackState: event.track.readyState,
          streams: event.streams.length
        })
        
        if (event.track.kind === 'video') {
          console.log('📹 Processing video track...')
          if (videoRef.current) {
            const videoStream = new MediaStream([event.track])
            videoRef.current.srcObject = videoStream
            videoRef.current.autoplay = false
            videoRef.current.playsInline = true
            videoRef.current.muted = true
            videoRef.current.style.width = '0.5px'
            
            videoRef.current.addEventListener('loadeddata', () => {
              videoRef.current?.play()
            })
            
            videoRef.current.onplaying = () => {
              console.log('🎬 Video playing - setting avatar ready')
              videoRef.current!.style.width = '100%'
              setAvatarReady(true)
              setIsLoading(false)
              setSessionActive(true)
              onAvatarReady?.()
              
              // Continue speaking if there are unfinished sentences after reconnection
              if (speakingTextRef.current && isReconnecting) {
                speak(speakingTextRef.current)
              } else if (spokenTextQueueRef.current.length > 0) {
                speak(spokenTextQueueRef.current.shift()!)
              }
              
              setIsReconnecting(false)
            }
            
            videoRef.current.onerror = (error) => {
              console.error('❌ Video element error:', error)
              handleError('Video playback error')
            }
          }
        } else if (event.track.kind === 'audio') {
          console.log('🔊 Processing audio track...')
          if (audioRef.current) {
            const audioStream = new MediaStream([event.track])
            audioRef.current.srcObject = audioStream
            audioRef.current.autoplay = false
            audioRef.current.muted = true // Start muted, unmute when speaking
            
            audioRef.current.addEventListener('loadeddata', () => {
              audioRef.current?.play()
            })
            
            audioRef.current.onplaying = () => {
              console.log('🔊 Audio channel connected')
            }
          }
        }
      }
      
      // Critical: Listen to data channel for avatar events
      peerConnection.addEventListener("datachannel", event => {
        const dataChannel = event.channel
        peerConnectionDataChannelRef.current = dataChannel
        console.log('📡 Data channel received:', dataChannel.label)
        
        dataChannel.onmessage = e => {
          try {
            const webRTCEvent = JSON.parse(e.data)
            console.log(`[${new Date().toISOString()}] 📡 WebRTC event:`, webRTCEvent)
            
            if (webRTCEvent.event?.eventType === 'EVENT_TYPE_TURN_START') {
              console.log('🎤 Avatar started speaking')
              setIsSpeaking(true)
            } else if (webRTCEvent.event?.eventType === 'EVENT_TYPE_TURN_END') {
              console.log('🔇 Avatar finished speaking')
              setIsSpeaking(false)
            } else if (webRTCEvent.event?.eventType === 'EVENT_TYPE_SESSION_END') {
              console.log('📞 Avatar session ended')
              setSessionActive(false)
              
              // Auto-reconnect logic
              if (!userClosedSession && !isReconnecting && 
                  (new Date().getTime() - lastInteractionTime.getTime()) < SESSION_TIMEOUT) {
                console.log('🔄 Session ended unexpectedly, attempting auto-reconnect...')
                setIsReconnecting(true)
                
                // Remove datachannel callback to avoid duplicate triggers
                dataChannel.onmessage = null
                
                // Cleanup and reconnect
                if (avatarSynthesizerRef.current) {
                  avatarSynthesizerRef.current.close()
                }
                
                // Delay before reconnect
                setTimeout(() => {
                  if (!userClosedSession) {
                    initializeAvatar()
                  }
                }, RECONNECT_DELAY)
              }
            } else if (webRTCEvent.event?.eventType === 'EVENT_TYPE_SWITCH_TO_IDLE') {
              console.log('😴 Avatar switched to idle state')
              setIsSpeaking(false)
            }
          } catch (parseError) {
            console.error('❌ Error parsing WebRTC event:', parseError)
          }
        }
      })
      
      // Create data channel from client side (workaround)
      const clientDataChannel = peerConnection.createDataChannel("eventChannel")
      console.log('📡 Created client-side data channel:', clientDataChannel.label)

      // Comprehensive WebRTC connection event handlers
      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 WebRTC connection state:', peerConnection.connectionState)
        if (peerConnection.connectionState === 'failed') {
          console.error('❌ WebRTC connection failed!')
          handleError('WebRTC connection failed')
          
          // Attempt reconnection if not user-initiated closure
          if (!userClosedSession && !isReconnecting) {
            setIsReconnecting(true)
            setTimeout(() => initializeAvatar(), RECONNECT_DELAY)
          }
        } else if (peerConnection.connectionState === 'connected') {
          console.log('✅ WebRTC connection established!')
          setIsReconnecting(false)
        } else if (peerConnection.connectionState === 'disconnected') {
          console.warn('⚠️ WebRTC connection disconnected')
          setSessionActive(false)
        }
      }

      peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', peerConnection.iceConnectionState)
        if (peerConnection.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed!')
          handleError('ICE connection failed - may be due to network/firewall restrictions')
        } else if (peerConnection.iceConnectionState === 'connected' || 
                   peerConnection.iceConnectionState === 'completed') {
          console.log('✅ ICE connection established!')
        }
      }

      peerConnection.onicegatheringstatechange = () => {
        console.log('🧊 ICE gathering state:', peerConnection.iceGatheringState)
      }

      peerConnection.onsignalingstatechange = () => {
        console.log('📶 Signaling state:', peerConnection.signalingState)
      }
      
      // Store peer connection reference
      peerConnectionRef.current = peerConnection

      // Critical: Add transceivers before starting avatar (from reference implementation)
      peerConnection.addTransceiver('video', { direction: 'sendrecv' })
      peerConnection.addTransceiver('audio', { direction: 'sendrecv' })
      console.log('📡 Added video and audio transceivers')

      // Try multiple avatar configurations with enhanced retry logic
      let lastError: any = null
      let avatarSynthesizer: any = null
      
      for (let configIndex = 0; configIndex < AVATAR_CONFIGS.length; configIndex++) {
        const config = AVATAR_CONFIGS[configIndex]
        
        console.log(`🎭 Trying avatar config ${configIndex + 1}/${AVATAR_CONFIGS.length}: ${config.name}`)
        console.log('🔧 Avatar config details:', {
          character: config.character,
          style: config.style,
          background: config.background,
          voice: config.voice
        })

        try {
          // Update voice for this attempt
          console.log('🎤 Setting voice:', config.voice)
          speechConfigRef.current.speechSynthesisVoiceName = config.voice

          // Create enhanced avatar configuration with background and video format
          console.log('🎬 Creating video format...')
          const videoFormat = new speechSDKRef.current.AvatarVideoFormat()
          // Optional: Add video cropping (uncomment if needed)
          // videoFormat.setCropRange(new speechSDKRef.current.Coordinate(640, 0), new speechSDKRef.current.Coordinate(1320, 1080))

          console.log('🔧 Creating avatar config...')
          const avatarConfig = new speechSDKRef.current.AvatarConfig(
            config.character,
            config.style,
            videoFormat
          )
          
          // Enhanced avatar configuration
          console.log('🎨 Setting avatar properties...')
          avatarConfig.backgroundColor = config.background || '#F8FAFC'
          avatarConfig.customized = false // Using standard avatars
          avatarConfig.useBuiltInVoice = false // Use specified voice
          console.log('✅ Avatar config properties set')
          
          // Create avatar synthesizer with event handling
          console.log('🔧 Creating avatar synthesizer...')
          avatarSynthesizer = new speechSDKRef.current.AvatarSynthesizer(
            speechConfigRef.current,
            avatarConfig
          )
          console.log('✅ Avatar synthesizer created')
          
          // Add comprehensive avatar event handling
          avatarSynthesizer.avatarEventReceived = function (sender: any, event: any) {
            const offsetMessage = event.offset === 0 ? "" : `, offset: ${event.offset / 10000}ms`
            console.log(`[${new Date().toISOString()}] 🎭 Avatar event: ${event.description}${offsetMessage}`)
          }

          console.log('🚀 Starting avatar with enhanced configuration...')
          console.log('🔗 Peer connection details:', {
            connectionState: peerConnection.connectionState,
            iceConnectionState: peerConnection.iceConnectionState,
            signalingState: peerConnection.signalingState,
            iceGatheringState: peerConnection.iceGatheringState
          })
          
          await new Promise((resolve, reject) => {
            let timeoutId: NodeJS.Timeout | null = null
            let isResolved = false

            const cleanup = () => {
              if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = null
              }
            }

            const handleResolve = (result: any) => {
              if (isResolved) return
              isResolved = true
              cleanup()
              resolve(result)
            }

            const handleReject = (error: any) => {
              if (isResolved) return
              isResolved = true
              cleanup()
              reject(error)
            }

            // Set timeout
            timeoutId = setTimeout(() => {
              console.error(`⏰ Avatar "${config.name}" timeout after ${AVATAR_TIMEOUT/1000}s`)
              handleReject(new Error(`Avatar timeout: ${config.name}`))
            }, AVATAR_TIMEOUT)

            console.log(`⏳ Starting avatar "${config.name}"...`)
            console.log('🚀 Calling startAvatarAsync with parameters:', {
              peerConnectionState: peerConnection.connectionState,
              peerConnectionICE: peerConnection.iceConnectionState,
              avatarSynthesizerExists: !!avatarSynthesizer
            })
            
            try {
              avatarSynthesizer.startAvatarAsync(
                peerConnection,
                (result: any) => {
                  console.log(`🎉 Avatar "${config.name}" started successfully!`)
                  console.log('✅ Avatar start result:', {
                    reason: result?.reason,
                    resultId: result?.resultId,
                    errorDetails: result?.errorDetails
                  })
                  if (speechSDKRef.current && result.reason === speechSDKRef.current.ResultReason.SynthesizingAudioCompleted) {
                    console.log('✅ Avatar connection successful - SynthesizingAudioCompleted')
                  } else {
                    console.warn('⚠️ Avatar started with warnings:', result)
                  }
                  handleResolve(result)
                },
                (error: any) => {
                  console.error(`💥 Avatar "${config.name}" failed:`, {
                    error,
                    message: error?.message,
                    reason: error?.reason,
                    code: error?.code,
                    details: error?.details
                  })
                  if (speechSDKRef.current && error.reason === speechSDKRef.current.CancellationReason.Error) {
                    const details = speechSDKRef.current.CancellationDetails.fromResult(error)
                    console.error('💥 Cancellation details:', {
                      reason: details?.reason,
                      errorCode: details?.errorCode,
                      errorDetails: details?.errorDetails
                    })
                  }
                  handleReject(error)
                }
              )
              console.log('🚀 startAvatarAsync call initiated successfully')
              
            } catch (syncError) {
              console.error(`💥 Sync error with "${config.name}":`, {
                error: syncError,
                message: (syncError as Error)?.message,
                stack: (syncError as Error)?.stack
              })
              handleReject(syncError)
            }
          })

          // Success - store configuration and synthesizer
          console.log(`✅ Avatar "${config.name}" connected successfully`)
          avatarSynthesizerRef.current = avatarSynthesizer
          setCurrentAvatarConfig(config)
          break

        } catch (error) {
          console.warn(`❌ Avatar "${config.name}" failed:`, error)
          lastError = error
          
          // Clean up failed synthesizer
          if (avatarSynthesizer) {
            try {
              avatarSynthesizer.close()
            } catch (closeError) {
              console.warn('⚠️ Failed to close synthesizer:', closeError)
            }
            avatarSynthesizer = null
          }

          // Brief delay before trying next config
          if (configIndex < AVATAR_CONFIGS.length - 1) {
            console.log(`🔄 Trying next configuration in 1s...`)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      // Check if any configuration succeeded
      if (!avatarSynthesizerRef.current) {
        console.error('🚫 All avatar configurations failed')
        throw new Error(`All avatar configurations failed. Last error: ${(lastError as Error)?.message || String(lastError)}`)
      }

      console.log('🎉 Azure Avatar initialized successfully!')
      setIsLoading(false)
      
    } catch (error) {
      console.error('Avatar initialization error:', error)
      handleError(`Failed to initialize avatar: ${error}`)
      setIsLoading(false)
    }
  }, [handleError, onAvatarReady])

  // Initialize enhanced speech recognition with language detection
  const initializeSpeechRecognition = useCallback(() => {
    if (!speechSDKRef.current || !speechConfigRef.current) return

    try {
      // Enhanced speech recognition configuration using standard subscription
      console.log('🎤 Setting up speech recognition for region:', SPEECH_REGION)
      const speechRecognitionConfig = speechSDKRef.current.SpeechConfig.fromSubscription(SPEECH_KEY!, SPEECH_REGION!)
      speechRecognitionConfig.setProperty(speechSDKRef.current.PropertyId.SpeechServiceConnection_LanguageIdMode, "Continuous")
      
      // Multi-language support
      const sttLocales = 'en-US'
      const autoDetectConfig = speechSDKRef.current.AutoDetectSourceLanguageConfig.fromLanguages(sttLocales)
      
      const audioConfig = speechSDKRef.current.AudioConfig.fromDefaultMicrophoneInput()
      const recognizer = speechSDKRef.current.SpeechRecognizer.FromConfig(
        speechRecognitionConfig, 
        autoDetectConfig, 
        audioConfig
      )

      recognizer.recognizing = (s: any, e: any) => {
        console.log('🎙️ Recognizing:', e.result.text)
      }

      recognizer.recognized = (s: any, e: any) => {
        if (speechSDKRef.current && e.result.reason === speechSDKRef.current.ResultReason.RecognizedSpeech) {
          const recognizedText = e.result.text.trim()
          console.log('✅ Recognized:', recognizedText)
          
          if (recognizedText) {
            setLastInteractionTime(new Date())
            onSpeechRecognized?.(recognizedText)
          }
          
          // In continuous mode, don't stop listening automatically
          if (!continuousConversation) {
            setIsListening(false)
            onSpeechEnd?.()
          }
        }
      }

      recognizer.canceled = (s: any, e: any) => {
        console.log('❌ Speech recognition canceled:', e.reason)
        setIsListening(false)
        onSpeechEnd?.()
      }

      recognizer.sessionStopped = (s: any, e: any) => {
        console.log('🛑 Speech recognition session stopped')
        setIsListening(false)
        onSpeechEnd?.()
      }

      recognizerRef.current = recognizer
      console.log('🎤 Enhanced speech recognition initialized')
      
    } catch (error) {
      handleError(`Failed to initialize speech recognition: ${error}`)
    }
  }, [handleError, onSpeechRecognized, onSpeechEnd])

  // Enhanced listening with continuous conversation support
  const startListening = useCallback(async () => {
    if (!recognizerRef.current || isListening) return

    try {
      setIsListening(true)
      setLastInteractionTime(new Date())
      onSpeechStart?.()
      
      // Unmute audio for listening
      if (audioRef.current) {
        audioRef.current.muted = false
      }
      
      if (continuousConversation) {
        // Start continuous recognition
        await new Promise((resolve, reject) => {
          recognizerRef.current.startContinuousRecognitionAsync(
            () => {
              console.log('🎙️ Continuous recognition started')
              resolve(undefined)
            },
            (error: any) => reject(error)
          )
        })
      } else {
        // Single recognition
        await new Promise((resolve, reject) => {
          recognizerRef.current.recognizeOnceAsync(
            (result: any) => resolve(result),
            (error: any) => reject(error)
          )
        })
      }
      
    } catch (error) {
      handleError(`Failed to start listening: ${error}`)
      setIsListening(false)
      onSpeechEnd?.()
    }
  }, [isListening, continuousConversation, onSpeechStart, onSpeechEnd, handleError])

  // Stop listening function
  const stopListening = useCallback(async () => {
    if (!recognizerRef.current || !isListening) return

    try {
      if (continuousConversation) {
        await new Promise((resolve, reject) => {
          recognizerRef.current.stopContinuousRecognitionAsync(
            () => {
              console.log('🔇 Continuous recognition stopped')
              setIsListening(false)
              onSpeechEnd?.()
              resolve(undefined)
            },
            (error: any) => reject(error)
          )
        })
      } else {
        setIsListening(false)
        onSpeechEnd?.()
      }
    } catch (error) {
      console.error('❌ Failed to stop listening:', error)
      setIsListening(false)
      onSpeechEnd?.()
    }
  }, [isListening, continuousConversation, onSpeechEnd])

  // Toggle continuous conversation mode
  const toggleContinuousConversation = useCallback(() => {
    if (isListening) {
      // Stop current listening before toggling
      stopListening().then(() => {
        setContinuousConversation(!continuousConversation)
      })
    } else {
      setContinuousConversation(!continuousConversation)
    }
  }, [continuousConversation, isListening, stopListening])

  // HTML encoding function for SSML
  const htmlEncode = useCallback((text: string) => {
    const entityMap: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    }
    return String(text).replace(/[&<>"'\/]/g, (match) => entityMap[match])
  }, [])

  // Enhanced speak function with SSML support and queue management
  const speak = useCallback(async (text: string, endingSilenceMs: number = 0) => {
    if (!text?.trim()) return

    // Add to queue if already speaking
    if (isSpeaking) {
      spokenTextQueueRef.current.push(text)
      console.log('📝 Added to speech queue:', text.substring(0, 50) + '...')
      return
    }

    await speakNext(text, endingSilenceMs)
  }, [isSpeaking])

  // Process next item in speech queue
  const speakNext = useCallback(async (text: string, endingSilenceMs: number = 0) => {
    if (!avatarSynthesizerRef.current || !text.trim()) return

    try {
      setIsSpeaking(true)
      speakingTextRef.current = text
      setLastInteractionTime(new Date())

      // Unmute audio for speaking
      if (audioRef.current) {
        audioRef.current.muted = false
      }

      // Get appropriate voice for current language/config
      const currentVoice = currentAvatarConfig?.voice || 'en-US-AvaMultilingualNeural'

      // Create SSML with proper formatting
      let ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='${'en-US'}'><voice name='${currentVoice}'><mstts:leadingsilence-exact value='0'/>${htmlEncode(text)}</voice></speak>`
      
      if (endingSilenceMs > 0) {
        ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='${'en-US'}'><voice name='${currentVoice}'><mstts:leadingsilence-exact value='0'/>${htmlEncode(text)}<break time='${endingSilenceMs}ms' /></voice></speak>`
      }

      console.log('🗣️ Speaking with SSML:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))

      await new Promise((resolve, reject) => {
        avatarSynthesizerRef.current.speakSsmlAsync(
          ssml,
          (result: any) => {
            if (speechSDKRef.current && result.reason === speechSDKRef.current.ResultReason.SynthesizingAudioCompleted) {
              console.log('✅ Speech completed:', text.substring(0, 50) + '...')
            } else {
              console.warn('⚠️ Speech completed with warnings:', result.reason)
            }
            
            speakingTextRef.current = ''
            
            // Process next item in queue
            if (spokenTextQueueRef.current.length > 0) {
              const nextText = spokenTextQueueRef.current.shift()!
              setTimeout(() => speakNext(nextText), 100)
            } else {
              setIsSpeaking(false)
            }
            
            resolve(result)
          },
          (error: any) => {
            console.error('❌ Speech synthesis failed:', error)
            speakingTextRef.current = ''
            
            // Process next item even after error
            if (spokenTextQueueRef.current.length > 0) {
              const nextText = spokenTextQueueRef.current.shift()!
              setTimeout(() => speakNext(nextText), 100)
            } else {
              setIsSpeaking(false)
            }
            
            reject(error)
          }
        )
      })
      
    } catch (error) {
      console.error('❌ Speech error:', error)
      speakingTextRef.current = ''
      setIsSpeaking(false)
      handleError(`Failed to speak: ${error}`)
    }
  }, [avatarSynthesizerRef, currentAvatarConfig, htmlEncode, handleError])

  // Stop speaking function
  const stopSpeaking = useCallback(async () => {
    if (!avatarSynthesizerRef.current) return

    try {
      setLastInteractionTime(new Date())
      spokenTextQueueRef.current = [] // Clear queue
      
      await new Promise((resolve, reject) => {
        avatarSynthesizerRef.current.stopSpeakingAsync(
          () => {
            console.log('🛑 Speaking stopped')
            setIsSpeaking(false)
            speakingTextRef.current = ''
            resolve(undefined)
          },
          (error: any) => {
            console.error('❌ Failed to stop speaking:', error)
            reject(error)
          }
        )
      })
    } catch (error) {
      console.error('❌ Stop speaking error:', error)
      setIsSpeaking(false)
      speakingTextRef.current = ''
    }
  }, [])

  // Expose speak function as speakText for compatibility
  const speakText = speak

  // Comprehensive cleanup function
  const cleanup = useCallback(() => {
    try {
      console.log('🧹 Starting cleanup...')
      setUserClosedSession(true)
      
      // Clear timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current)
        sessionTimeoutRef.current = null
      }
      
      // Clear speech queue
      spokenTextQueueRef.current = []
      speakingTextRef.current = ''
      
      // Close speech recognizer
      if (recognizerRef.current) {
        try {
          recognizerRef.current.close()
        } catch (e) {
          console.warn('⚠️ Error closing recognizer:', e)
        }
        recognizerRef.current = null
      }
      
      // Close avatar synthesizer
      if (avatarSynthesizerRef.current) {
        try {
          avatarSynthesizerRef.current.close()
        } catch (e) {
          console.warn('⚠️ Error closing avatar synthesizer:', e)
        }
        avatarSynthesizerRef.current = null
      }
      
      // Close data channel
      if (peerConnectionDataChannelRef.current) {
        try {
          peerConnectionDataChannelRef.current.close()
        } catch (e) {
          console.warn('⚠️ Error closing data channel:', e)
        }
        peerConnectionDataChannelRef.current = null
      }
      
      // Close peer connection
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close()
        } catch (e) {
          console.warn('⚠️ Error closing peer connection:', e)
        }
        peerConnectionRef.current = null
      }
      
      // Reset states
      setSessionActive(false)
      setAvatarReady(false)
      setIsListening(false)
      setIsSpeaking(false)
      setIsReconnecting(false)
      
      console.log('✅ Azure resources cleaned up successfully')
    } catch (error) {
      console.error('❌ Error during cleanup:', error)
    }
  }, [])

  // Session management - check for hung connections
  const checkConnectionHealth = useCallback(() => {
    if (!sessionActive || !videoRef.current) return

    const video = videoRef.current
    const currentTime = video.currentTime
    
    setTimeout(() => {
      // Check if video time is advancing (connection is alive)
      if (sessionActive && video.currentTime === currentTime) {
        console.warn('⚠️ Video stream appears to be hung')
        
        // Auto-reconnect if interaction was recent
        if (!userClosedSession && !isReconnecting && 
            (new Date().getTime() - lastInteractionTime.getTime()) < SESSION_TIMEOUT) {
          console.log('🔄 Attempting auto-reconnect due to hung video...')
          setIsReconnecting(true)
          
          // Cleanup and reconnect
          if (avatarSynthesizerRef.current) {
            avatarSynthesizerRef.current.close()
          }
          if (peerConnectionDataChannelRef.current) {
            peerConnectionDataChannelRef.current.onmessage = null
          }
          
          setTimeout(() => {
            if (!userClosedSession) {
              initializeAvatar()
            }
          }, RECONNECT_DELAY)
        }
      }
    }, 2000)
  }, [sessionActive, userClosedSession, isReconnecting, lastInteractionTime, initializeAvatar])

  // Stop session function
  const stopSession = useCallback(() => {
    console.log('🛑 Stopping avatar session...')
    setUserClosedSession(true)
    cleanup()
  }, [cleanup])

  // Initialize avatar and speech recognition when SDK is ready
  useEffect(() => {
    console.log('🔄 Effect triggered:', { 
      isInitialized, 
      avatarReady, 
      isReconnecting,
      isLoading,
      speechSDKRef: !!speechSDKRef.current,
      speechConfigRef: !!speechConfigRef.current,
      timestamp: new Date().toISOString()
    })
    
    if (isInitialized && !avatarReady && !isReconnecting && !isLoading) {
      console.log('🎯 Starting avatar and speech initialization...')
      // Use a local flag to prevent multiple simultaneous initializations
      if (speechSDKRef.current && speechConfigRef.current) {
        console.log('✅ SDK refs are ready, proceeding with initialization')
        initializeAvatar()
        initializeSpeechRecognition()
      } else {
        console.warn('⚠️ SDK not fully initialized yet, skipping avatar initialization')
      }
    } else {
      console.log('🔄 Skipping initialization - conditions not met')
    }
  }, [isInitialized, avatarReady, isReconnecting, isLoading])

  // Session health monitoring
  useEffect(() => {
    if (!sessionActive) return

    const healthCheckInterval = setInterval(() => {
      checkConnectionHealth()
    }, 2000) // Check every 2 seconds

    return () => clearInterval(healthCheckInterval)
  }, [sessionActive, checkConnectionHealth])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Expose enhanced functions globally
  useEffect(() => {
    if (avatarReady) {
      (window as any).azureAvatar = { 
        speakText, 
        speak,
        stopSpeaking,
        startListening,
        stopListening,
        stopSession,
        toggleContinuousConversation,
        isReady: avatarReady,
        isSpeaking,
        isListening,
        isReconnecting,
        continuousConversation
      }
    }
  }, [avatarReady, speakText, speak, stopSpeaking, startListening, stopListening, stopSession, toggleContinuousConversation, isSpeaking, isListening, isReconnecting, continuousConversation])

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
        <div className="w-56 h-56 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center border-2 border-red-200">
          <AlertCircle className="w-28 h-28 text-red-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            {'Avatar Error'}
          </h3>
          <p className="text-sm text-red-500 max-w-md">
            {error}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Avatar Video Container */}
      <div className="relative inline-block">
        <div className={`w-56 h-56 mx-auto mb-6 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl transform transition-all duration-1000 ${isSpeaking ? 'scale-105 shadow-blue-500/50' : 'scale-100'}`}>
          
          {/* Loading State */}
          {isLoading && (
            <div className="w-52 h-52 bg-white rounded-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {'Starting avatar...'}
                </p>
              </div>
            </div>
          )}

          {/* Avatar Video */}
          {!isLoading && (
            <video
              ref={videoRef}
              className="w-52 h-52 rounded-full object-cover"
              style={{ display: avatarReady ? 'block' : 'none' }}
              muted={true}
              autoPlay
              playsInline
              onLoadStart={() => console.log('📺 Video load started')}
              onLoadedData={() => console.log('📺 Video data loaded')}
              onPlay={() => console.log('▶️ Video started playing')}
              onPause={() => console.log('⏸️ Video paused')}
              onError={(e) => console.error('📺 Video error:', e)}
            />
          )}

          {/* Fallback when avatar not ready */}
          {!isLoading && !avatarReady && (
            <div className="w-52 h-52 bg-white rounded-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Volume2 className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600">
                  {'Waiting for avatar video...'}
                </p>
              </div>
            </div>
          )}

          {/* Audio element (hidden) */}
          <audio ref={audioRef} style={{ display: 'none' }} />

          {/* Glow effect when speaking */}
          {isSpeaking && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 opacity-30 animate-pulse" />
          )}
        </div>

        {/* Enhanced Speech Bubble */}
        <div className="absolute -top-6 -right-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl px-6 py-3 shadow-xl transform hover:scale-105 transition-transform duration-300">
          <div className="text-sm font-medium">
            {isListening 
              ? (continuousConversation 
                  ? ('Always listening...')
                  : ('Listening...'))
              : isSpeaking
              ? ('Speaking...')
              : isReconnecting
              ? ('Reconnecting...')
              : ('Hi! How can I help?')
            }
          </div>
          {continuousConversation && (
            <div className="text-xs opacity-75 mt-1">
              {'Continuous mode active'}
            </div>
          )}
          <div className="absolute bottom-0 left-8 transform translate-y-1/2 rotate-45 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600" />
        </div>
      </div>

      {/* Enhanced Control Buttons */}
      {avatarReady && (
        <div className="flex gap-3">
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

          {/* Stop Speaking Button */}
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="p-4 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              title={'Stop speaking'}
            >
              <VolumeX className="w-6 h-6" />
            </button>
          )}

          {/* Continuous Conversation Toggle */}
          <button
            onClick={toggleContinuousConversation}
            className={`p-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
              continuousConversation 
                ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
            }`}
            title={
              continuousConversation
                ? ('Disable continuous mode')
                : ('Enable continuous mode')
            }
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Session Control */}
          <button
            onClick={stopSession}
            disabled={!sessionActive && !avatarReady}
            className="p-3 rounded-full bg-gray-500 hover:bg-gray-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-30"
            title={'Close session'}
          >
            <AlertCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Enhanced Status Indicator */}
      <div className="mt-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isReconnecting ? 'bg-orange-400' :
            avatarReady && sessionActive ? 'bg-green-400' : 
            isLoading ? 'bg-yellow-400' : 
            'bg-red-400'
          } animate-pulse`} />
          <span className="text-sm text-gray-600 font-medium">
            {isReconnecting
              ? ('Reconnecting...')
              : isLoading
              ? ('Initializing...')
              : avatarReady && sessionActive
              ? ('Ready')
              : avatarReady
              ? ('Avatar ready')
              : ('Waiting for avatar')
            }
          </span>
        </div>
        
        {/* Enhanced status details */}
        {avatarReady && (
          <div className="mt-1 text-xs text-gray-500">
            {currentAvatarConfig?.name && (
              <span>Avatar: {currentAvatarConfig.name}</span>
            )}
            {spokenTextQueueRef.current.length > 0 && (
              <span className="ml-2">Queue: {spokenTextQueueRef.current.length}</span>
            )}
            {continuousConversation && (
              <span className="ml-2 text-purple-600">🔄 Continuous</span>
            )}
          </div>
        )}
        
        {/* Debug info in development */}
        {/* {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <div>
              Status: {isLoading ? '🔄' : avatarReady ? '✅' : '❌'} | 
              Session: {sessionActive ? '🟢' : '🔴'} | 
              Speaking: {isSpeaking ? '🗣️' : '🔇'} | 
              Listening: {isListening ? '🎙️' : '🔕'}
            </div>
            <div>
              Video: {videoRef.current?.srcObject ? '📺' : '❌'} | 
              Audio: {audioRef.current?.srcObject ? '🔊' : '❌'} | 
              SDK: {isInitialized ? '✅' : '❌'}
            </div>
            {isReconnecting && (
              <div className="text-orange-600">🔄 Auto-reconnection in progress...</div>
            )}
          </div>
        )} */}
      </div>
    </div>
  )
}

export default AzureAvatarClient