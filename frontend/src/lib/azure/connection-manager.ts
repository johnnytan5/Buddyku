import { SpeechSDK, ICEServerConfig, AzureCredentials, AVATAR_SUPPORTED_REGIONS, AVATAR_FALLBACK_REGION, TIMEOUTS } from './types'

export class AzureConnectionManager {
  private speechSDK: SpeechSDK | null = null
  private speechConfig: any = null
  private avatarSynthesizer: any = null
  private speechRecognizer: any = null
  private peerConnection: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private credentials: AzureCredentials
  private language: string

  constructor(credentials: AzureCredentials, language: string = 'en-US') {
    this.credentials = credentials
    this.language = language
  }

  // Initialize Speech SDK
  async initializeSDK(): Promise<void> {
    // If SDK is already initialized, skip
    if (this.speechSDK && this.speechConfig) {
      console.log('📦 Azure Speech SDK already loaded.')
      return
    }
  
    try {
      console.log('📦 Loading Azure Speech SDK...')
      
      // Dynamically import the Speech SDK
      const speechSDKModule = await import('microsoft-cognitiveservices-speech-sdk')
      this.speechSDK = speechSDKModule as any
      
      // Verify SDK was loaded correctly
      if (!this.speechSDK || !this.speechSDK.SpeechConfig) {
        throw new Error('Speech SDK failed to load properly - SpeechConfig not found')
      }
      
      if (!this.speechSDK.AvatarConfig) {
        throw new Error('Avatar features not available in this Speech SDK version')
      }
      
      // Validate region support
      const effectiveRegion = this.getEffectiveRegion()
      console.log(`🌍 Using region: ${effectiveRegion}`)
      
      // Create speech configuration
      this.speechConfig = this.speechSDK.SpeechConfig.fromSubscription(
        this.credentials.speechKey, 
        effectiveRegion
      )
      
      if (!this.speechConfig) {
        throw new Error('Failed to create speech configuration - check credentials')
      }
      
      // Configure voice and language
      this.speechConfig.speechRecognitionLanguage = this.language
      this.speechConfig.speechSynthesisVoiceName = this.getVoiceForLanguage()
      
      console.log('✅ Azure Speech SDK initialized successfully')
    } catch (error) {
      // Clean up on failure
      this.speechSDK = null
      this.speechConfig = null
      throw new Error(`Failed to initialize Speech SDK: ${error}`)
    }
  }

  // Get effective region for avatar services
  private getEffectiveRegion(): string {
    const region = this.credentials.speechRegion.toLowerCase()
    
    if (AVATAR_SUPPORTED_REGIONS.includes(region as any)) {
      return region
    }
    
    console.warn(`⚠️ Region ${region} may not support Avatar services. Using fallback: ${AVATAR_FALLBACK_REGION}`)
    return AVATAR_FALLBACK_REGION
  }

  // Get voice based on language
  private getVoiceForLanguage(): string {
    switch (this.language) {
      case 'ms-MY':
        return 'ms-MY-YasminNeural'
      default:
        return 'en-US-AvaMultilingualNeural'
    }
  }

