import { useReducer, useCallback } from 'react'
import { AvatarState, AvatarConfig } from './types'

// Action Types
type AvatarActionType =
  | 'INITIALIZE_START'
  | 'INITIALIZE_SUCCESS' 
  | 'INITIALIZE_ERROR'
  | 'AVATAR_READY'
  | 'SESSION_ACTIVE'
  | 'LISTENING_START'
  | 'LISTENING_STOP'
  | 'SPEAKING_START'
  | 'SPEAKING_STOP'
  | 'RECONNECT_START'
  | 'RECONNECT_SUCCESS'
  | 'RECONNECT_FAILED'
  | 'CONTINUOUS_TOGGLE'
  | 'QUEUE_ADD'
  | 'QUEUE_REMOVE'
  | 'CONFIG_UPDATE'
  | 'ERROR_SET'
  | 'ERROR_CLEAR'
  | 'RESET'
  | 'SET_AUDIO_BLOCKED'

interface AvatarAction {
  type: AvatarActionType
  payload?: any
}

// Initial State
const initialState: AvatarState = {
  isInitialized: false,
  isLoading: false,
  isListening: false,
  isSpeaking: false,
  avatarReady: false,
  sessionActive: false,
  isReconnecting: false,
  error: null,
  continuousConversation: false,
  currentAvatarConfig: null,
  spokenTextQueue: [],
  reconnectAttempts: 0,
  isAudioBlocked: false
}

// Reducer
function avatarReducer(state: AvatarState, action: AvatarAction): AvatarState {
  switch (action.type) {
    case 'INITIALIZE_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        isInitialized: false
      }

    case 'INITIALIZE_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isInitialized: true,
        error: null
      }

    case 'INITIALIZE_ERROR':
      return {
        ...state,
        isLoading: false,
        isInitialized: false,
        error: action.payload
      }

    case 'AVATAR_READY':
      return {
        ...state,
        avatarReady: true,
        error: null,
        isLoading: false
      }

    case 'SESSION_ACTIVE':
      return {
        ...state,
        sessionActive: action.payload
      }

    case 'LISTENING_START':
      return {
        ...state,
        isListening: true,
        error: null
      }

    case 'LISTENING_STOP':
      return {
        ...state,
        isListening: false
      }

    case 'SPEAKING_START':
      return {
        ...state,
        isSpeaking: true
      }

    case 'SPEAKING_STOP':
      return {
        ...state,
        isSpeaking: false
      }

    case 'RECONNECT_START':
      return {
        ...state,
        isReconnecting: true,
        reconnectAttempts: state.reconnectAttempts + 1,
        error: null
      }

    case 'RECONNECT_SUCCESS':
      return {
        ...state,
        isReconnecting: false,
        reconnectAttempts: 0,
        error: null
      }

    case 'RECONNECT_FAILED':
      return {
        ...state,
        isReconnecting: false,
        error: action.payload
      }

    case 'CONTINUOUS_TOGGLE':
      return {
        ...state,
        continuousConversation: !state.continuousConversation
      }

    case 'QUEUE_ADD':
      return {
        ...state,
        spokenTextQueue: [...state.spokenTextQueue, action.payload]
      }

    case 'QUEUE_REMOVE':
      return {
        ...state,
        spokenTextQueue: state.spokenTextQueue.slice(1)
      }

    case 'CONFIG_UPDATE':
      return {
        ...state,
        currentAvatarConfig: action.payload
      }

    case 'ERROR_SET':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      }

    case 'ERROR_CLEAR':
      return {
        ...state,
        error: null
      }

    case 'RESET':
      return {
        ...initialState,
        currentAvatarConfig: state.currentAvatarConfig
      }

    case 'SET_AUDIO_BLOCKED':
      return {
        ...state,
        isAudioBlocked: action.payload
      }

    default:
      return state
  }
}

// Custom Hook
export function useAvatarState() {
  const [state, dispatch] = useReducer(avatarReducer, initialState)

  const actions = {
    initializeStart: useCallback(() => dispatch({ type: 'INITIALIZE_START' }), []),
    initializeSuccess: useCallback(() => dispatch({ type: 'INITIALIZE_SUCCESS' }), []),
    initializeError: useCallback((error: string) => dispatch({ type: 'INITIALIZE_ERROR', payload: error }), []),
    
    setAvatarReady: useCallback(() => dispatch({ type: 'AVATAR_READY' }), []),
    setSessionActive: useCallback((active: boolean) => dispatch({ type: 'SESSION_ACTIVE', payload: active }), []),
    
    startListening: useCallback(() => dispatch({ type: 'LISTENING_START' }), []),
    stopListening: useCallback(() => dispatch({ type: 'LISTENING_STOP' }), []),
    
    startSpeaking: useCallback(() => dispatch({ type: 'SPEAKING_START' }), []),
    stopSpeaking: useCallback(() => dispatch({ type: 'SPEAKING_STOP' }), []),
    
    startReconnect: useCallback(() => dispatch({ type: 'RECONNECT_START' }), []),
    reconnectSuccess: useCallback(() => dispatch({ type: 'RECONNECT_SUCCESS' }), []),
    reconnectFailed: useCallback((error: string) => dispatch({ type: 'RECONNECT_FAILED', payload: error }), []),
    
    toggleContinuous: useCallback(() => dispatch({ type: 'CONTINUOUS_TOGGLE' }), []),
    
    addToQueue: useCallback((text: string) => dispatch({ type: 'QUEUE_ADD', payload: text }), []),
    removeFromQueue: useCallback(() => dispatch({ type: 'QUEUE_REMOVE' }), []),
    
    updateConfig: useCallback((config: AvatarConfig) => dispatch({ type: 'CONFIG_UPDATE', payload: config }), []),
    
    setError: useCallback((error: string) => dispatch({ type: 'ERROR_SET', payload: error }), []),
    clearError: useCallback(() => dispatch({ type: 'ERROR_CLEAR' }), []),
    
    setAudioBlocked: useCallback((isBlocked: boolean) => dispatch({ type: 'SET_AUDIO_BLOCKED', payload: isBlocked }), []),
    
    reset: useCallback(() => dispatch({ type: 'RESET' }), [])
  }

  return { state, actions }
}