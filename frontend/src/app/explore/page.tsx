'use client';

import { useState, useEffect } from 'react';
import { Heart, Sparkles, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { 
  JournalEntry, 
  MemoryJarItem, 
  journalEntriesData, 
  distributeMemoriesToJars,
  getAllJournalEntries
} from '@/lib/memoryData';

interface EmotionJarConfig {
  emotion: 'joy' | 'hope' | 'love' | 'calm' | 'strength' | 'comfort' | 'gratitude' | 'belonging' | 'sad' | 'disappointed';
  name: string;
  emoji: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    glass: string;
    bubbles: string[];
  };
  description: string;
}

// Emotion jar configurations
const EMOTION_JARS: EmotionJarConfig[] = [
  {
    emotion: 'joy',
    name: 'Joy Jar',
    emoji: '🥳',
    colors: {
      primary: '#FFD700',
      secondary: '#FFA500', 
      accent: '#FF6B6B',
      glass: 'linear-gradient(145deg, rgba(255,215,0,0.3), rgba(255,165,0,0.2))',
      bubbles: ['#FFD700', '#FFA500', '#FF69B4', '#FF6347', '#FFB347']
    },
    description: 'Moments of pure celebration and happiness'
  },
  {
    emotion: 'hope',
    name: 'Hope Jar',
    emoji: '🌱',
    colors: {
      primary: '#32CD32',
      secondary: '#98FB98',
      accent: '#90EE90',
      glass: 'linear-gradient(145deg, rgba(50,205,50,0.3), rgba(152,251,152,0.2))',
      bubbles: ['#32CD32', '#98FB98', '#90EE90', '#00FF7F', '#7CFC00']
    },
    description: 'Dreams, aspirations and positive futures'
  },
  {
    emotion: 'love',
    name: 'Love Jar',
    emoji: '❤️',
    colors: {
      primary: '#FF69B4',
      secondary: '#FFB6C1',
      accent: '#FFC0CB',
      glass: 'linear-gradient(145deg, rgba(255,105,180,0.3), rgba(255,182,193,0.2))',
      bubbles: ['#FF69B4', '#FFB6C1', '#FFC0CB', '#FF1493', '#DC143C']
    },
    description: 'Love, connection and heartfelt moments'
  },
  {
    emotion: 'calm',
    name: 'Calm Jar',
    emoji: '🌊',
    colors: {
      primary: '#4682B4',
      secondary: '#87CEEB',
      accent: '#B0E0E6',
      glass: 'linear-gradient(145deg, rgba(70,130,180,0.3), rgba(135,206,235,0.2))',
      bubbles: ['#4682B4', '#87CEEB', '#B0E0E6', '#ADD8E6', '#E0F6FF']
    },
    description: 'Peaceful and serene moments'
  },
  {
    emotion: 'strength',
    name: 'Strength Jar',
    emoji: '💪',
    colors: {
      primary: '#8B4513',
      secondary: '#D2691E',
      accent: '#F4A460',
      glass: 'linear-gradient(145deg, rgba(139,69,19,0.3), rgba(210,105,30,0.2))',
      bubbles: ['#8B4513', '#D2691E', '#F4A460', '#CD853F', '#DEB887']
    },
    description: 'Moments of courage and resilience'
  },
  {
    emotion: 'comfort',
    name: 'Comfort Jar',
    emoji: '☁️',
    colors: {
      primary: '#D2B48C',
      secondary: '#F5DEB3',
      accent: '#FFEBCD',
      glass: 'linear-gradient(145deg, rgba(210,180,140,0.3), rgba(245,222,179,0.2))',
      bubbles: ['#D2B48C', '#F5DEB3', '#FFEBCD', '#FAEBD7', '#F5F5DC']
    },
    description: 'Cozy and nurturing experiences'
  },
  {
    emotion: 'gratitude',
    name: 'Gratitude Jar',
    emoji: '🙏',
    colors: {
      primary: '#DAA520',
      secondary: '#FFD700',
      accent: '#F0E68C',
      glass: 'linear-gradient(145deg, rgba(218,165,32,0.3), rgba(255,215,0,0.2))',
      bubbles: ['#DAA520', '#FFD700', '#F0E68C', '#FFFF66', '#FFFACD']
    },
    description: 'Thankfulness and appreciation'
  },
  {
    emotion: 'belonging',
    name: 'Belonging Jar',
    emoji: '🏡',
    colors: {
      primary: '#8FBC8F',
      secondary: '#98FB98',
      accent: '#90EE90',
      glass: 'linear-gradient(145deg, rgba(143,188,143,0.3), rgba(152,251,152,0.2))',
      bubbles: ['#8FBC8F', '#98FB98', '#90EE90', '#20B2AA', '#7FFFD4']
    },
    description: 'Connection and feeling at home'
  },
  {
    emotion: 'sad',
    name: 'Sadness Jar',
    emoji: '😢',
    colors: {
      primary: '#4169E1',
      secondary: '#6495ED',
      accent: '#B0C4DE',
      glass: 'linear-gradient(145deg, rgba(65,105,225,0.3), rgba(100,149,237,0.2))',
      bubbles: ['#4169E1', '#6495ED', '#B0C4DE', '#778899', '#C0C0C0']
    },
    description: 'Moments of sadness and reflection'
  },
  {
    emotion: 'disappointed',
    name: 'Disappointment Jar',
    emoji: '😞',
    colors: {
      primary: '#696969',
      secondary: '#A9A9A9',
      accent: '#D3D3D3',
      glass: 'linear-gradient(145deg, rgba(105,105,105,0.3), rgba(169,169,169,0.2))',
      bubbles: ['#696969', '#A9A9A9', '#D3D3D3', '#DCDCDC', '#F5F5F5']
    },
    description: 'Learning from unmet expectations'
  }
];

