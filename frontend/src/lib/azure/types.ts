// Azure Speech SDK and Avatar Types
export interface SpeechSDK {
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

export interface AzureCredentials {
  speechKey: string
  speechRegion: string
}

export interface AvatarConfig {
  character: string
  style: string
  voice: string
  name: string
  background: string
}

export interface VoiceConfig {
  language: string
  voices: string[]
}

export interface ICEServerConfig {
  urls: string[]
  username?: string
  credential?: string
}

export interface AvatarState {
  isInitialized: boolean
  isLoading: boolean
  isListening: boolean
  isSpeaking: boolean
  avatarReady: boolean
  sessionActive: boolean
  isReconnecting: boolean
  error: string | null
  continuousConversation: boolean
  currentAvatarConfig: AvatarConfig | null
  spokenTextQueue: string[]
  reconnectAttempts: number
  isAudioBlocked: boolean
}

export interface AvatarActions {
  initializeAvatar: () => void
  startListening: () => void
  stopListening: () => void
  speakText: (text: string) => Promise<boolean>
  stopSpeaking: () => void
  toggleContinuousConversation: () => void
  reconnect: () => void
  clearError: () => void
  reset: () => void
}

export interface AvatarCallbacks {
  onSpeechRecognized?: (text: string) => void
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
  onAvatarReady?: () => void
  onError?: (error: string) => void
  onStateChange?: (state: AvatarState) => void
}

// WebRTC Event Types from Azure
export interface WebRTCEvent {
  event: {
    eventType: 'EVENT_TYPE_TURN_START' | 'EVENT_TYPE_SESSION_END' | 'EVENT_TYPE_SWITCH_TO_IDLE'
  }
}

// Constants
export const AVATAR_SUPPORTED_REGIONS = [
  'southeastasia',
  'eastus',
  'westeurope', 
  'westus2',
  'northeurope',
  'southcentralus',
  'eastus2',
  'westus3'
] as const

export const AVATAR_CONFIGS: AvatarConfig[] = [
  { character: 'lori', style: 'graceful', voice: 'en-US-AvaMultilingualNeural', name: 'Lori Graceful', background: '#F8FAFC' },
  { character: 'lisa', style: 'casual-sitting', voice: 'en-US-AvaMultilingualNeural', name: 'Lisa Casual', background: '#FFFFFF' },
  { character: 'meg', style: 'business', voice: 'en-US-AvaMultilingualNeural', name: 'Meg Business', background: '#F5F5F5' },
  { character: 'lisa', style: 'graceful-sitting', voice: 'en-US-AvaMultilingualNeural', name: 'Lisa Graceful', background: '#FFFFFF' },
  { character: 'anna', style: 'casual-sitting', voice: 'en-US-AriaNeural', name: 'Anna Casual', background: '#FFFFFF' },
  { character: 'anna', style: 'graceful-sitting', voice: 'en-US-JennyNeural', name: 'Anna Graceful', background: '#FFFFFF' },
]

export const VOICE_CONFIGS: Record<string, string[]> = {
  'en-US': ['en-US-AvaMultilingualNeural', 'en-US-AriaNeural', 'en-US-JennyNeural'],
}

export const TIMEOUTS = {
  AVATAR_INITIALIZATION: 30000,
  SESSION_IDLE: 300000,
  RECONNECT_DELAY: 2000,
  SPEECH_TIMEOUT: 10000
} as const

export const MAX_RECONNECT_ATTEMPTS = 3
export const AVATAR_FALLBACK_REGION = 'eastus'