// Comprehensive error handling for Azure Avatar system
export interface AvatarError {
  code: string
  message: string
  category: 'INITIALIZATION' | 'CONNECTION' | 'AUTHENTICATION' | 'SYNTHESIS' | 'RECOGNITION' | 'NETWORK' | 'UNKNOWN'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recoverable: boolean
  suggestedAction: string
}

export class AvatarErrorHandler {
  private static readonly ERROR_PATTERNS = [
    {
      pattern: /401|unauthorized|invalid.*key|authentication/i,
      category: 'AUTHENTICATION' as const,
      severity: 'CRITICAL' as const,
      recoverable: false,
      suggestedAction: 'Check your Azure Speech subscription key and ensure it\'s valid'
    },
    {
      pattern: /403|forbidden|not.*available.*region/i,
      category: 'AUTHENTICATION' as const,
      severity: 'CRITICAL' as const,
      recoverable: false,
      suggestedAction: 'Avatar services may not be available in your region. Try a different region or check your subscription'
    },
    {
      pattern: /websocket|connection.*failed|network|timeout/i,
      category: 'CONNECTION' as const,
      severity: 'HIGH' as const,
      recoverable: true,
      suggestedAction: 'Check your internet connection and try again'
    },
    {
      pattern: /ice.*server|webrtc|peer.*connection/i,
      category: 'CONNECTION' as const,
      severity: 'HIGH' as const,
      recoverable: true,
      suggestedAction: 'WebRTC connection failed. Check firewall settings and try again'
    },
    {
      pattern: /avatar.*failed.*start|synthesis.*failed/i,
      category: 'SYNTHESIS' as const,
      severity: 'HIGH' as const,
      recoverable: true,
      suggestedAction: 'Avatar synthesis failed. Try restarting the session'
    },
    {
      pattern: /speech.*recognition|microphone|audio.*input/i,
      category: 'RECOGNITION' as const,
      severity: 'MEDIUM' as const,
      recoverable: true,
      suggestedAction: 'Check microphone permissions and ensure your microphone is working'
    },
    {
      pattern: /rate.*limit|quota.*exceeded|too.*many.*requests/i,
      category: 'NETWORK' as const,
      severity: 'MEDIUM' as const,
      recoverable: true,
      suggestedAction: 'Rate limit exceeded. Please wait a moment before trying again'
    }
  ]

  static analyzeError(error: string | Error): AvatarError {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorStack = typeof error === 'string' ? '' : error.stack || ''
    const fullErrorText = `${errorMessage} ${errorStack}`.toLowerCase()

    // Find matching pattern
    for (const pattern of this.ERROR_PATTERNS) {
      if (pattern.pattern.test(fullErrorText)) {
        return {
          code: this.generateErrorCode(pattern.category),
          message: errorMessage,
          category: pattern.category,
          severity: pattern.severity,
          recoverable: pattern.recoverable,
          suggestedAction: pattern.suggestedAction
        }
      }
    }

    // Default error
    return {
      code: 'AVATAR_UNKNOWN_ERROR',
      message: errorMessage,
      category: 'UNKNOWN',
      severity: 'MEDIUM',
      recoverable: true,
      suggestedAction: 'An unexpected error occurred. Please try again'
    }
  }

  private static generateErrorCode(category: string): string {
    const timestamp = Date.now().toString(36).slice(-4)
    return `AVATAR_${category}_${timestamp}`.toUpperCase()
  }

  static getRecoveryStrategy(error: AvatarError): {
    shouldRetry: boolean
    retryDelay: number
    maxRetries: number
    fallbackAction?: string
  } {
    switch (error.category) {
      case 'AUTHENTICATION':
        return {
          shouldRetry: false,
          retryDelay: 0,
          maxRetries: 0,
          fallbackAction: 'Show configuration help'
        }

      case 'CONNECTION':
        return {
          shouldRetry: true,
          retryDelay: error.severity === 'HIGH' ? 5000 : 2000,
          maxRetries: 3,
          fallbackAction: 'Use browser fallback'
        }

      case 'SYNTHESIS':
        return {
          shouldRetry: true,
          retryDelay: 3000,
          maxRetries: 2,
          fallbackAction: 'Use browser speech synthesis'
        }

      case 'RECOGNITION':
        return {
          shouldRetry: true,
          retryDelay: 1000,
          maxRetries: 2,
          fallbackAction: 'Use browser speech recognition'
        }

      case 'NETWORK':
        return {
          shouldRetry: true,
          retryDelay: 10000,
          maxRetries: 1,
          fallbackAction: 'Wait and retry'
        }

      default:
        return {
          shouldRetry: true,
          retryDelay: 2000,
          maxRetries: 1,
          fallbackAction: 'Reset and restart'
        }
    }
  }

  static formatUserFriendlyMessage(error: AvatarError, language: string = 'en'): string {
    const messages = {
      en: {
        AUTHENTICATION: 'Azure credentials are invalid. Please check your configuration.',
        CONNECTION: 'Connection failed. Please check your internet connection.',
        SYNTHESIS: 'Voice synthesis failed. Trying to reconnect...',
        RECOGNITION: 'Speech recognition failed. Please check your microphone.',
        NETWORK: 'Network error. Please try again in a moment.',
        UNKNOWN: 'An unexpected error occurred. Please try again.'
      },
      ms: {
        AUTHENTICATION: 'Kelayakan Azure tidak sah. Sila semak konfigurasi anda.',
        CONNECTION: 'Sambungan gagal. Sila semak sambungan internet anda.',
        SYNTHESIS: 'Sintesis suara gagal. Cuba menyambung semula...',
        RECOGNITION: 'Pengecaman pertuturan gagal. Sila semak mikrofon anda.',
        NETWORK: 'Ralat rangkaian. Sila cuba lagi sebentar.',
        UNKNOWN: 'Ralat tidak dijangka berlaku. Sila cuba lagi.'
      }
    }

    const lang = language === 'ms' ? 'ms' : 'en'
    return messages[lang][error.category] || messages[lang].UNKNOWN
  }

  static logError(error: AvatarError, context?: any): void {
    const logLevel = error.severity === 'CRITICAL' || error.severity === 'HIGH' ? 'error' : 'warn'
    
    console[logLevel](`🚨 Avatar Error [${error.code}]:`, {
      message: error.message,
      category: error.category,
      severity: error.severity,
      recoverable: error.recoverable,
      suggestedAction: error.suggestedAction,
      context
    })

    // In production, you might want to send this to a logging service
    if (process.env.NODE_ENV === 'production' && error.severity === 'CRITICAL') {
      // Example: Send to analytics or logging service
      // analytics.track('avatar_error', { error, context })
    }
  }
}

// Performance monitoring utilities
export class AvatarPerformanceMonitor {
  private static metrics: Map<string, number> = new Map()
  private static startTimes: Map<string, number> = new Map()

  static startTimer(operation: string): void {
    this.startTimes.set(operation, performance.now())
  }

  static endTimer(operation: string): number {
    const startTime = this.startTimes.get(operation)
    if (!startTime) return 0

    const duration = performance.now() - startTime
    this.startTimes.delete(operation)
    
    // Store metric
    this.metrics.set(operation, duration)
    
    // Log slow operations
    if (duration > 5000) { // 5 seconds
      console.warn(`⚠️ Slow avatar operation: ${operation} took ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  static getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics)
  }

  static logMetrics(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Avatar Performance Metrics:', this.getMetrics())
    }
  }
}