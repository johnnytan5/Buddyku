// Azure Avatar Configuration
import { AVATAR_SUPPORTED_REGIONS, AVATAR_CONFIGS, VOICE_CONFIGS, TIMEOUTS } from './types'

export interface AzureAvatarConfig {
  // Authentication
  speechKey: string
  speechRegion: string
  customEndpoint?: string // Support for custom Azure endpoints
  
  // Avatar settings
  defaultAvatarIndex: number
  enableCustomVoice: boolean
  usePrivateEndpoint: boolean
  
  // Performance settings
  enableConnectionPooling: boolean
  enableAudioCaching: boolean
  maxRetryAttempts: number
  reconnectDelay: number
  
  // Feature flags
  enableContinuousConversation: boolean
  enableAutoReconnect: boolean
  enableFallbackMode: boolean
  enablePerformanceMonitoring: boolean
  
  // Quality settings
  videoQuality: 'low' | 'medium' | 'high'
  audioQuality: 'low' | 'medium' | 'high'
  
  // Timeouts
  initializationTimeout: number
  sessionTimeout: number
  speechTimeout: number
}

export class AzureAvatarConfigManager {
  private static instance: AzureAvatarConfigManager
  private config: AzureAvatarConfig

  constructor() {
    this.config = this.getDefaultConfig()
    this.loadEnvironmentConfig()
  }

  static getInstance(): AzureAvatarConfigManager {
    if (!this.instance) {
      this.instance = new AzureAvatarConfigManager()
    }
    return this.instance
  }

  private getDefaultConfig(): AzureAvatarConfig {
    return {
      // Authentication (from environment)
      speechKey: '',
      speechRegion: '',
      
      // Avatar settings
      defaultAvatarIndex: 0,
      enableCustomVoice: false,
      usePrivateEndpoint: false,
      
      // Performance settings
      enableConnectionPooling: true,
      enableAudioCaching: true,
      maxRetryAttempts: 3,
      reconnectDelay: 2000,
      
      // Feature flags
      enableContinuousConversation: false,
      enableAutoReconnect: true,
      enableFallbackMode: true,
      enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
      
      // Quality settings (will be auto-adjusted based on connection)
      videoQuality: 'medium',
      audioQuality: 'high',
      
      // Timeouts
      initializationTimeout: TIMEOUTS.AVATAR_INITIALIZATION,
      sessionTimeout: TIMEOUTS.SESSION_IDLE,
      speechTimeout: TIMEOUTS.SPEECH_TIMEOUT
    }
  }

  private loadEnvironmentConfig(): void {
    // Load from environment variables
    this.config.speechKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || ''
    this.config.speechRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || ''
    this.config.customEndpoint = process.env.NEXT_PUBLIC_AZURE_CUSTOM_ENDPOINT || ''
    
    // Development overrides
    if (process.env.NODE_ENV === 'development') {
      this.config.enablePerformanceMonitoring = true
      this.config.maxRetryAttempts = 1 // Faster development cycle
    }
    
    // Production optimizations
    if (process.env.NODE_ENV === 'production') {
      this.config.enableConnectionPooling = true
      this.config.enableAudioCaching = true
    }
  }

  // Get current configuration
  getConfig(): AzureAvatarConfig {
    return { ...this.config }
  }

  // Update configuration
  updateConfig(updates: Partial<AzureAvatarConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  // Validate configuration
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check required fields
    if (!this.config.speechKey) {
      errors.push('Azure Speech subscription key is required')
    }
    
    if (!this.config.speechRegion) {
      errors.push('Azure Speech region is required')
    }

    // Check region support
    if (this.config.speechRegion && !AVATAR_SUPPORTED_REGIONS.includes(this.config.speechRegion as any)) {
      errors.push(`Region ${this.config.speechRegion} may not support Avatar services`)
    }

    // Check avatar configuration
    if (this.config.defaultAvatarIndex >= AVATAR_CONFIGS.length) {
      errors.push('Invalid avatar configuration index')
    }

    // Check timeouts
    if (this.config.initializationTimeout < 5000) {
      errors.push('Initialization timeout should be at least 5 seconds')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Get avatar configuration
  getAvatarConfig(language: string = 'en-US') {
    const avatarConfig = AVATAR_CONFIGS[this.config.defaultAvatarIndex]
    const voiceConfig = VOICE_CONFIGS[language] || VOICE_CONFIGS['en-US']
    
    return {
      ...avatarConfig,
      voice: voiceConfig[0], // Use first voice for the language
      availableVoices: voiceConfig
    }
  }

  // Get performance settings based on current conditions
  getPerformanceSettings() {
    return {
      enableConnectionPooling: this.config.enableConnectionPooling,
      enableAudioCaching: this.config.enableAudioCaching,
      maxRetryAttempts: this.config.maxRetryAttempts,
      reconnectDelay: this.config.reconnectDelay,
      videoQuality: this.config.videoQuality,
      audioQuality: this.config.audioQuality
    }
  }

  // Get timeout settings
  getTimeoutSettings() {
    return {
      initialization: this.config.initializationTimeout,
      session: this.config.sessionTimeout,
      speech: this.config.speechTimeout
    }
  }

  // Auto-adjust quality based on performance
  autoAdjustQuality(connectionSpeed: 'slow' | 'medium' | 'fast'): void {
    switch (connectionSpeed) {
      case 'slow':
        this.config.videoQuality = 'low'
        this.config.audioQuality = 'medium'
        this.config.reconnectDelay = 5000
        break
      case 'fast':
        this.config.videoQuality = 'high'
        this.config.audioQuality = 'high'
        this.config.reconnectDelay = 1000
        break
      default:
        this.config.videoQuality = 'medium'
        this.config.audioQuality = 'high'
        this.config.reconnectDelay = 2000
    }
  }

  // Get debug information
  getDebugInfo() {
    return {
      config: this.config,
      validation: this.validateConfig(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasCredentials: !!(this.config.speechKey && this.config.speechRegion),
        regionSupported: AVATAR_SUPPORTED_REGIONS.includes(this.config.speechRegion as any)
      },
      performance: {
        connectionPoolingEnabled: this.config.enableConnectionPooling,
        audioCachingEnabled: this.config.enableAudioCaching,
        monitoringEnabled: this.config.enablePerformanceMonitoring
      }
    }
  }
}

// Export singleton instance
export const avatarConfig = AzureAvatarConfigManager.getInstance()