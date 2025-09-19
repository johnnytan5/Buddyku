"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircleIcon, Send, Upload, Mic, X } from "lucide-react";
import AzureAvatar from "@/components/avatar/AzureAvatar";
import { useAzureAvatarEnhanced } from '@/hooks/useAzureAvatarEnhanced'

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatbotPage() {
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState<
    "granted" | "denied" | "pending" | "unknown"
  >("unknown");

  const [messages, setMessages] = useState<Message[]>([]);
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
    autoProcessSpeech: true,
  });

  useEffect(() => {
    setIsAvatarSpeaking(isSpeaking);
  }, [isSpeaking]);

  // Request microphone permission when needed
  const requestMicrophonePermission = async () => {
    setMicrophonePermission("pending");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophonePermission("granted");
      if ("speechSynthesis" in window) {
        const testUtterance = new SpeechSynthesisUtterance("Audio test");
        testUtterance.volume = 0.1;
        speechSynthesis.speak(testUtterance);
      }
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      setMicrophonePermission("denied");
      return false;
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message handler
  const handleSendMessage = async (message: string, fromSpeech = false) => {
    if (!message.trim()) return;
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInputMessage("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          message_history: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
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

      // Once the stream is complete, speak the full response
      speakText(assistantResponse);

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
    } catch (error) {
      setIsAvatarSpeaking(false);
    }
  };

  // Handle Enter key for textarea
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputMessage);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white relative w-full" style={{ overflow: 'hidden' }}>
      {/* Avatar and status */}
      <div className="w-full flex flex-col items-center pt-26 pb-2">
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
            <span>Microphone permission denied.</span>
          </div>
        )}
        {microphonePermission === "granted" && (
          <div className="mt-2 bg-green-100 border border-green-300 rounded-lg px-3 py-2 text-xs flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Microphone ready.</span>
          </div>
        )}
        {/* Avatar Status Indicator
        <div className="mt-2 flex items-center justify-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              avatarReady ? "bg-green-500" : "bg-yellow-500 animate-pulse"
            }`}
          ></div>
          <span className="text-xs text-gray-600">
            {avatarReady ? "Avatar ready" : "Initializing avatar..."}
          </span>
        </div> */}
        {/* Error Display */}
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
      </div>

      {/* Chat messages */}
      <div
        className="flex-1 w-full px-4 overflow-y-auto"
      >
        {/* {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            Start chatting with your AI avatar!
          </div>
        )} */}
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
              {msg.content}
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
              onKeyPress={handleKeyPress}
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
              onClick={async () => {
                const granted = microphonePermission === "granted"
                  ? true
                  : await requestMicrophonePermission();
                if (
                  granted &&
                  avatarReady &&
                  !isListening &&
                  !isSpeaking &&
                  !isLoading &&
                  !isProcessing
                ) {
                  startListening();
                }
              }}
              disabled={
                microphonePermission === "denied" ||
                !avatarReady ||
                isListening ||
                isSpeaking ||
                isLoading ||
                isProcessing
              }
              className={`p-3 mb-2 rounded-full transition-all duration-200 transform hover:scale-105 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : avatarReady
                  ? 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title={
                microphonePermission === "denied"
                  ? "Microphone permission denied"
                  : !avatarReady
                  ? "Avatar not ready"
                  : isListening
                  ? "Listening..."
                  : "Voice message"
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
                handleSendMessage(inputMessage);
              }}
              disabled={!inputMessage.trim() || isLoading || isAvatarSpeaking}
              className="p-3 mb-2 gradient-primary text-black rounded-full hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}