  // Fetch ICE servers from Azure
  async fetchICEServers(): Promise<ICEServerConfig[]> {
    // Check if custom endpoint is configured
    const customEndpoint = process.env.NEXT_PUBLIC_AZURE_CUSTOM_ENDPOINT
    let iceServerUrl: string
    let useCustomEndpoint = false
    
    // For now, prioritize regional TTS endpoints for Avatar services
    // Custom endpoints often don't support Avatar services
    const region = this.getEffectiveRegion()
    
    if (customEndpoint && region) {
      // Try regional TTS endpoint first (more likely to work for Avatar)
      iceServerUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`
      console.log(`🧊 Trying regional TTS endpoint first: ${iceServerUrl}`)
      console.log(`⚠️ Note: Custom endpoints often don't support Avatar services`)
    } else if (customEndpoint) {
      // Use custom endpoint as fallback
      const baseEndpoint = customEndpoint.replace(/\/$/, '')
      iceServerUrl = `${baseEndpoint}/cognitiveservices/avatar/relay/token/v1`
      useCustomEndpoint = true
      console.log(`🧊 Using custom endpoint: ${iceServerUrl}`)
    } else {
      // Use standard region-based endpoint
      iceServerUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`
      console.log(`🧊 Using standard regional endpoint: ${iceServerUrl}`)
    }
    
    try {
      const response = await fetch(iceServerUrl, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': this.credentials.speechKey,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid Azure Speech subscription key')
        }
        if (response.status === 403) {
          throw new Error('Avatar services not available in this region')
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('✅ ICE servers obtained successfully')
      
      // Handle different response formats
      const urls = data.Urls || data.urls || []
      return [{
        urls: urls.filter((url: string) => url.startsWith('turn:')),
        username: data.Username || data.username,
        credential: data.Password || data.credential
      }]
      
    } catch (error) {
      console.log(`❌ Primary endpoint failed: ${error.message}`)
      
      // Try custom endpoint if we were using regional and custom is available
      if (!useCustomEndpoint && customEndpoint) {
        console.log(`🔄 Trying custom endpoint as fallback...`)
        const customUrl = `${customEndpoint.replace(/\/$/, '')}/cognitiveservices/avatar/relay/token/v1`
        
        try {
          const customResponse = await fetch(customUrl, {
            method: 'GET',
            headers: {
              'Ocp-Apim-Subscription-Key': this.credentials.speechKey,
              'Content-Type': 'application/json'
            }
          })
          
          if (customResponse.ok) {
            const customData = await customResponse.json()
            const urls = customData.Urls || customData.urls || []
            return [{
              urls: urls.filter((url: string) => url.startsWith('turn:')),
              username: customData.Username || customData.username,
              credential: customData.Password || customData.credential
            }]
          }
        } catch (customError) {
          console.log(`❌ Custom endpoint also failed: ${customError.message}`)
        }
      }
      
      // Fallback to different region if available
      if (region !== AVATAR_FALLBACK_REGION) {
        console.log(`🔄 Retrying with fallback region: ${AVATAR_FALLBACK_REGION}`)
        const fallbackUrl = `https://${AVATAR_FALLBACK_REGION}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`
        
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'GET',
          headers: {
            'Ocp-Apim-Subscription-Key': this.credentials.speechKey,
            'Content-Type': 'application/json'
          }
        })

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          const urls = fallbackData.Urls || fallbackData.urls || []
          return [{
            urls: urls.filter((url: string) => url.startsWith('turn:')),
            username: fallbackData.Username || fallbackData.username,
            credential: fallbackData.Password || fallbackData.credential
          }]
        }
      }
      
      throw error
    }
  }

  // Setup WebRTC peer connection
  async setupWebRTC(iceServers: ICEServerConfig[]): Promise<RTCPeerConnection> {
    this.peerConnection = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: 'relay'
    })

    // Add transceivers for video and audio
    this.peerConnection.addTransceiver('video', { direction: 'sendrecv' })
    this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' })

    return this.peerConnection
  }

  // Create avatar config object
  createAvatarConfig(character: string, style: string, background: string = '#F8FAFC'): any {
    if (!this.speechSDK) {
      throw new Error('Speech SDK not initialized - cannot create avatar config')
    }

    if (!this.speechSDK.AvatarConfig) {
      throw new Error('AvatarConfig not available in Speech SDK - check SDK version compatibility')
    }

    if (!character || !style) {
      throw new Error('Avatar character and style are required')
    }

    try {
      const avatarSDKConfig = new this.speechSDK.AvatarConfig(character, style)
      avatarSDKConfig.backgroundColor = background
      return avatarSDKConfig
    } catch (error) {
      throw new Error(`Failed to create avatar config: ${error}`)
    }
  }

  // Create avatar synthesizer
  createAvatarSynthesizer(avatarConfig: any): any {
    if (!this.speechSDK || !this.speechConfig) {
      throw new Error('Speech SDK not initialized')
    }

    this.avatarSynthesizer = new this.speechSDK.AvatarSynthesizer(this.speechConfig, avatarConfig)
    return this.avatarSynthesizer
  }

  // Create speech recognizer  
  createSpeechRecognizer(): any {
    if (!this.speechSDK || !this.speechConfig) {
      throw new Error('Speech SDK not initialized')
    }

    const audioConfig = this.speechSDK.AudioConfig.fromDefaultMicrophoneInput()
    this.speechRecognizer = new this.speechSDK.SpeechRecognizer(this.speechConfig, audioConfig)
    return this.speechRecognizer
  }

  // Start avatar session
  async startAvatarSession(peerConnection: RTCPeerConnection): Promise<void> {
    if (!this.avatarSynthesizer) {
      throw new Error('Avatar synthesizer not created')
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Avatar session timeout - possible network or configuration issue'))
      }, TIMEOUTS.AVATAR_INITIALIZATION)

      this.avatarSynthesizer.startAvatarAsync(peerConnection).then((result: any) => {
        clearTimeout(timeout)
        console.log('🎭 Avatar start result:', result.reason, result)
        
        // Check for rate limiting (throttling) errors
        if (result.errorDetails && result.errorDetails.includes('throttled')) {
          console.error('🚫 Rate limiting detected:', result.errorDetails)
          const waitTime = this.extractThrottleWaitTime(result.errorDetails) || 30000
          reject(new Error(`RATE_LIMIT:${waitTime}:${result.errorDetails}`))
          return
        }
        
        if (result.reason === this.speechSDK?.ResultReason.SynthesizingAudioCompleted) {
          console.log('✅ Avatar session started successfully')
          resolve()
        } else {
          let errorMsg = `Avatar failed to start: ${result.reason}`
          
          // Add specific error messages for common issues
          switch (result.reason) {
            case 1:
              // Check if this is due to throttling
              if (result.errorDetails && (result.errorDetails.includes('4429') || result.errorDetails.includes('throttled'))) {
                const waitTime = this.extractThrottleWaitTime(result.errorDetails) || 60000
                errorMsg = `Rate limit exceeded (429). Azure is throttling your requests. Wait ${waitTime/1000}s before retrying.`
                reject(new Error(`RATE_LIMIT:${waitTime}:${errorMsg}`))
                return
              }
              errorMsg = 'Avatar initialization failed - check character/style configuration or region support'
              break
            case 2:
              errorMsg = 'Avatar connection failed - check network connectivity'
              break
            case 3:
              errorMsg = 'Avatar authentication failed - check Azure Speech key and region'
              break
            case 4:
              errorMsg = 'Avatar service unavailable - try again later or use different region'
              break
            default:
              errorMsg = `Avatar failed to start: ${result.reason} (${result.errorDetails || 'no details'})`
          }
          
          reject(new Error(errorMsg))
        }
      }).catch((error: any) => {
        clearTimeout(timeout)
        console.error('🚨 Avatar session error:', error)
        reject(new Error(`Avatar session failed: ${error.message || error}`))
      })
    })
  }

  // Speak text
  async speakText(text: string): Promise<boolean> {
    if (!this.avatarSynthesizer || !text.trim()) {
      return false
    }

    try {
      const ssml = this.buildSSML(text)
      const result = await this.avatarSynthesizer.speakSsmlAsync(ssml)
      
      if (result.reason === this.speechSDK?.ResultReason.SynthesizingAudioCompleted) {
        console.log('✅ Text spoken successfully')
        return true
      } else {
        console.error('❌ Failed to speak text:', result.reason)
        return false
      }
    } catch (error) {
      console.error('❌ Speech synthesis error:', error)
      return false
    }
  }

  // Build SSML for text
  private buildSSML(text: string): string {
    const voice = this.getVoiceForLanguage()
    const encodedText = this.htmlEncode(text)
    
    return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='${this.language}'>
      <voice name='${voice}'>
        <mstts:leadingsilence-exact value='0'/>
        ${encodedText}
      </voice>
    </speak>`
  }

  // HTML encode text for SSML
  private htmlEncode(text: string): string {
    const entityMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    }
    return String(text).replace(/[&<>"'\/]/g, (match) => entityMap[match])
  }

  // Stop speaking
  async stopSpeaking(): Promise<void> {
    if (this.avatarSynthesizer) {
      await this.avatarSynthesizer.stopSpeakingAsync()
    }
  }

  // Start continuous recognition
  async startContinuousRecognition(callbacks: {
    onRecognized: (text: string) => void
    onStarted: () => void
    onStopped: () => void
    onError: (error: string) => void
  }): Promise<void> {
    if (!this.speechRecognizer) {
      throw new Error('Speech recognizer not created')
    }

    this.speechRecognizer.recognized = (s: any, e: any) => {
      if (e.result.reason === this.speechSDK?.ResultReason.RecognizedSpeech) {
        const text = e.result.text.trim()
        if (text) {
          callbacks.onRecognized(text)
        }
      }
    }

    this.speechRecognizer.sessionStarted = () => callbacks.onStarted()
    this.speechRecognizer.sessionStopped = () => callbacks.onStopped()
    this.speechRecognizer.canceled = (s: any, e: any) => {
      callbacks.onError(`Recognition canceled: ${e.reason}`)
    }

    await this.speechRecognizer.startContinuousRecognitionAsync()
  }

  // Stop continuous recognition
  async stopContinuousRecognition(): Promise<void> {
    if (this.speechRecognizer) {
      await this.speechRecognizer.stopContinuousRecognitionAsync()
    }
  }

  // Cleanup resources
  cleanup(): void {
    try {
      if (this.speechRecognizer) {
        this.speechRecognizer.close()
        this.speechRecognizer = null
      }
      
      if (this.avatarSynthesizer) {
        this.avatarSynthesizer.close()
        this.avatarSynthesizer = null
      }
      
      if (this.peerConnection) {
        this.peerConnection.close()
        this.peerConnection = null
      }
      
      console.log('🧹 Azure connections cleaned up')
    } catch (error) {
      console.error('❌ Cleanup error:', error)
    }
  }

  // Check if ready for avatar operations
  get isReadyForAvatar(): boolean {
    return this.speechSDK !== null && this.speechConfig !== null
  }

  // Getters
  get isInitialized(): boolean {
    return this.speechSDK !== null && this.speechConfig !== null
  }

  get hasAvatarSynthesizer(): boolean {
    return this.avatarSynthesizer !== null
  }

  get hasRecognizer(): boolean {
    return this.speechRecognizer !== null
  }
}