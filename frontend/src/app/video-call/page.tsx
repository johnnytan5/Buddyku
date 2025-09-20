"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, PhoneOff, X } from "lucide-react";
import AzureAvatar from "@/components/avatar/AzureAvatar";
import { useAzureAvatarEnhanced } from '@/hooks/useAzureAvatarEnhanced';


// Helper to capture a frame from a video element as a JPEG Blob
async function captureFrameAsJpeg(video: HTMLVideoElement): Promise<Blob | null> {
    if (!video || video.readyState < 2) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92);
    });
}

export default function VideoCallPage() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [microphonePermission, setMicrophonePermission] = useState<"granted" | "denied" | "pending" | "unknown">("unknown");
    const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
    const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
    const [riskScore, setRiskScore] = useState<number | null>(null);
    const [mood, setMood] = useState<string | null>(null);

    // Periodically capture webcam image and send to mood endpoint
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        async function sendFrame() {
            if (videoRef.current && videoRef.current.readyState >= 2) {
                const blob = await captureFrameAsJpeg(videoRef.current);
                if (blob) {
                    console.log(`[MoodAPI] Sending image at ${new Date().toISOString()} | size: ${blob.size} bytes`);
                    const formData = new FormData();
                    formData.append('file', blob, 'frame.jpg');
                    let success = false;
                    // Try primary endpoint
                    try {
                        const resp = await fetch('http://13.212.142.58/predict-mood', {
                            method: 'POST',
                            body: formData
                        });
                        console.log(`[MoodAPI] Response status: ${resp.status}`);
                        if (resp.ok) {
                            const data = await resp.json();
                            if (typeof data.risk_score !== 'undefined') setRiskScore(data.risk_score);
                            if (typeof data.mood !== 'undefined') setMood(data.mood);
                            success = true;
                        }
                    } catch (err) {
                        // Ignore error, will try fallback
                    }
                    // Fallback to backend if primary fails
                    if (!success) {
                        try {
                            const resp2 = await fetch('/api/mood-detection', {
                                method: 'POST',
                                body: formData
                            });
                            console.log(`[MoodAPI] Fallback /api/mood-detection status: ${resp2.status}`);
                            if (resp2.ok) {
                                const data2 = await resp2.json();
                                console.log(`[MoodAPI] Fallback response data: ${JSON.stringify(data2)}`);
                                if (typeof data2.risk_score !== 'undefined') setRiskScore(data2.risk_score);
                                if (typeof data2.mood !== 'undefined') setMood(data2.mood);
                            }
                        } catch (err2) {
                            // Ignore errors for now
                        }
                    }
                }
            }
        }
        interval = setInterval(sendFrame, 10000); // every 10 seconds
        return () => { if (interval) clearInterval(interval); };
    }, []);

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
        onSpeechRecognized: async (text) => {
            // When speech is recognized, send to /api/chat and speak the streamed response, with message history and mood/risk
            if (text && text.trim()) {
                setMessages(prev => [...prev, { role: "user", content: text }]);
                try {
                    const message_history = messages
                        .filter(msg => msg.role === "user" || (msg.role === "assistant" && msg.content.trim() !== ""))
                        .map(msg => ({ role: msg.role, content: msg.content }));
                    const chatPayload: any = {
                        message: text,
                        message_history
                    };
                    console.log(`Risk score: ${riskScore}, mood: ${mood}`);
                    if (riskScore !== null) chatPayload.risk_score = riskScore;
                    if (mood !== null) chatPayload.mood = mood;

                    const res = await fetch("/api/chat", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(chatPayload),
                    });
                    if (!res.body) {
                        throw new Error("Response body is not a readable stream.");
                    }
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder("utf-8");
                    let assistantResponse = "";
                    setMessages(prev => [...prev, { role: "assistant", content: "" }]);
                    let assistantIndex = -1;
                    setMessages(prev => {
                        assistantIndex = prev.length;
                        return prev;
                    });
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        assistantResponse += chunk;
                        setMessages(prev => {
                            const lastIdx = prev.map((m, i) => ({ ...m, i })).reverse().find(m => m.role === "assistant")?.i;
                            if (typeof lastIdx === "number") {
                                const updated = [...prev];
                                updated[lastIdx] = { ...updated[lastIdx], content: assistantResponse };
                                return updated;
                            }
                            return prev;
                        });
                    }
                    setTimeout(() => {
                        speakText(assistantResponse);
                    }, 100);
                } catch (error) {
                    console.error("Streaming fetch failed:", error);
                    speakText("Sorry, there was a problem getting a response.");
                }
            }
        },
        onError: (error) => {
            console.error("Avatar error:", error);
        },
        autoProcessSpeech: false,
        chatEndpoint: '/api/chat'
    });

    useEffect(() => {
        const getMedia = async () => {
            try {
                const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setStream(userStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = userStream;
                }
                setMicrophonePermission('granted');
            } catch (err: any) {
                setCameraError("Unable to access camera/microphone. Please check permissions.");
                setMicrophonePermission('denied');
            }
        };
        getMedia();
        return () => {
            if (stream) {
                stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    useEffect(() => {
        setIsAvatarSpeaking(isSpeaking);
    }, [isSpeaking]);

    // Voice input handler (start listening)
    const handleVoiceInput = async () => {
        if (!window.isSecureContext) {
            alert("Microphone access requires a secure connection (HTTPS). Please access this site via HTTPS or localhost.");
            return;
        }
        if (microphonePermission !== "granted") {
            setMicrophonePermission('pending');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                setMicrophonePermission('granted');
                stream.getTracks().forEach(track => track.stop());
                if (avatarReady && !isListening && !isSpeaking && !isProcessing) {
                    setTimeout(() => startListening(), 100);
                }
            } catch (error) {
                setMicrophonePermission('denied');
                return;
            }
        } else {
            if (avatarReady && !isListening && !isSpeaking && !isProcessing) {
                startListening();
            }
        }
    };

    // End call handler
    const handleEndCall = () => {
        window.history.back();
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-black">
            {/* Buddy Avatar takes almost full screen */}
            <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
                <div className={`w-full h-full flex items-center justify-center`}>
                    <div className={`w-full h-full max-w-[600px] max-h-[90vh] aspect-square mx-auto bg-white rounded-2xl overflow-hidden flex items-center justify-center border-4 border-green-400 shadow-xl ${isSpeaking ? 'ring-4 ring-green-400 animate-pulse' : ''}`}
                        style={{ minHeight: '320px', minWidth: '320px' }}>
                        <AzureAvatar
                            fallbackToRobot={true}
                            autoStart={true}
                            useNewImplementation={true}
                            onSpeechRecognized={handleSpeechRecognized}
                            onSpeechStart={handleSpeechStart}
                            onSpeechEnd={handleSpeechEnd}
                            onAvatarReady={handleAvatarReady}
                            onError={handleAvatarError}
                        />
                    </div>
                </div>
                {/* User Video as overlay at left bottom */}
                <div className="absolute left-4 bottom-4 w-[100px] h-[140px] sm:w-[120px] sm:h-[160px] bg-black rounded-xl overflow-hidden flex items-center justify-center border-4 border-blue-400 shadow-xl">
                    {cameraError ? (
                        <span className="text-red-500 text-center p-2 text-xs">{cameraError}</span>
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay={true}
                            playsInline={true}
                            muted={true}
                            className="w-full h-full object-cover"
                            style={{ background: '#222' }}
                        />
                    )}
                </div>
                {/* User label overlay */}
                <span className="absolute left-6 bottom-[1.1rem] text-white text-xs font-semibold drop-shadow">You</span>
                {/* Error Display */}
                {avatarError && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 p-3 bg-red-50 border border-red-200 rounded-lg max-w-sm backdrop-blur-sm bg-opacity-90 z-10">
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
            {/* Controls at the very bottom */}
            <div className="w-full flex justify-center items-center gap-8 pb-10 pt-6 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                <button
                    type="button"
                    onClick={handleVoiceInput}
                    disabled={
                        !avatarReady ||
                        isListening ||
                        isSpeaking ||
                        isProcessing ||
                        microphonePermission === "pending"
                    }
                    className={`flex items-center justify-center w-16 h-16 rounded-full transition-all duration-200 bg-green-600 hover:bg-green-700 text-white text-2xl shadow-lg ${isListening ? 'bg-red-500 animate-pulse' : ''} ${(!avatarReady || isListening || isSpeaking || isProcessing || microphonePermission === "pending") ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    <Mic className="w-8 h-8" />
                </button>
                {/* Stop Speaking Button */}
                {isAvatarSpeaking && (
                    <button
                        onClick={async () => { await stopSpeaking(); setIsAvatarSpeaking(false); }}
                        className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-2xl shadow-lg transition-all duration-200"
                        title="Stop speaking"
                    >
                        <X className="w-8 h-8" />
                    </button>
                )}
                <button
                    onClick={handleEndCall}
                    className="flex items-center justify-center w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white text-2xl shadow-lg transition-all duration-200"
                    title="End Call"
                >
                    <PhoneOff className="w-8 h-8" />
                </button>
            </div>
        </div>
    );
}