// Component: Individual Emotion Jar
const EmotionJar = ({ 
  config, 
  memoryCount, 
  onClick 
}: { 
  config: EmotionJarConfig; 
  memoryCount: number;
  onClick: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Generate bubble positions for visual effect
  const bubbles = Array.from({ length: Math.min(memoryCount, 15) }, (_, i) => ({
    id: i,
    color: config.colors.bubbles[i % config.colors.bubbles.length],
    size: Math.random() * 20 + 10,
    x: Math.random() * 60 + 20,
    y: Math.random() * 50 + 30,
    delay: Math.random() * 2
  }));

  return (
    <div 
      className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: `linear-gradient(135deg, ${config.colors.primary}10, ${config.colors.secondary}10)`
      }}
    >
      {/* Jar Container */}
      <div className="relative h-48 mx-auto" style={{ width: '120px' }}>
        {/* Jar Body */}
        <div 
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 rounded-b-3xl border-4 border-gray-300"
          style={{
            width: '100px',
            height: '140px',
            background: config.colors.glass,
            borderColor: config.colors.primary + '40'
          }}
        >
          {/* Memory Bubbles */}
          {bubbles.map((bubble) => (
            <div
              key={bubble.id}
              className={`absolute rounded-full opacity-70 ${isHovered ? 'animate-bounce' : ''}`}
              style={{
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
                backgroundColor: bubble.color,
                left: `${bubble.x}%`,
                top: `${bubble.y}%`,
                animationDelay: `${bubble.delay}s`,
                transition: 'all 0.3s ease'
              }}
            />
          ))}
          
          {/* Fill Level Indicator */}
          <div 
            className="absolute bottom-0 left-0 right-0 rounded-b-3xl opacity-20"
            style={{
              height: `${Math.min((memoryCount / 50) * 100, 100)}%`,
              background: `linear-gradient(to top, ${config.colors.primary}, ${config.colors.secondary})`
            }}
          />
        </div>
        
        {/* Jar Lid */}
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 rounded-t-lg border-4"
          style={{
            width: '110px',
            height: '20px',
            backgroundColor: config.colors.accent,
            borderColor: config.colors.primary + '60'
          }}
        />
        
        {/* Jar Rim */}
        <div 
          className="absolute top-4 left-1/2 transform -translate-x-1/2 rounded-t-2xl border-4"
          style={{
            width: '100px',
            height: '15px',
            backgroundColor: 'transparent',
            borderColor: config.colors.primary + '40',
            borderBottomColor: 'transparent'
          }}
        />
      </div>
      
      {/* Jar Info */}
      <div className="text-center mt-4">
        <div className="text-3xl mb-2">{config.emoji}</div>
        <h3 className="font-bold text-lg text-gray-800">{config.name}</h3>
        <p className="text-sm text-gray-600 mb-2">{config.description}</p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Heart size={14} />
          <span>{memoryCount} memories</span>
        </div>
      </div>
      
      {/* Hover Effect */}
      {isHovered && (
        <div className="absolute top-2 right-2">
          <ChevronRight size={20} className="text-gray-400" />
        </div>
      )}
    </div>
  );
};

