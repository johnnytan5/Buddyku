'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Heart, Calendar, MapPin, Users, Tag, Star, Trophy, Sparkles, Plus, Loader2, CheckCircle } from 'lucide-react';

interface EmotionEntry {
  user_id: string;
  date: string;
  mood: "very-sad" | "sad" | "neutral" | "happy" | "very-happy";
  emotion: "belonging" | "calm" | "comfort" | "disappointment" | "gratitude" | "hope" | "joy" | "love" | "sadness" | "strength";
  title?: string;
  content: string;
  description?: string;
  location?: string;
  people?: string[];
  tags?: string[];
  gratitude?: string[];
  achievements?: string[];
  mediaAttachments?: any[];
  isFavorite?: boolean;
}

export default function EmotionPage() {
  const [formData, setFormData] = useState<EmotionEntry>({
    user_id: '',
    date: new Date().toISOString().split('T')[0],
    mood: 'neutral',
    emotion: 'calm',
    content: '',
    title: '',
    description: '',
    location: '',
    people: [],
    tags: [],
    gratitude: [],
    achievements: [],
    mediaAttachments: [],
    isFavorite: false
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGratitude, setCurrentGratitude] = useState('');
  const [currentAchievement, setCurrentAchievement] = useState('');
  const [currentTag, setCurrentTag] = useState('');
  const [currentPerson, setCurrentPerson] = useState('');
  
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({ ...prev, user_id: user.user_id }));
    }
  }, [isAuthenticated, user]);

  const emotionOptions = [
    { emotion: 'joy', emoji: '😄', title: 'Joy', description: 'Pure celebration & happiness', color: 'from-yellow-400 to-orange-400' },
    { emotion: 'love', emoji: '❤️', title: 'Love', description: 'Deep connection & belonging', color: 'from-red-400 to-pink-400' },
    { emotion: 'gratitude', emoji: '🙏', title: 'Gratitude', description: 'Thankfulness & appreciation', color: 'from-green-400 to-emerald-400' },
    { emotion: 'hope', emoji: '🌟', title: 'Hope', description: 'Optimism & dreams', color: 'from-blue-400 to-cyan-400' },
    { emotion: 'calm', emoji: '🧘', title: 'Calm', description: 'Peace & tranquility', color: 'from-indigo-400 to-blue-400' },
    { emotion: 'comfort', emoji: '☁️', title: 'Comfort', description: 'Warmth & security', color: 'from-purple-400 to-violet-400' },
    { emotion: 'strength', emoji: '💪', title: 'Strength', description: 'Resilience & courage', color: 'from-orange-400 to-red-400' },
    { emotion: 'belonging', emoji: '👥', title: 'Belonging', description: 'Acceptance & community', color: 'from-pink-400 to-rose-400' },
    { emotion: 'sadness', emoji: '😢', title: 'Sadness', description: 'Gentle sadness that needs care', color: 'from-gray-400 to-slate-400' },
    { emotion: 'disappointment', emoji: '😞', title: 'Disappointment', description: 'Learning from setbacks', color: 'from-red-500 to-pink-500' }
  ];

  const moodOptions = [
    { mood: 'very-sad', emoji: '😢', label: 'Very Sad', color: 'bg-red-100 border-red-300' },
    { mood: 'sad', emoji: '😕', label: 'Sad', color: 'bg-orange-100 border-orange-300' },
    { mood: 'neutral', emoji: '😐', label: 'Neutral', color: 'bg-gray-100 border-gray-300' },
    { mood: 'happy', emoji: '😊', label: 'Happy', color: 'bg-green-100 border-green-300' },
    { mood: 'very-happy', emoji: '😄', label: 'Very Happy', color: 'bg-blue-100 border-blue-300' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.content.trim()) {
      setError('Please write about your day');
      return;
    }

    // Debug: Check if user is authenticated and has user_id
    console.log('Form submission debug:');
    console.log('  isAuthenticated:', isAuthenticated);
    console.log('  user:', user);
    console.log('  formData.user_id:', formData.user_id);
    console.log('  formData:', formData);

    if (!isAuthenticated || !user || !formData.user_id) {
      setError('Please log in to save your emotion entry');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Sending request to /api/emotions with data:', formData);
      
      const response = await fetch('/api/emotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Failed to save emotion entry');
      }

      const result = await response.json();
      console.log('Success response:', result);
      setSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          user_id: user?.user_id || '',
          date: new Date().toISOString().split('T')[0],
          mood: 'neutral',
          emotion: 'calm',
          content: '',
          title: '',
          description: '',
          location: '',
          people: [],
          tags: [],
          gratitude: [],
          achievements: [],
          mediaAttachments: [],
          isFavorite: false
        });
        setSuccess(false);
        setError(null); // Clear any previous errors
      }, 2000);
      
    } catch (err) {
      console.error('Error saving emotion entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const addGratitude = () => {
    if (currentGratitude.trim()) {
      setFormData(prev => ({
        ...prev,
        gratitude: [...(prev.gratitude || []), currentGratitude.trim()]
      }));
      setCurrentGratitude('');
    }
  };

  const addAchievement = () => {
    if (currentAchievement.trim()) {
      setFormData(prev => ({
        ...prev,
        achievements: [...(prev.achievements || []), currentAchievement.trim()]
      }));
      setCurrentAchievement('');
    }
  };

  const addTag = () => {
    if (currentTag.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const addPerson = () => {
    if (currentPerson.trim()) {
      setFormData(prev => ({
        ...prev,
        people: [...(prev.people || []), currentPerson.trim()]
      }));
      setCurrentPerson('');
    }
  };

  const removeItem = (type: 'gratitude' | 'achievements' | 'tags' | 'people', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type]?.filter((_, i) => i !== index) || []
    }));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 w-full flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please log in to add emotion entries</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 w-full">
      {/* Header */}
      <div className="flex justify-between items-center p-4 pt-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Emotion</h1>
          <p className="text-sm text-gray-600">Capture your feelings today</p>
        </div>
        <button 
          onClick={() => router.push('/memory')}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          View Memories
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mx-4 mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
          <span className="text-green-800">Emotion entry saved successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <Heart className="w-5 h-5 text-red-600 mr-3" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Form */}
      <div className="p-4 pb-20">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Mood Selection */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">How are you feeling?</h3>
            <div className="grid grid-cols-5 gap-2">
              {moodOptions.map((option) => (
                <button
                  key={option.mood}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, mood: option.mood as typeof prev.mood }))}
                  aria-pressed={formData.mood === option.mood}
                  aria-label={`Select ${option.label} mood`}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.mood === option.mood
                      ? `${option.color} scale-105`
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.emoji}</div>
                  <div className="text-xs font-medium text-gray-600">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Emotion Selection */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Which emotion jar?</h3>
            <div className="grid grid-cols-2 gap-3">
              {emotionOptions.map((option) => (
                <button
                  key={option.emotion}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, emotion: option.emotion as typeof prev.emotion }))}
                  aria-pressed={formData.emotion === option.emotion}
                  aria-label={`Select ${option.title} emotion jar`}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    formData.emotion === option.emotion
                      ? 'border-purple-500 bg-purple-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${option.color} flex items-center justify-center`}>
                      <span className="text-white text-lg">{option.emoji}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{option.title}</div>
                      <div className="text-xs text-gray-600">{option.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (optional)
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Give your entry a title..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How was your day? *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Tell me about your day, what happened, how you felt..."
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              required
            />
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional thoughts (optional)
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Any additional thoughts or feelings..."
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Gratitude */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-green-600" />
              What are you grateful for?
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={currentGratitude}
                onChange={(e) => setCurrentGratitude(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addGratitude()}
                placeholder="Something you're grateful for..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addGratitude}
                className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.gratitude?.map((item, index) => (
                <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
                  💚 {item}
                  <button
                    type="button"
                    onClick={() => removeItem('gratitude', index)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
              What did you accomplish?
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={currentAchievement}
                onChange={(e) => setCurrentAchievement(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAchievement()}
                placeholder="Something you achieved today..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addAchievement}
                className="px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.achievements?.map((item, index) => (
                <span key={index} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm flex items-center">
                  🎉 {item}
                  <button
                    type="button"
                    onClick={() => removeItem('achievements', index)}
                    className="ml-2 text-yellow-600 hover:text-yellow-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Tag className="w-5 h-5 mr-2 text-blue-600" />
              Tags
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add a tag..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag, index) => (
                <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeItem('tags', index)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Location (optional)
            </label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Where were you?"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* People */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-600" />
              Who were you with?
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={currentPerson}
                onChange={(e) => setCurrentPerson(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPerson()}
                placeholder="Add a person..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addPerson}
                className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.people?.map((person, index) => (
                <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center">
                  👤 {person}
                  <button
                    type="button"
                    onClick={() => removeItem('people', index)}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Favorite */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isFavorite}
                onChange={(e) => setFormData(prev => ({ ...prev, isFavorite: e.target.checked }))}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <Star className="w-4 h-4 ml-2 text-yellow-500" />
              <span className="ml-2 text-sm font-medium text-gray-700">Mark as favorite</span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <button
              type="submit"
              disabled={loading || !formData.content.trim()}
              aria-label={loading ? "Saving emotion entry..." : "Save emotion entry"}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Heart className="w-5 h-5 mr-2" />
                  Save Emotion Entry
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
