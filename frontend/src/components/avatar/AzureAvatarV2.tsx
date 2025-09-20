'use client'

import React, { memo } from 'react'
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, Loader2, Settings } from 'lucide-react'
import { useAzureAvatar } from '@/lib/azure/avatar-hook'
import { AvatarCallbacks } from '@/lib/azure/types'
import { AvatarErrorHandler } from '@/lib/azure/error-handler'
import { avatarConfig } from '@/lib/azure/config'

interface AzureAvatarV2Props extends AvatarCallbacks {
  className?: string
  autoStart?: boolean
  avatarConfigIndex?: number
  showControls?: boolean
  showStatus?: boolean
}

const AzureAvatarV2: React.FC<AzureAvatarV2Props> = memo(({
  className = '',
  autoStart = true,
  avatarConfigIndex = 0,
  showControls = true,
  showStatus = true,
  ...callbacks
}) => {
  
  const {
    // State
    isLoading,
    isListening,
    isSpeaking,
    avatarReady,
    sessionActive,
    isReconnecting,
    error,
    continuousConversation,
    currentAvatarConfig,
    spokenTextQueue,
    hasValidCredentials,
    isAudioBlocked,
    
    // Actions
    initializeAvatar,
    startListening,
    stopListening,
    stopSpeaking,
    toggleContinuousConversation,
    clearError,
    
    // Refs
    videoRef,
    audioRef
  } = useAzureAvatar({
    autoStart,
    avatarConfigIndex,
    ...callbacks
  })

  // Enhanced error handling
  const enhancedError = React.useMemo(() => {
    if (!error) return null
    return AvatarErrorHandler.analyzeError(error)
  }, [error])

  // Get user-friendly error message
  const userFriendlyError = React.useMemo(() => {
    if (!enhancedError) return null
    return AvatarErrorHandler.formatUserFriendlyMessage(enhancedError)
  }, [enhancedError])

  // Create an enhanced stopSpeaking handler that ensures state is updated immediately
  const handleStopSpeaking = React.useCallback(async () => {
    try {
      // Call the original stopSpeaking function
      await stopSpeaking()
      
      // Force update any parent components that might be listening to speaking state
      if (callbacks.onSpeechEnd) {
        callbacks.onSpeechEnd()
      }
    } catch (error) {
      console.error('Error in handleStopSpeaking:', error)
    }
  }, [stopSpeaking, callbacks])

  // Get configuration info for debugging
  const configInfo = React.useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      return avatarConfig.getDebugInfo()
    }
    return null
  }, [])

  // Debug video state periodically in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && avatarReady) {
      const interval = setInterval(() => {
        if (videoRef.current) {
          console.log('🔍 Video Debug State:', {
            srcObject: !!videoRef.current.srcObject,
            videoWidth: videoRef.current.videoWidth,
            videoHeight: videoRef.current.videoHeight,
            readyState: videoRef.current.readyState,
            networkState: videoRef.current.networkState,
            paused: videoRef.current.paused,
            ended: videoRef.current.ended,
            currentTime: videoRef.current.currentTime,
            duration: videoRef.current.duration,
            muted: videoRef.current.muted,
            autoplay: videoRef.current.autoplay,
            src: videoRef.current.src,
            className: videoRef.current.className,
            style: {
              display: videoRef.current.style.display,
              visibility: videoRef.current.style.visibility,
              opacity: videoRef.current.style.opacity,
              width: videoRef.current.style.width,
              height: videoRef.current.style.height
            }
          })
          
          // Check if video has tracks
          if (videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream
            console.log('🔍 Video Stream Debug:', {
              streamId: stream.id,
              active: stream.active,
              videoTracks: stream.getVideoTracks().length,
              videoTrackDetails: stream.getVideoTracks().map(track => ({
                id: track.id,
                label: track.label,
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState
              }))
            })
          }
        }
      }, 3000) // Check every 3 seconds
      
      return () => clearInterval(interval)
    }
  }, [avatarReady])

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Avatar Container - Direct Video Only */}
      <div className="relative inline-block">
        {/* Loading State - Minimal */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
            <p className="text-sm text-gray-600">
              {isReconnecting 
                ? ('Reconnecting...')
                : ('Starting avatar...')
              }
            </p>
          </div>
        )}

        {/* Avatar Video - Direct Display */}
        {!isLoading && avatarReady && (
          <video
            ref={videoRef}
            className={`w-90 h-120 ml-4 object-cover rounded-xl shadow-xl transform transition-all duration-300 ${
              isSpeaking ? 'scale-103 shadow-blue-400/40' : 'scale-100'
            }`}
            muted={false}
            autoPlay
            playsInline
            onLoadStart={() => {
              console.log('📺 Video load started')
              console.log('📺 Video element details at loadStart:', {
                srcObject: !!videoRef.current?.srcObject,
                readyState: videoRef.current?.readyState,
                networkState: videoRef.current?.networkState,
                videoWidth: videoRef.current?.videoWidth,
                videoHeight: videoRef.current?.videoHeight
              })
            }}
            onLoadedMetadata={() => {
              console.log('📺 Video metadata loaded')
              console.log('📺 Video metadata details:', {
                videoWidth: videoRef.current?.videoWidth,
                videoHeight: videoRef.current?.videoHeight,
                duration: videoRef.current?.duration,
                readyState: videoRef.current?.readyState
              })
            }}
            onLoadedData={() => {
              console.log('📺 Video data loaded')
              console.log('📺 Video data details:', {
                videoWidth: videoRef.current?.videoWidth,
                videoHeight: videoRef.current?.videoHeight,
                currentTime: videoRef.current?.currentTime,
                readyState: videoRef.current?.readyState
              })
            }}
            onCanPlay={() => {
              console.log('📺 Video can play')
              console.log('📺 Video canPlay details:', {
                videoWidth: videoRef.current?.videoWidth,
                videoHeight: videoRef.current?.videoHeight,
                paused: videoRef.current?.paused,
                readyState: videoRef.current?.readyState
              })
            }}
            onPlay={() => {
              console.log('▶️ Video started playing')
              console.log('📺 Video play details:', {
                videoWidth: videoRef.current?.videoWidth,
                videoHeight: videoRef.current?.videoHeight,
                currentTime: videoRef.current?.currentTime,
                paused: videoRef.current?.paused
              })
            }}
            onPlaying={() => {
              console.log('▶️ Video is playing')
              console.log('📺 Video playing details:', {
                videoWidth: videoRef.current?.videoWidth,
                videoHeight: videoRef.current?.videoHeight,
                currentTime: videoRef.current?.currentTime
              })
            }}
            onTimeUpdate={() => {
              // Only log every 5 seconds to avoid spam
              const currentTime = videoRef.current?.currentTime || 0
              if (Math.floor(currentTime) % 5 === 0 && Math.floor(currentTime * 10) % 10 === 0) {
                console.log('📺 Video time update:', {
                  currentTime: currentTime,
                  videoWidth: videoRef.current?.videoWidth,
                  videoHeight: videoRef.current?.videoHeight
                })
              }
            }}
            onError={(e) => {
              console.error('📺 Video error:', e)
              const videoError = (e.target as HTMLVideoElement)?.error;
              console.error('📺 Video error details:', {
                error: videoError,
                code: videoError?.code,
                message: videoError?.message,
                srcObject: !!videoRef.current?.srcObject,
                readyState: videoRef.current?.readyState,
                networkState: videoRef.current?.networkState
              })
            }}
            onStalled={() => console.log('📺 Video stalled')}
            onSuspend={() => console.log('📺 Video suspended')}
            onWaiting={() => console.log('📺 Video waiting')}
          />
        )}

        {/* Error State - Minimal */}
        {!isLoading && !avatarReady && error && (
          (() => { console.error('Avatar connection error:', error); })(),
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-red-600 mb-2">
              {'Connection error'}
            </p>
            <button
              onClick={initializeAvatar}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            >
              {'Retry'}
            </button>
          </div>
        )}

        {/* Audio element for speech output */}
        <audio 
          ref={audioRef} 
          style={{ display: 'none' }} 
          autoPlay
          controls={false}
          preload="auto"
          muted={false}
        />
      </div>

      {/* Error Display */}
      {error && hasValidCredentials && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-600 font-medium">
                {userFriendlyError || error}
              </p>
              {enhancedError?.suggestedAction && (
                <p className="text-xs text-red-500 mt-1">
                  {enhancedError.suggestedAction}
                </p>
              )}
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={clearError}
              className="text-xs text-red-500 hover:text-red-700 underline"
            >
              {'Dismiss'}
            </button>
            {enhancedError?.recoverable && (
              <button
                onClick={initializeAvatar}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                {'Retry'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      {showControls && avatarReady && sessionActive && (
        <div className="flex gap-3 mb-4 mt-6">
          {/* Voice Control Button
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isSpeaking && !isAudioBlocked}
            className={`p-4 rounded-full transition-all duration-300 ${
              isAudioBlocked
                ? 'bg-yellow-500 hover:bg-yellow-600 animate-pulse'
                : isListening
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-green-500 hover:bg-green-600'
            } text-white shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
            title={
              isAudioBlocked
                ? (language === 'ms' ? 'Aktifkan audio' : 'Enable audio')
                : isListening
                ? (language === 'ms' ? 'Hentikan mendengar' : 'Stop listening')
                : (language === 'ms' ? 'Tekan untuk bercakap' : 'Press to speak')
            }
          >
            {isListening ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button> */}

          {/* Stop Speaking Button */}
          {/* {isSpeaking && (
            <button
              onClick={handleStopSpeaking}
              className="p-4 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              title={language === 'ms' ? 'Hentikan bercakap' : 'Stop speaking'}
            >
              <VolumeX className="w-6 h-6" />
            </button>
          )} */}

          {/* Continuous Conversation Toggle
          <button
            onClick={toggleContinuousConversation}
            className={`p-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
              continuousConversation 
                ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
            }`}
            title={
              continuousConversation
                ? (language === 'ms' ? 'Matikan mod berterusan' : 'Disable continuous mode')
                : (language === 'ms' ? 'Aktifkan mod berterusan' : 'Enable continuous mode')
            }
          >
            <Settings className="w-5 h-5" />
          </button> */}
        </div>
      )}

    </div>
  )
})

AzureAvatarV2.displayName = 'AzureAvatarV2'

export default AzureAvatarV2