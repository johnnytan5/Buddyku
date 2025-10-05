"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SquarePen, Video } from "lucide-react";
import { Send, Mic, X } from "lucide-react";
import AzureAvatar from "@/components/avatar/AzureAvatar";
import { useAzureAvatarEnhanced } from '@/hooks/useAzureAvatarEnhanced'
import MoodSummaryModal from '@/components/MoodSummaryModal';
import dynamic from 'next/dynamic';

type Message = {
  role: "user" | "assistant";
  content: string;
  breathingSuggestion?: boolean;
};

type Mood = "very-sad" | "sad" | "neutral" | "happy" | "very-happy";
type Emotion = "belonging" | "calm" | "comfort" | "disappointment" | "gratitude" | "hope" | "joy" | "love" | "sadness" | "strength";

interface MoodSummaryData {
  date: string;
  mood: Mood;
  emotion: Emotion;
  content: string;
  gratitude: string[];
  achievements: string[];
  isFavorite: boolean;
}

const BreathingModal = dynamic(() => import('../modal1/page'), { ssr: false });

export default function ChatbotPage() {
  const router = useRouter();
  
  // Sample mood summary data (hardcoded fallback)
  const sampleMoodData: MoodSummaryData = {
    date: new Date().toISOString().split('T')[0],
    mood: 'sad',
    emotion: 'sadness',
    content: 'Had a conversation about feeling stressed and overwhelmed. Shared concerns about daily pressures and the need for emotional support.',
    gratitude: ['Having someone to talk to'],
    achievements: ['Opened up about feelings'],
    isFavorite: false
  };

  // State for mood summary data
  const [moodSummaryData, setMoodSummaryData] = useState<MoodSummaryData>(sampleMoodData);

  // Clear chat handler - now shows mood summary first
  const handleClearChat = async () => {
    if (messages.length > 0) {
      try {
        // Generate mood summary from messages using LLM
        console.log('Generating mood summary for', messages.length, 'messages');
        const response = await fetch('/api/generate-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          })
        });

        if (response.ok) {
          const summaryData = await response.json();
          console.log('Generated mood summary:', summaryData);
          setMoodSummaryData(summaryData);
          
          // Upload mood summary to S3 after generation
          await uploadMoodSummaryToS3(summaryData);
        } else {
          console.warn('Failed to generate mood summary, using fallback');
          console.warn('Response status:', response.status);
          // Keep using the existing sampleMoodData as fallback
          
          // Still try to upload the fallback data
          await uploadMoodSummaryToS3(sampleMoodData);
        }
      } catch (error) {
        console.error('Error generating mood summary:', error);
        // Keep using the existing sampleMoodData as fallback
        
        // Still try to upload the fallback data
        await uploadMoodSummaryToS3(sampleMoodData);
      }
      
      // Show mood summary modal (either with generated or fallback data)
      setShowMoodSummary(true);
    }
  };

  // Upload mood summary to S3
  const uploadMoodSummaryToS3 = async (summaryData: MoodSummaryData) => {
    setIsUploadingToS3(true);
    setUploadSuccess(null);
    
    try {
      const user_id = "test_user_123";
      
      const uploadData = {
        user_id: user_id,
        date: summaryData.date,
        mood: summaryData.mood,
        emotion: summaryData.emotion,
        title: "Chat Session Summary",
        content: summaryData.content,
        description: "Generated from chat conversation with Ruby",
        location: "",
        people: [],
        tags: [],
        gratitude: summaryData.gratitude,
        achievements: summaryData.achievements,
        mediaAttachments: [],
        isFavorite: summaryData.isFavorite
      };

      console.log('Uploading mood summary to S3:', uploadData);
      
      const response = await fetch('/api/upload-emotion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Successfully uploaded mood summary to S3:', result);
        setUploadSuccess(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => setUploadSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        console.error('Failed to upload mood summary:', errorData);
        setUploadSuccess(false);
        
        // Clear error message after 5 seconds
        setTimeout(() => setUploadSuccess(null), 5000);
      }
    } catch (error) {
      console.error('Error uploading mood summary to S3:', error);
      setUploadSuccess(false);
      
      // Clear error message after 5 seconds
      setTimeout(() => setUploadSuccess(null), 5000);
    } finally {
      setIsUploadingToS3(false);
    }
  };

  // Handle mood summary close (just close modal, don't clear messages)
  const handleMoodSummaryClose = () => {
    setShowMoodSummary(false);
  };

  // Handle end conversation (close modal AND clear messages but keep welcome message)
  const handleEndConversation = () => {
    setShowMoodSummary(false);
    setMessages([
      {
        role: "assistant",
        content: "Hi! I'm Ruby, here to listen and support you. What's on your mind today?"
      }
    ]);
    setInputMessage("");
  };

  // Video call handler
  const handleVideoCall = () => {
    router.push("/video-call");
  };
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [showMoodSummary, setShowMoodSummary] = useState(false);
  const [isUploadingToS3, setIsUploadingToS3] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean | null>(null);
  const [microphonePermission, setMicrophonePermission] = useState<
    "granted" | "denied" | "pending" | "unknown"
  >("unknown");

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I’m Ruby, here to listen and support you. What’s on your mind today?"
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Azure Avatar integration
  const {
    isListening,
    isSpeaking,
    avatarReady,
    error: avatarError,
    isProcessing,
    speakText,
    startListening,
    stopSpeaking,
    clearError,
    handleSpeechRecognized,
    handleSpeechStart,
    handleSpeechEnd,
    handleAvatarReady,
    handleAvatarError,
  } = useAzureAvatarEnhanced({
    onSpeechRecognized: (text) => {
      const speechText = typeof text === "string" ? text.trim() : "";
      if (speechText) {
        setInputMessage(speechText);
        handleSendMessage(speechText, true);
      }
    },
    onError: (error) => {
      console.error("Avatar error:", error);
    },
    autoProcessSpeech: false,
    chatEndpoint: '/api/chat'
  });

  useEffect(() => {
    setIsAvatarSpeaking(isSpeaking);
  }, [isSpeaking]);

  // State to track if welcome message has been spoken
  const [welcomeSpoken, setWelcomeSpoken] = useState(false);

  // Effect to speak the welcome message when avatar is ready (only once on initial load)
  useEffect(() => {
    if (avatarReady && messages.length === 1 && messages[0].role === "assistant" && !welcomeSpoken) {
      // Delay to ensure avatar is fully initialized
      setTimeout(async () => {
        console.log("Speaking welcome message...");
        try {
          await speakText(messages[0].content);
          setWelcomeSpoken(true);
          
          // Safety timeout to ensure UI is not stuck in speaking state
          setTimeout(() => {
            if (isSpeaking) {
              console.warn("Welcome message speaking safety timeout - resetting state");
              setIsAvatarSpeaking(false);
            }
          }, 10000); // 10 second safety timeout
          
        } catch (error) {
          console.error("Error speaking welcome message:", error);
          setWelcomeSpoken(true);
          setIsAvatarSpeaking(false);
        }
      }, 1500);
    }
  }, [avatarReady, messages, speakText, welcomeSpoken, isSpeaking]);

  useEffect(() => {
    const initializeAudio = async () => {
      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('MediaDevices API not supported');
        setMicrophonePermission('denied');
        return;
      }

      // Check if we're in a secure context
      if (!window.isSecureContext) {
        console.error('Not in secure context - microphone access requires HTTPS or localhost');
        setMicrophonePermission('denied');
        return;
      }

      setMicrophonePermission('unknown');
    };

    initializeAudio();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message handler
  const handleSendMessage = async (message: string, fromSpeech = false) => {
    console.log("handleSendMessage called", { 
      message: message.substring(0, 50) + "...", 
      fromSpeech, 
      isLoading, 
      isAvatarSpeaking,
      isSpeaking 
    });
    
    if (!message.trim()) {
      console.log("No message to send");
      return;
    }
    
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInputMessage("");

    // Suicide risk detection
    try {
      const suicideRes = await fetch("/api/detect-suicide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (suicideRes.ok) {
        const risk = await suicideRes.json();
        console.log("[Suicide Risk]", { message, ...risk });
        
        // Check for very high risk and trigger AI call
        if (risk.risk_level === "very-high" || risk.risk_score >= 0.9) {
          console.log("VERY HIGH SUICIDE RISK DETECTED - Initiating emergency AI call");
          
          // Trigger AI calling endpoint
          try {
            const callResponse = await fetch("/api/initiate-call", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to_number: "+1234567890", // Replace with user's actual phone number
                user_id: "test_user_123", // Replace with actual user ID
                initial_mood: "crisis",
                custom_prompt: "This is an emergency call. The user has expressed suicidal thoughts and needs immediate support and crisis intervention."
              }),
            });
            
            if (callResponse.ok) {
              const callResult = await callResponse.json();
              console.log("Emergency AI call initiated successfully:", callResult);
              
              // Show emergency message to user
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: "I'm very concerned about what you've shared. I'm here for you right now, and I've also initiated a call from our crisis support team who will reach out to you shortly. You are not alone, and there are people who want to help you through this difficult time. Please stay safe.",
                } as any,
              ]);
            } else {
              const errorData = await callResponse.json();
              console.error("Failed to initiate emergency AI call:", errorData);
            }
          } catch (callError) {
            console.error("Error initiating emergency AI call:", callError);
          }
        }
      } else {
        const fallbackRes = await fetch("http://13.229.59.23/predict-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
        const fallbackRisk = await fallbackRes.json();
        console.warn("[Suicide Risk] Detection failed, fallback result:", fallbackRisk);
      }
    } catch (err) {
      console.warn("[Suicide Risk] Detection error:", err);
    }

    // Check for 'stress' or 'stressed' keyword
    if (/\bstress(ed)?\b/i.test(message)) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I'm sorry you're feeling stressed—it's okay to feel this way. You're not alone, and I'm here to listen. Would you like me to guide you through a calming breathing exercise?",
            breathingSuggestion: true,
          } as any,
        ]);
      }, 2000);
      setIsLoading(false);
      return;
    }

    try {
      // Filter out the initial assistant welcome message from history
      // Only include messages after the first welcome message
      const messageHistoryForAPI = messages.length > 1 
        ? messages.slice(1).map((msg) => ({
            role: msg.role,
            content: msg.content,
          }))
        : [];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          message_history: messageHistoryForAPI,
        }),
      });

      if (!res.body) {
        throw new Error("Response body is not a readable stream.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let assistantResponse = "";

      // Read the stream and update the state with each new chunk
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break; // The stream has ended
        }

        const chunk = decoder.decode(value, { stream: true });
        assistantResponse += chunk;

        // Update the state with the partial response
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.role === "assistant") {
            const updatedMessages = [...prev];
            updatedMessages[prev.length - 1] = {
              ...lastMessage,
              content: assistantResponse,
            };
            return updatedMessages;
          } else {
            return [...prev, { role: "assistant", content: assistantResponse }];
          }
        });
      }

      // Once the stream is complete, add a delay before speaking the full response
      setTimeout(() => {
        speakText(assistantResponse);
      }, 1000);

    } catch (error) {
      console.error("Streaming fetch failed:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "This is a demo response" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Stop speaking handler
  const handleStopSpeaking = async () => {
    try {
      await stopSpeaking();
      setIsAvatarSpeaking(false);
      setInputMessage("");
    } catch (error: any) {
      setIsAvatarSpeaking(false);
    }
  };

  // Handle Enter key for textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputMessage);
    }
  };

  return (
    <div className="flex flex-col bg-white relative w-full min-h-[calc(100vh-64px)]">
      {/* Top Navigation Bar */}
      <nav className="relative w-full flex items-center justify-center h-16 border-b border-gray-200 bg-white shadow-sm">
        {/* Clear Chat Button (left) */}
        <button
          onClick={handleClearChat}
          aria-label="Clear chat"
          title="Clear chat session"
          className="absolute left-4 hover:bg-blue-700 rounded-full p-2 transition"
        >
          <SquarePen className="h-5 w-5 text-blue-600" />
        </button>
        {/* Title (center) */}
        <span className="text-lg font-semibold text-gray-800">Your Buddy Companion</span>
        {/* Video Call Button (right) */}
        <button
          onClick={handleVideoCall}
          aria-label="Video call"
          title="Start video call"
          className="absolute right-4 hover:bg-green-700 rounded-full p-2 transition"
        >
          <Video className="h-5 w-5 text-green-600" />
        </button>
      </nav>
      {/* Avatar and status */}
      <div className="w-full flex flex-col items-center pt-20 pb-2">
        <AzureAvatar
          onSpeechRecognized={handleSpeechRecognized}
          onSpeechStart={handleSpeechStart}
          onSpeechEnd={handleSpeechEnd}
          onAvatarReady={handleAvatarReady}
          onError={handleAvatarError}
          fallbackToRobot={true}
          autoStart={true}
          useNewImplementation={true}
          className="mx-auto"
        />
        {/* Microphone Permission Indicator */}
        {microphonePermission === "pending" && (
          <div className="mt-2 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2 text-xs flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span>Requesting microphone permission...</span>
          </div>
        )}
        {microphonePermission === "denied" && (
          <div className="mt-2 bg-red-100 border border-red-300 rounded-lg px-3 py-2 text-xs flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Microphone access is blocked.</span>
          </div>
        )}
        {microphonePermission === "granted" && (
          <div className="mt-2 bg-green-100 border border-green-300 rounded-lg px-3 py-2 text-xs flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Microphone ready.</span>
          </div>
        )}
        {avatarError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg max-w-sm backdrop-blur-sm bg-opacity-90">
            <p className="text-xs text-red-600 text-center">{avatarError}</p>
            <button
              onClick={clearError}
              className="block mx-auto mt-2 text-xs text-red-500 hover:text-red-700 underline"
            >
              Dismiss
            </button>
          </div>
        )}
        {/* Upload Status Indicator */}
        {isUploadingToS3 && (
          <div className="mt-2 bg-blue-100 border border-blue-300 rounded-lg px-3 py-2 text-xs flex items-center space-x-2 max-w-sm mx-auto">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-700">Saving conversation summary...</span>
          </div>
        )}
        {uploadSuccess === true && (
          <div className="mt-2 bg-green-100 border border-green-300 rounded-lg px-3 py-2 text-xs flex items-center space-x-2 max-w-sm mx-auto">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-green-700">Conversation saved successfully!</span>
          </div>
        )}
        {uploadSuccess === false && (
          <div className="mt-2 bg-red-100 border border-red-300 rounded-lg px-3 py-2 text-xs flex items-center space-x-2 max-w-sm mx-auto">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-red-700">Failed to save conversation. Please try again.</span>
          </div>
        )}
      </div>

      {/* Chat messages (scrollable only this area) */}
      <div
        className="w-full px-4"
        style={{
          flex: 1,
          minHeight: 0,
          maxHeight: 'calc(100vh - 480px)', // adjust as needed for header/footer
          overflowY: 'auto',
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`my-2 flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-xs ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.breathingSuggestion ? (
                <div>
                  <div>{msg.content}</div>
                  <button
                    className="mt-3 w-full px-4 py-3 text-sm font-semibold rounded-xl shadow-sm transition-all duration-200 border border-blue-200/60 bg-gradient-to-br from-purple-100 to-blue-100 text-blue-700 hover:from-purple-100 hover:to-blue-200 hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-blue-200"
                    onClick={() => setShowBreathingModal(true)}
                  >
                    <span className="inline-block align-middle mr-1.5">🧘‍♂️</span>Start Breathing Exercise
                  </button>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="w-full bg-white border-t border-gray-200 px-4 py-3 "
        style={{
          boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
          marginBottom: 0,
          maxWidth: '100vw'
        }}
      >
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="w-full resize-none border border-gray-300 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px', overflow: 'hidden' }}
            />
          </div>
          <div className="flex items-center space-x-2">
            {/* Voice Button */}
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log("Microphone button clicked");
                
                // Check if we're in a secure context
                if (!window.isSecureContext) {
                  alert("Microphone access requires a secure connection (HTTPS). Please access this site via HTTPS or localhost.");
                  return;
                }
                
                console.log("Current state:", { 
                  microphonePermission, 
                  avatarReady, 
                  isListening, 
                  isSpeaking, 
                  isLoading, 
                  isProcessing 
                });
                
                // Always request permission on first click or if permission was denied/unknown
                if (microphonePermission !== "granted") {
                  console.log("Requesting microphone permission...");
                  
                  // Set to pending state immediately
                  setMicrophonePermission('pending');
                  
                  try {
                    // This MUST trigger the browser's native permission dialog
                    console.log('Calling getUserMedia...');
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                      audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                      }
                    });
                    
                    console.log('✅ Microphone permission granted!');
                    setMicrophonePermission('granted');
                    
                    // Clean up the stream
                    stream.getTracks().forEach(track => {
                      track.stop();
                      console.log('Track stopped:', track.kind);
                    });
                    
                    // Now start listening since we have permission
                    if (avatarReady && !isListening && !isSpeaking && !isLoading && !isProcessing) {
                      console.log("Starting listening after permission granted...");
                      setTimeout(() => startListening(), 100); // Small delay to ensure state is updated
                    }
                    
                  } catch (error: any) {
                    console.error('❌ Microphone permission error:', error);
                    setMicrophonePermission('denied');
                    return;
                  }
                } else {
                  if (avatarReady && !isListening && !isSpeaking && !isLoading && !isProcessing) {
                    console.log("Starting listening with existing permission...");
                    startListening();
                  } else {
                    console.log("Cannot start listening, conditions not met:", {
                      avatarReady,
                      isListening,
                      isSpeaking,
                      isLoading,
                      isProcessing
                    });
                  }
                }
              }}
              disabled={
                !avatarReady ||
                isListening ||
                isSpeaking ||
                isLoading ||
                isProcessing ||
                microphonePermission === "pending"
              }
              className={`p-3 mb-2 rounded-full transition-all duration-200 transform hover:scale-105 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : avatarReady && microphonePermission !== "denied"
                  ? 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title={
                microphonePermission === "denied"
                  ? "Microphone permission denied - click to retry"
                  : microphonePermission === "pending"
                  ? "Requesting microphone permission..."
                  : !avatarReady
                  ? "Avatar not ready"
                  : isListening
                  ? "Listening..."
                  : "Click to start voice input"
              }
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Stop Speaking Button */}
            {isAvatarSpeaking && (
              <button
                onClick={handleStopSpeaking}
                className="p-3 mb-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-all duration-200 transform hover:scale-105"
                title="Stop speaking"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={(e) => {
                e.preventDefault();
                console.log("Send button clicked", { 
                  hasMessage: !!inputMessage.trim(), 
                  isLoading, 
                  isAvatarSpeaking,
                  isSpeaking 
                });
                handleSendMessage(inputMessage);
              }}
              disabled={!inputMessage.trim() || isLoading || isAvatarSpeaking}
              className="p-3 mb-2 gradient-primary text-black rounded-full hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              title={
                !inputMessage.trim() 
                  ? "Enter a message" 
                  : isLoading 
                  ? "Loading..." 
                  : isAvatarSpeaking 
                  ? "Avatar is speaking..." 
                  : "Send message"
              }
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {/* Breathing Exercise Modal */}
      {showBreathingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          {/* Clicking outside closes the modal */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 40 }}
            onClick={() => setShowBreathingModal(false)}
          />
          <div
            className="relative w-full max-w-md z-50"
            onClick={e => e.stopPropagation()}
          >
            <BreathingModal onClose={() => setShowBreathingModal(false)} />
            {/* Overlay close button (optional):
            <button onClick={() => setShowBreathingModal(false)} className="absolute top-2 right-2 z-50 bg-white rounded-full p-1 shadow hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-600" />
            </button> */}
          </div>
        </div>
      )}

      {/* Mood Summary Modal */}
      <MoodSummaryModal 
        isOpen={showMoodSummary}
        onClose={handleMoodSummaryClose}
        onEndConversation={handleEndConversation}
        summaryData={moodSummaryData}
      />
    </div>
  );
}