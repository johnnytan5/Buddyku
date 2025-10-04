"use client";

import { useState } from "react";
import { X, Heart, Sparkles, Calendar, BookOpen } from "lucide-react";

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

interface MoodSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEndConversation: () => void;
  summaryData: MoodSummaryData;
}

const moodEmojis: Record<Mood, string> = {
  "very-sad": "😢",
  "sad": "😔",
  "neutral": "😐",
  "happy": "😊",
  "very-happy": "😄"
};

const emotionEmojis: Record<Emotion, string> = {
  "belonging": "🤗",
  "calm": "😌",
  "comfort": "🫂",
  "disappointment": "😞",
  "gratitude": "🙏",
  "hope": "✨",
  "joy": "😁",
  "love": "💝",
  "sadness": "💙",
  "strength": "💪"
};

const moodColors: Record<Mood, string> = {
  "very-sad": "from-blue-100 to-purple-100",
  "sad": "from-blue-50 to-indigo-100",
  "neutral": "from-gray-50 to-slate-100",
  "happy": "from-yellow-50 to-orange-100",
  "very-happy": "from-pink-50 to-rose-100"
};

export default function MoodSummaryModal({ isOpen, onClose, onEndConversation, summaryData }: MoodSummaryModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-white bg-opacity-50 backdrop-blur-sm p-4 pt-16">
      {/* Background overlay */}
      <div className="fixed inset-0" onClick={onClose} />
      
      {/* Modal content - Mobile optimized */}
      <div className="relative w-full max-w-sm mx-auto z-50" onClick={e => e.stopPropagation()}>
        <div className={`bg-gradient-to-br ${moodColors[summaryData.mood]} rounded-2xl shadow-xl border border-white/20 p-4 backdrop-blur-sm max-h-[90vh] overflow-y-auto`}>
          {/* Header - Mobile optimized */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Chat Summary</h2>
                <p className="text-xs text-gray-600">Your journey today</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-all duration-200 shadow-md"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Date - Mobile optimized */}
          <div className="flex items-center space-x-2 mb-3">
            <Calendar className="w-3 h-3 text-gray-600" />
            <span className="text-xs text-gray-700 font-medium">{formatDate(summaryData.date)}</span>
          </div>

          {/* Mood and Emotion Cards - Mobile optimized */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {/* Mood Card */}
            <div className="bg-white/70 rounded-xl p-3 text-center shadow-sm border border-white/30">
              <div className="text-2xl mb-1">{moodEmojis[summaryData.mood]}</div>
              <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-1">Mood</p>
              <p className="text-xs font-semibold text-gray-800 capitalize">{summaryData.mood.replace('-', ' ')}</p>
            </div>

            {/* Emotion Card */}
            <div className="bg-white/70 rounded-xl p-3 text-center shadow-sm border border-white/30">
              <div className="text-2xl mb-1">{emotionEmojis[summaryData.emotion]}</div>
              <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-1">Emotion</p>
              <p className="text-xs font-semibold text-gray-800 capitalize">{summaryData.emotion}</p>
            </div>
          </div>

          {/* Story Content - Mobile optimized */}
          <div className="bg-white/70 rounded-xl p-3 mb-3 shadow-sm border border-white/30">
            <div className="flex items-center space-x-1 mb-2">
              <BookOpen className="w-3 h-3 text-purple-600" />
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Your Story Today</h3>
            </div>
            <p className="text-gray-700 text-xs leading-relaxed">{summaryData.content}</p>
          </div>

          {/* Gratitude and Achievements - Mobile optimized */}
          <div className="grid grid-cols-1 gap-2 mb-4">
            {/* Gratitude */}
            <div className="bg-white/70 rounded-lg p-2 shadow-sm border border-white/30">
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 flex items-center">
                <Heart className="w-3 h-3 mr-1 text-pink-500" />
                Gratitude
              </h4>
              <ul className="space-y-0.5">
                {summaryData.gratitude.map((item, index) => (
                  <li key={index} className="text-xs text-gray-700 flex items-start">
                    <span className="text-pink-400 mr-1 text-xs">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Achievements */}
            <div className="bg-white/70 rounded-lg p-2 shadow-sm border border-white/30">
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 flex items-center">
                <Sparkles className="w-3 h-3 mr-1 text-yellow-500" />
                Achievements
              </h4>
              <ul className="space-y-0.5">
                {summaryData.achievements.map((item, index) => (
                  <li key={index} className="text-xs text-gray-700 flex items-start">
                    <span className="text-yellow-400 mr-1 text-xs">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer - Mobile optimized */}
          <div className="text-center">
            <button
              onClick={onEndConversation}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm shadow-lg transition-all duration-200 transform hover:scale-105 w-full"
            >
              End Conversation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}