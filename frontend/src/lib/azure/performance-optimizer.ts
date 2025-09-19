// Performance optimization utilities for Azure Avatar
export class AvatarPerformanceOptimizer {
  private static connectionPool: Map<string, any> = new Map()
  private static audioBufferCache: Map<string, AudioBuffer> = new Map()
  private static reconnectAttempts: Map<string, number> = new Map()

  // Connection pooling for better performance
  static getOrCreateConnection(key: string, factory: () => Promise<any>): Promise<any> {
    if (this.connectionPool.has(key)) {
      const connection = this.connectionPool.get(key)
      if (this.isConnectionAlive(connection)) {
        return Promise.resolve(connection)
      } else {
        this.connectionPool.delete(key)
      }
    }

    return factory().then(connection => {
      this.connectionPool.set(key, connection)
      return connection
    })
  }

  private static isConnectionAlive(connection: any): boolean {
    // Check if WebRTC connection is still alive
    if (connection?.iceConnectionState) {
      return ['connected', 'completed'].includes(connection.iceConnectionState)
    }
    return true
  }

  // Intelligent reconnection with exponential backoff
  static calculateReconnectDelay(sessionId: string, baseDelay: number = 1000): number {
    const attempts = this.reconnectAttempts.get(sessionId) || 0
    this.reconnectAttempts.set(sessionId, attempts + 1)
    
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, Math.min(attempts, 5))
    const jitter = Math.random() * 1000 // Add 0-1 second jitter
    
    return Math.min(exponentialDelay + jitter, 30000) // Max 30 seconds
  }

  static resetReconnectAttempts(sessionId: string): void {
    this.reconnectAttempts.delete(sessionId)
  }

  // Audio caching for better performance
  static cacheAudioBuffer(key: string, buffer: AudioBuffer): void {
    // Limit cache size to prevent memory issues
    if (this.audioBufferCache.size >= 10) {
      const firstKey = this.audioBufferCache.keys().next().value
      this.audioBufferCache.delete(firstKey)
    }
    this.audioBufferCache.set(key, buffer)
  }

  static getCachedAudioBuffer(key: string): AudioBuffer | undefined {
    return this.audioBufferCache.get(key)
  }

  // Resource cleanup
  static cleanup(): void {
    // Close all pooled connections
    this.connectionPool.forEach(connection => {
      try {
        if (connection?.close) {
          connection.close()
        }
      } catch (error) {
        console.warn('Error closing pooled connection:', error)
      }
    })
    
    this.connectionPool.clear()
    this.audioBufferCache.clear()
    this.reconnectAttempts.clear()
  }

  // Memory usage monitoring
  static getMemoryUsage(): { used: number; total: number; percentage: number } {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      }
    }
    return { used: 0, total: 0, percentage: 0 }
  }

  // Check if we should trigger garbage collection or cleanup
  static shouldCleanup(): boolean {
    const memory = this.getMemoryUsage()
    return memory.percentage > 80 // Cleanup if memory usage > 80%
  }
}

// Queue management for speech synthesis
export class SpeechQueue {
  private queue: Array<{ text: string; priority: number; id: string }> = []
  private isProcessing = false
  private currentId: string | null = null

  constructor(private onSpeak: (text: string) => Promise<boolean>) {}

  // Add text to speech queue with priority
  async add(text: string, priority: number = 1): Promise<string> {
    const id = this.generateId()
    
    // Insert based on priority (higher priority first)
    const insertIndex = this.queue.findIndex(item => item.priority < priority)
    const item = { text, priority, id }
    
    if (insertIndex === -1) {
      this.queue.push(item)
    } else {
      this.queue.splice(insertIndex, 0, item)
    }

    this.processQueue()
    return id
  }

  // Remove item from queue
  remove(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id)
    if (index !== -1) {
      this.queue.splice(index, 1)
      return true
    }
    return false
  }

  // Clear the entire queue
  clear(): void {
    this.queue = []
    this.currentId = null
  }

  // Get queue status
  getStatus(): { 
    queueLength: number
    isProcessing: boolean
    currentId: string | null
    estimatedTime: number
  } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      currentId: this.currentId,
      estimatedTime: this.queue.length * 3000 // Rough estimate: 3 seconds per item
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return

    this.isProcessing = true

    while (this.queue.length > 0) {
      const item = this.queue.shift()!
      this.currentId = item.id

      try {
        const success = await this.onSpeak(item.text)
        if (!success) {
          console.warn('Failed to speak text, removing from queue:', item.text)
        }
      } catch (error) {
        console.error('Error speaking text:', error)
      }
    }

    this.isProcessing = false
    this.currentId = null
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

// Bandwidth optimization for different connection speeds
export class BandwidthOptimizer {
  private static connectionSpeed: 'slow' | 'medium' | 'fast' = 'medium'
  private static lastSpeedTest = 0

  // Test connection speed
  static async testConnectionSpeed(): Promise<'slow' | 'medium' | 'fast'> {
    // Only test every 5 minutes
    if (Date.now() - this.lastSpeedTest < 300000) {
      return this.connectionSpeed
    }

    try {
      const startTime = performance.now()
      const response = await fetch('data:text/plain,test', { cache: 'no-cache' })
      await response.text()
      const endTime = performance.now()
      
      const latency = endTime - startTime
      
      if (latency < 100) {
        this.connectionSpeed = 'fast'
      } else if (latency < 300) {
        this.connectionSpeed = 'medium'
      } else {
        this.connectionSpeed = 'slow'
      }

      this.lastSpeedTest = Date.now()
      return this.connectionSpeed
    } catch {
      return 'medium' // Default fallback
    }
  }

  // Get optimized settings based on connection speed
  static getOptimizedSettings(): {
    videoQuality: 'low' | 'medium' | 'high'
    audioQuality: 'low' | 'medium' | 'high'
    reconnectDelay: number
    maxConcurrentRequests: number
  } {
    switch (this.connectionSpeed) {
      case 'slow':
        return {
          videoQuality: 'low',
          audioQuality: 'medium',
          reconnectDelay: 5000,
          maxConcurrentRequests: 1
        }
      case 'fast':
        return {
          videoQuality: 'high',
          audioQuality: 'high',
          reconnectDelay: 1000,
          maxConcurrentRequests: 3
        }
      default:
        return {
          videoQuality: 'medium',
          audioQuality: 'medium',
          reconnectDelay: 2000,
          maxConcurrentRequests: 2
        }
    }
  }
}