// Component: Memory Carousel
const MemoryCarousel = ({ 
  memories, 
  jarConfig 
}: { 
  memories: MemoryJarItem[];
  jarConfig: EmotionJarConfig;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance carousel
  useEffect(() => {
    if (!isPlaying || isPaused || memories.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % memories.length);
    }, 4000); // 4 seconds per slide

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, memories.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + memories.length) % memories.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % memories.length);
  };

  const currentMemory = memories[currentIndex];

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div 
        className="bg-white rounded-2xl shadow-lg overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{
          background: `linear-gradient(135deg, ${jarConfig.colors.primary}08, ${jarConfig.colors.secondary}08)`
        }}
      >
        {/* Carousel Header */}
        <div 
          className="px-6 py-4 relative overflow-hidden"
          style={{
            background: `linear-gradient(90deg, ${jarConfig.colors.primary}15, ${jarConfig.colors.secondary}15)`
          }}
        >
          {/* Floating sparkles animation */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute text-xs opacity-30 animate-pulse"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${20 + (i % 3) * 20}%`,
                  animationDelay: `${i * 0.5}s`,
                  color: jarConfig.colors.primary
                }}
              >
                ✨
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{jarConfig.emoji}</div>
              <div>
                <h3 className="font-bold text-gray-800">Memory {currentIndex + 1} of {memories.length}</h3>
                <p className="text-xs text-gray-500">Auto-playing every 4 seconds</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                style={{ color: jarConfig.colors.primary }}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
            </div>
          </div>
        </div>

        {/* Memory Content with smooth transition */}
        <div className="relative h-80 overflow-hidden">
          <div 
            className="flex transition-transform duration-700 ease-out h-full"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`
            }}
          >
            {memories.map((memory, index) => (
              <div key={memory.id} className="w-full flex-shrink-0 p-6 flex flex-col justify-center">
                {/* Memory Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border-l-4"
                  style={{ borderLeftColor: jarConfig.colors.primary }}
                >
                  {/* Memory Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full animate-pulse"
                        style={{ backgroundColor: jarConfig.colors.primary }}
                      />
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {memory.type}
                      </span>
                      {memory.isFavorite && (
                        <div className="animate-bounce">
                          <Heart size={12} className="text-red-500" fill="currentColor" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                      {new Date(memory.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>

                  {/* Memory Content */}
                  <div className="mb-4">
                    <p className="text-gray-800 leading-relaxed text-lg font-medium">{memory.content}</p>
                  </div>

                  {/* Media Preview */}
                  {memory.mediaUrl && (
                    <div className="mb-4">
                      <div 
                        className="rounded-lg p-3 flex items-center gap-3 border"
                        style={{ 
                          backgroundColor: `${jarConfig.colors.primary}10`,
                          borderColor: `${jarConfig.colors.primary}30`
                        }}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                          style={{ backgroundColor: jarConfig.colors.primary }}
                        >
                          📸
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">Media attachment</p>
                          <p className="text-xs text-gray-500">Tap to view</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Memory Footer */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      📅 {new Date(memory.date).toLocaleDateString('en-US', { 
                        weekday: 'long'
                      })}
                    </span>
                    <button 
                      className="font-medium hover:underline transition-all"
                      style={{ color: jarConfig.colors.primary }}
                      onClick={() => {
                        console.log(`View full entry for ${memory.date}`);
                      }}
                    >
                      View full entry →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Dots */}
        <div className="px-6 py-4 flex items-center justify-center gap-2">
          {memories.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'w-6 shadow-lg' 
                  : 'hover:scale-125 opacity-50 hover:opacity-75'
              }`}
              style={{
                backgroundColor: index === currentIndex 
                  ? jarConfig.colors.primary 
                  : jarConfig.colors.secondary
              }}
            />
          ))}
        </div>

        {/* Manual Navigation */}
        {memories.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white transition-all"
              style={{ color: jarConfig.colors.primary }}
            >
              ←
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white transition-all"
              style={{ color: jarConfig.colors.primary }}
            >
              →
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Component: Random Memory Popup
const RandomMemoryPopup = ({ 
  memory, 
  jarConfig, 
  isOpen, 
  onClose 
}: { 
  memory: MemoryJarItem | null;
  jarConfig: EmotionJarConfig | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !memory || !jarConfig) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popup Content */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-300"
        style={{
          background: `linear-gradient(135deg, ${jarConfig.colors.primary}08, ${jarConfig.colors.secondary}08)`
        }}
      >
        {/* Popup Header */}
        <div 
          className="relative p-6 text-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${jarConfig.colors.primary}20, ${jarConfig.colors.secondary}15)`
          }}
        >
          {/* Floating decorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute text-lg opacity-20 animate-pulse"
                style={{
                  left: `${10 + i * 12}%`,
                  top: `${15 + (i % 4) * 20}%`,
                  animationDelay: `${i * 0.3}s`,
                  color: jarConfig.colors.primary
                }}
              >
                {i % 2 === 0 ? '✨' : '💫'}
              </div>
            ))}
          </div>

          <div className="relative z-10">
            <div className="text-5xl mb-3 animate-bounce">{jarConfig.emoji}</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Random Memory</h2>
            <p className="text-sm text-gray-600">From your {jarConfig.name}</p>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Memory Content */}
        <div className="p-6">
          <div 
            className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border-l-4 mb-4"
            style={{ borderLeftColor: jarConfig.colors.primary }}
          >
            {/* Memory Type Badge */}
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: jarConfig.colors.primary }}
              />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {memory.type}
              </span>
              {memory.isFavorite && (
                <div className="animate-bounce">
                  <Heart size={12} className="text-red-500" fill="currentColor" />
                </div>
              )}
              <div className="ml-auto">
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                  {new Date(memory.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Memory Text */}
            <div className="mb-4">
              <p className="text-gray-800 leading-relaxed text-lg font-medium">
                {memory.content}
              </p>
            </div>

            {/* Media Preview */}
            {memory.mediaUrl && (
              <div className="mb-4">
                <div 
                  className="rounded-lg p-3 flex items-center gap-3 border"
                  style={{ 
                    backgroundColor: `${jarConfig.colors.primary}10`,
                    borderColor: `${jarConfig.colors.primary}30`
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: jarConfig.colors.primary }}
                  >
                    📸
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Media attachment</p>
                    <p className="text-xs text-gray-500">Tap to view</p>
                  </div>
                </div>
              </div>
            )}

            {/* Memory Metadata */}
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <span>📅</span>
              <span>
                {new Date(memory.date).toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button 
              className="w-full py-3 rounded-lg font-medium text-white transition-all shadow-sm hover:shadow-md"
              style={{
                background: `linear-gradient(to right, ${jarConfig.colors.primary}, ${jarConfig.colors.secondary})`
              }}
              onClick={() => {
                console.log(`View full entry for ${memory.date}`);
                // TODO: Navigate to full journal entry
              }}
            >
              📖 View Full Entry
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                className="py-2 px-4 rounded-lg font-medium text-white transition-all"
                style={{ backgroundColor: jarConfig.colors.primary }}
                onClick={() => {
                  // TODO: Add to favorites
                  console.log('Add to favorites');
                }}
              >
                ⭐ Favorite
              </button>
              <button 
                className="py-2 px-4 rounded-lg font-medium text-white transition-all"
                style={{ backgroundColor: jarConfig.colors.secondary }}
                onClick={() => {
                  // TODO: Share memory
                  console.log('Share memory');
                }}
              >
                📤 Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component: Memory Statistics
const MemoryStats = ({ emotionJars }: { emotionJars: Record<string, MemoryJarItem[]> }) => {
  const totalMemories = Object.values(emotionJars).flat().length;
  const favoriteMemories = Object.values(emotionJars).flat().filter(m => m.isFavorite).length;
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
      <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center">
        <TrendingUp className="mr-2 text-blue-500" size={20} />
        Your Memory Collection
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalMemories}</div>
          <div className="text-sm text-gray-600">Total Memories</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-500">{favoriteMemories}</div>
          <div className="text-sm text-gray-600">Favorites</div>
        </div>
      </div>
    </div>
  );
};

// Main Explore Page Component
export default function ExplorePage() {
  const [selectedJar, setSelectedJar] = useState<EmotionJarConfig | null>(null);
  const [emotionJars, setEmotionJars] = useState<Record<string, MemoryJarItem[]>>({});
  const [randomMemoryPopup, setRandomMemoryPopup] = useState<{
    isOpen: boolean;
    memory: MemoryJarItem | null;
    jarConfig: EmotionJarConfig | null;
  }>({
    isOpen: false,
    memory: null,
    jarConfig: null
  });

  
  useEffect(() => {
    // Transform journal entries to emotion-categorized memories
    const distributedMemories = distributeMemoriesToJars(getAllJournalEntries());
    setEmotionJars(distributedMemories);
    
    // Listen for data changes
    const handleDataChange = () => {
      const updatedMemories = distributeMemoriesToJars(getAllJournalEntries());
      setEmotionJars(updatedMemories);
    };
    
    window.addEventListener('journalDataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('journalDataChanged', handleDataChange);
    };
  }, []);

  const handleJarClick = (config: EmotionJarConfig) => {
    setSelectedJar(config);
    // Debug: Log the jar data
    console.log(`Opening ${config.name} with ${emotionJars[config.emotion]?.length || 0} memories`);
    console.log('Jar memories:', emotionJars[config.emotion]);
    console.log('All emotion jars:', emotionJars);
  };

  const getRandomMemory = () => {
    // Get all memories from all jars
    const allMemories: MemoryJarItem[] = [];
    Object.values(emotionJars).forEach(jarMemories => {
      allMemories.push(...jarMemories);
    });

    if (allMemories.length === 0) return;

    // Pick random memory
    const randomMemory = allMemories[Math.floor(Math.random() * allMemories.length)];
    
    // Find the jar config for this memory's emotion
    const jarConfig = EMOTION_JARS.find(jar => jar.emotion === randomMemory.emotion);
    
    if (jarConfig) {
      setRandomMemoryPopup({
        isOpen: true,
        memory: randomMemory,
        jarConfig: jarConfig
      });
    }
  };

  const closeRandomMemoryPopup = () => {
    setRandomMemoryPopup({
      isOpen: false,
      memory: null,
      jarConfig: null
    });
  };

  const getRandomMemoryFromJar = (jarConfig: EmotionJarConfig, memories: MemoryJarItem[]) => {
    if (memories.length === 0) return;

    // Pick random memory from this specific jar
    const randomMemory = memories[Math.floor(Math.random() * memories.length)];
    
    setRandomMemoryPopup({
      isOpen: true,
      memory: randomMemory,
      jarConfig: jarConfig
    });
  };

  if (selectedJar) {
    // Individual jar view with actual memories
    const jarMemories = emotionJars[selectedJar.emotion] || [];
    
    // Debug logging
    console.log('Selected jar:', selectedJar.name);
    console.log('Jar emotion:', selectedJar.emotion);
    console.log('Jar memories count:', jarMemories.length);
    console.log('Jar memories:', jarMemories);
    
    // Temporary test data to verify the view works
    const testMemories: MemoryJarItem[] = [
      {
        id: 'test-1',
        type: 'journal' as const,
        content: 'This is a test memory to verify the jar view is working correctly.',
        emotion: selectedJar.emotion,
        date: '2024-09-20',
        isFavorite: false,
        sourceEntryId: 'test-entry'
      }
    ];
    
    // Use test memories if no real memories found
    const displayMemories = jarMemories.length > 0 ? jarMemories : testMemories;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button 
              onClick={() => setSelectedJar(null)}
              className="mb-4 text-blue-600 flex items-center hover:text-blue-800 transition-colors"
            >
              ← Back to all jars
            </button>
            
            {/* Jar Header */}
            <div 
              className="bg-white rounded-2xl p-6 shadow-lg mb-6"
              style={{
                background: `linear-gradient(135deg, ${selectedJar.colors.primary}15, ${selectedJar.colors.secondary}15)`
              }}
            >
              <div className="text-center">
                <div className="text-6xl mb-3">{selectedJar.emoji}</div>
                <h1 className="text-2xl font-bold text-gray-800">{selectedJar.name}</h1>
                <p className="text-gray-600 mb-3">{selectedJar.description}</p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Heart size={14} />
                  <span>{displayMemories.length} memories</span>
                </div>
              </div>
            </div>
          </div>

          {/* Memory Carousel */}
          {displayMemories.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="text-4xl mb-4">{selectedJar.emoji}</div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No memories yet</h3>
              <p className="text-gray-500 mb-4">
                Start adding memories with this emotion to fill your {selectedJar.name.toLowerCase()}!
              </p>
              <button 
                onClick={() => setSelectedJar(null)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Go back and create memories
              </button>
            </div>
          ) : (
            <MemoryCarousel 
              memories={displayMemories} 
              jarConfig={selectedJar}
            />
          )}

          {/* Jar Actions */}
          {displayMemories.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-lg mt-6">
              <h3 className="font-bold text-lg text-gray-800 mb-4">Jar Actions</h3>
              <div className="space-y-3">
                <button 
                  className="w-full text-white py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-xl active:scale-95 active:shadow-lg group relative overflow-hidden"
                  style={{
                    background: `linear-gradient(to right, ${selectedJar.colors.primary}, ${selectedJar.colors.secondary})`,
                    boxShadow: `0 4px 15px ${selectedJar.colors.primary}20`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 8px 25px ${selectedJar.colors.primary}40`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = `0 4px 15px ${selectedJar.colors.primary}20`;
                  }}
                  onClick={() => {
                    getRandomMemoryFromJar(selectedJar, displayMemories);
                  }}
                >
                  {/* Animated background overlay */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-lg"
                    style={{
                      background: `linear-gradient(45deg, ${selectedJar.colors.accent}, ${selectedJar.colors.primary})`
                    }}
                  ></div>
                  
                  {/* Floating emotion-specific decorations */}
                  <div className="absolute inset-0 overflow-hidden rounded-lg">
                    <div className="absolute top-2 left-4 opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-all duration-500">
                      {selectedJar.emoji}
                    </div>
                    <div className="absolute top-3 right-4 text-xs opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-all duration-700 delay-150">✨</div>
                    <div className="absolute bottom-2 right-6 text-xs opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-600 delay-300">💫</div>
                  </div>
                  
                  {/* Button content */}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <span className="group-hover:animate-spin transition-transform duration-500">🎲</span>
                    <span className="group-hover:tracking-wide transition-all duration-300">
                      Random {selectedJar.name} Memory
                    </span>
                  </span>
                </button>
                <button className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95 group relative overflow-hidden">
                  {/* Background animation */}
                  <div className="absolute inset-0 bg-gray-200 opacity-0 group-hover:opacity-50 transition-opacity duration-300 rounded-lg"></div>
                  
                  {/* Floating decorations */}
                  <div className="absolute inset-0 overflow-hidden rounded-lg">
                    <div className="absolute top-2 right-4 text-xs opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-all duration-500 delay-100">📤</div>
                    <div className="absolute bottom-2 left-4 text-xs opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-all duration-600 delay-200">�</div>
                  </div>
                  
                  {/* Button content */}
                  <span className="relative z-10 group-hover:tracking-wide transition-all duration-300">
                    �📤 Share {selectedJar.name}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Random Memory Popup - Individual Jar View */}
        <RandomMemoryPopup
          memory={randomMemoryPopup.memory}
          jarConfig={randomMemoryPopup.jarConfig}
          isOpen={randomMemoryPopup.isOpen}
          onClose={closeRandomMemoryPopup}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center">
            <Sparkles className="mr-2 text-yellow-500" size={28} />
            Emotion Jars
          </h1>
          <p className="text-gray-600">Your memories, organized by emotions</p>
        </div>

        {/* Memory Statistics */}
        <MemoryStats emotionJars={emotionJars} />

        {/* Emotion Jars Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {EMOTION_JARS.map((config) => (
            <EmotionJar
              key={config.emotion}
              config={config}
              memoryCount={emotionJars[config.emotion]?.length || 0}
              onClick={() => handleJarClick(config)}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center">
            <Clock className="mr-2 text-purple-500" size={20} />
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button 
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-300/50 hover:from-purple-600 hover:to-blue-600 active:scale-95 active:shadow-lg group relative overflow-hidden"
              onClick={getRandomMemory}
            >
              {/* Background animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-lg"></div>
              
              {/* Sparkle effects */}
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="absolute top-2 left-4 text-xs opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-500">✨</div>
                <div className="absolute top-3 right-6 text-xs opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-all duration-700 delay-200">⭐</div>
                <div className="absolute bottom-3 left-8 text-xs opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-all duration-600 delay-100">💫</div>
              </div>
              
              {/* Button content */}
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span className="group-hover:animate-spin transition-transform duration-500">🎲</span>
                <span className="group-hover:tracking-wide transition-all duration-300">Random Memory</span>
              </span>
            </button>
            <button className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-pink-300/50 hover:from-pink-600 hover:to-red-600 active:scale-95 active:shadow-lg group relative overflow-hidden">
              {/* Background animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-red-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-lg"></div>
              
              {/* Sparkle effects */}
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="absolute top-2 right-4 text-xs opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-all duration-500">💖</div>
                <div className="absolute bottom-2 left-4 text-xs opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-all duration-700 delay-200">🌟</div>
                <div className="absolute top-3 left-6 text-xs opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-600 delay-100">✨</div>
              </div>
              
              {/* Button content */}
              <span className="relative z-10 group-hover:tracking-wide transition-all duration-300">
                Today's Highlights
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Random Memory Popup */}
      <RandomMemoryPopup
        memory={randomMemoryPopup.memory}
        jarConfig={randomMemoryPopup.jarConfig}
        isOpen={randomMemoryPopup.isOpen}
        onClose={closeRandomMemoryPopup}
      />
    </div>
  );
}