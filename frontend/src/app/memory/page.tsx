'use client';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, BookOpen, Heart, Image, Video, Mic, X, Play, Loader2 } from 'lucide-react';
import { 
  MediaAttachment, 
  JournalEntry, 
  journalEntriesData,
  moodToEmotionMap,
  emotionDescriptions,
  addJournalEntry,
  getAllJournalEntries
} from '@/lib/memoryData';

export default function MemoryPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEmergencyKit, setShowEmergencyKit] = useState(false);
  const [journalEntries, setJournalEntries] = useState<Record<string, JournalEntry>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Fetch journal entries from API
  const fetchJournalEntries = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      
      const response = await fetch('/api/fetch-all-emotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'test_user_123'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch journal entries');
      }

      const data = await response.json();
      
      // Transform the API response to the format expected by the UI
      const journalEntries: Record<string, JournalEntry> = {};
      
      Object.entries(data.journal_entries).forEach(([key, entry]: [string, any]) => {
        journalEntries[key] = entry as JournalEntry;
      });
      
      setJournalEntries(journalEntries);
      
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      setHasError(true);
      setJournalEntries({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJournalEntries();
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getMoodColor = (mood: JournalEntry['mood']) => {
    const colors: Record<JournalEntry['mood'], string> = {
      'very-sad': 'bg-red-200 border-red-300',
      'sad': 'bg-orange-200 border-orange-300',
      'neutral': 'bg-gray-200 border-gray-300',
      'happy': 'bg-green-200 border-green-300',
      'very-happy': 'bg-blue-200 border-blue-300'
    };
    return colors[mood] || 'bg-white border-gray-200';
  };

  const getMoodEmoji = (mood: JournalEntry['mood']) => {
    const emojis: Record<JournalEntry['mood'], string> = {
      'very-sad': '😢',
      'sad': '😕',
      'neutral': '😐',
      'happy': '😊',
      'very-happy': '😄'
    };
    return emojis[mood] || '😐';
  };

  const handleDateClick = (day: number) => {
    const dateKey = formatDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(dateKey);
  };

  const days = getDaysInMonth(currentMonth);
  const currentEntry = selectedDate ? journalEntries[selectedDate] : null;

  // Get all visual media (images and videos) from all journal entries
  const getAllVisualMedia = () => {
    const allMedia: (MediaAttachment & { entryDate: string })[] = [];
    Object.entries(journalEntries).forEach(([date, entry]) => {
      entry.mediaAttachments
        .filter(media => media.type === 'image' || media.type === 'video')
        .forEach(media => {
          allMedia.push({ ...media, entryDate: date });
        });
    });
    // Sort by upload date, most recent first
    return allMedia.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  };

  const visualMedia = getAllVisualMedia();

  // Get favorite memories for emergency kit
  const getFavoriteMemories = () => {
    const favoriteEntries: (JournalEntry & { entryDate: string })[] = [];
    const favoriteMedia: (MediaAttachment & { entryDate: string })[] = [];
    
    Object.entries(journalEntries).forEach(([date, entry]) => {
      if (entry.isFavorite) {
        favoriteEntries.push({ ...entry, entryDate: date });
      }
      entry.mediaAttachments.forEach(media => {
        if (media.isFavorite) {
          favoriteMedia.push({ ...media, entryDate: date });
        }
      });
    });

    return {
      entries: favoriteEntries.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()),
      media: favoriteMedia.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    };
  };

  const toggleEntryFavorite = (date: string) => {
    setJournalEntries(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        isFavorite: !prev[date]?.isFavorite
      }
    }));
  };

  const toggleMediaFavorite = (entryDate: string, mediaId: string) => {
    setJournalEntries(prev => ({
      ...prev,
      [entryDate]: {
        ...prev[entryDate],
        mediaAttachments: prev[entryDate].mediaAttachments.map(media =>
          media.id === mediaId ? { ...media, isFavorite: !media.isFavorite } : media
        )
      }
    }));
  };

  const favoriteMemories = getFavoriteMemories();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white shadow-sm p-2 sm:p-4">
          <div className="flex justify-between items-center max-w-sm mx-auto sm:max-w-none">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800">Memory & Journal</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            {/* Elegant memory loading animation */}
            <div className="relative mb-8">
              <div className="w-20 h-20 mx-auto relative">
                {/* Main memory orb */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full animate-pulse shadow-xl"></div>
                
                {/* Floating memory fragments */}
                <div className="absolute -top-3 -right-3 w-5 h-5 bg-blue-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.1s' }}>
                  <div className="w-full h-full bg-white/30 rounded-full animate-ping"></div>
                </div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-green-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.3s' }}>
                  <div className="w-full h-full bg-white/30 rounded-full animate-ping"></div>
                </div>
                <div className="absolute top-2 -left-4 w-3 h-3 bg-purple-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.5s' }}>
                  <div className="w-full h-full bg-white/30 rounded-full animate-ping"></div>
                </div>
                <div className="absolute -top-1 -right-6 w-2 h-2 bg-pink-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.7s' }}>
                  <div className="w-full h-full bg-white/30 rounded-full animate-ping"></div>
                </div>
              </div>
              
              {/* Concentric ripple waves */}
              <div className="absolute inset-0 w-20 h-20 mx-auto border-2 border-amber-300 rounded-full animate-ping opacity-30"></div>
              <div className="absolute inset-0 w-20 h-20 mx-auto border border-orange-300 rounded-full animate-ping opacity-20" style={{ animationDelay: '0.3s' }}></div>
              <div className="absolute inset-0 w-20 h-20 mx-auto border border-red-300 rounded-full animate-ping opacity-10" style={{ animationDelay: '0.6s' }}></div>
            </div>
            
            {/* Elegant text with warm gradient */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                Preserving Your Memories
              </h3>
              
              {/* Elegant progress indicator */}
              <div className="flex justify-center space-x-2">
                <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce shadow-sm"></div>
                <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-red-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.4s' }}></div>
                <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.6s' }}></div>
              </div>
              
              {/* Subtle shimmer effect */}
              <div className="w-32 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent rounded-full animate-pulse mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white shadow-sm p-2 sm:p-4">
          <div className="flex justify-between items-center max-w-sm mx-auto sm:max-w-none">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800">Memory & Journal</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">😔</div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No records available</h3>
            <p className="text-gray-500 mb-4">
              Unable to load your memories. Please try refreshing the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-2 sm:p-4">
        <div className="flex justify-between items-center max-w-sm mx-auto sm:max-w-none">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800">Memory & Journal</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEmergencyKit(true)}
              className="px-2 sm:px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
            >
              <Heart size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
              <span className="hidden sm:inline">Emergency Kit</span>
              <span className="sm:hidden">Kit</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-2 sm:p-4 space-y-4 sm:space-y-6 max-w-sm mx-auto sm:max-w-none w-full overflow-x-hidden">{/* Calendar Section */}
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="text-gray-600" size={18} />
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="text-gray-600" size={18} />
            </button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3 sm:mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500 p-1 sm:p-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={index} className="p-1 sm:p-3"></div>;
              }

              const dateKey = formatDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const hasEntry = journalEntries[dateKey];
              const isSelected = selectedDate === dateKey;

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`
                    p-1 sm:p-3 text-xs sm:text-sm rounded-lg border-2 transition-all hover:scale-105 cursor-pointer min-h-[2.5rem] sm:min-h-[3rem]
                    ${isSelected ? 'ring-2 ring-blue-400' : ''}
                    ${hasEntry ? getMoodColor(hasEntry.mood) : 'bg-white border-gray-200 hover:bg-gray-50'}
                  `}
                >
                  <div className="flex flex-col items-center">
                    <span className="font-medium">{day}</span>
                    <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                      {hasEntry && (
                        <>
                          <span className="text-xs">{getMoodEmoji(hasEntry.mood)}</span>
                          {hasEntry.mediaAttachments.length > 0 && (
                            <div className="flex gap-0.5">
                              {hasEntry.mediaAttachments.some(m => m.type === 'image') && (
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-400 rounded-full"></div>
                              )}
                              {hasEntry.mediaAttachments.some(m => m.type === 'video') && (
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-purple-400 rounded-full"></div>
                              )}
                              {hasEntry.mediaAttachments.some(m => m.type === 'audio') && (
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-400 rounded-full"></div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mood Legend */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4 sm:mt-6 text-xs">
            <div className="flex items-center">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-200 rounded mr-1"></div>
              <span className="text-xs">Very Sad</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-orange-200 rounded mr-1"></div>
              <span className="text-xs">Sad</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-200 rounded mr-1"></div>
              <span className="text-xs">Neutral</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-200 rounded mr-1"></div>
              <span className="text-xs">Happy</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-200 rounded mr-1"></div>
              <span className="text-xs">Very Happy</span>
            </div>
          </div>
        </div>

        {/* Journal Entry Section */}
        {selectedDate && (
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center">
                <BookOpen className="mr-2 text-blue-600" size={18} />
                <span className="text-sm sm:text-base">
                  {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                {currentEntry && (
                  <>
                    <span className="text-xl sm:text-2xl">{getMoodEmoji(currentEntry.mood)}</span>
                    <button
                      onClick={() => toggleEntryFavorite(selectedDate)}
                      className={`p-1 sm:p-2 rounded-lg transition-colors ${
                        currentEntry.isFavorite 
                          ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                          : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                    >
                      <Heart size={20} fill={currentEntry.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {currentEntry ? (
              <div className="space-y-6">
                {/* Media Attachments */}
                {currentEntry.mediaAttachments.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Memories:</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {currentEntry.mediaAttachments.map((media) => (
                        <div key={media.id} className="relative">
                          <MediaAttachmentCard media={media} />
                          <button
                            onClick={() => toggleMediaFavorite(selectedDate, media.id)}
                            className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
                              media.isFavorite 
                                ? 'text-red-500 bg-white/90 hover:bg-white' 
                                : 'text-gray-400 bg-white/70 hover:text-red-500 hover:bg-white/90'
                            }`}
                          >
                            <Heart size={16} fill={media.isFavorite ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Journal Content */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Reflection:</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg leading-relaxed">{currentEntry.content}</p>
                </div>

                {/* Gratitude */}
                {currentEntry.gratitude.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Grateful for:</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentEntry.gratitude.map((item, index) => (
                        <span key={index} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                          💚 {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Achievements */}
                {currentEntry.achievements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Achievements:</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentEntry.achievements.map((item, index) => (
                        <span key={index} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                          🎉 {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Heart className="mx-auto mb-3 text-gray-300" size={48} />
                <p className="text-lg mb-2">No journal entry for this day</p>
                <p className="text-sm">Click the + button to start writing</p>
              </div>
            )}
          </div>
        )}

        {!selectedDate && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Heart className="mx-auto mb-4 text-gray-300" size={64} />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Select a Date</h3>
            <p className="text-gray-500">Click on any date to view or create a journal entry</p>
            <p className="text-sm text-gray-400 mt-2">Colored dates have existing entries</p>
          </div>
        )}

        {/* Memory Carousel
        {visualMedia.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center">
                <Heart className="mr-2 text-purple-600" size={18} />
                Your Visual Memories
              </h3>
              <span className="text-xs sm:text-sm text-gray-500 mt-2">{visualMedia.length} memories</span>
            </div>
            <MemoryCarousel 
              media={visualMedia} 
              onMediaClick={(entryDate) => setSelectedDate(entryDate)} 
            />
          </div>
        )} */}

      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowUploadModal(true)}
        className="fixed bottom-20 right-6 bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg transition-colors z-40"
      >
        <Plus size={24} />
      </button>

      {/* Emergency Memory Kit Modal */}
      {showEmergencyKit && (
        <EmergencyMemoryKit 
          onClose={() => setShowEmergencyKit(false)}
          favoriteMemories={favoriteMemories}
          onSelectMemory={(date) => {
            setSelectedDate(date);
            setShowEmergencyKit(false);
          }}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal 
          onClose={() => setShowUploadModal(false)}
          selectedDate={selectedDate}
          onSave={(entry) => {
            // Save to memoryData file
            addJournalEntry(entry);
            
            // Update local state to reflect changes immediately
            setJournalEntries(prev => ({
              ...prev,
              [entry.date]: entry
            }));
          }}
        />
      )}
    </div>
  );
}

// Emergency Memory Kit Component
const EmergencyMemoryKit = ({ 
  onClose, 
  favoriteMemories, 
  onSelectMemory 
}: { 
  onClose: () => void;
  favoriteMemories: {
    entries: (JournalEntry & { entryDate: string })[];
    media: (MediaAttachment & { entryDate: string })[];
  };
  onSelectMemory: (date: string) => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  type FavoriteItem = (JournalEntry & { entryDate: string; isMedia?: false }) | (MediaAttachment & { entryDate: string; isMedia: true });
  
  const allFavorites: FavoriteItem[] = [
    ...favoriteMemories.entries.map(e => ({ ...e, isMedia: false as const })),
    ...favoriteMemories.media.map(m => ({ ...m, isMedia: true as const }))
  ].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());

  const getMoodEmojiLocal = (mood: JournalEntry['mood']) => {
    const emojis: Record<JournalEntry['mood'], string> = {
      'very-sad': '😢',
      'sad': '😕',
      'neutral': '😐',
      'happy': '😊',
      'very-happy': '😄'
    };
    return emojis[mood] || '😐';
  };

  const nextMemory = () => {
    setCurrentIndex((prev) => (prev + 1) % allFavorites.length);
  };

  const prevMemory = () => {
    setCurrentIndex((prev) => (prev - 1 + allFavorites.length) % allFavorites.length);
  };

  const currentMemory = allFavorites[currentIndex];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/95 to-blue-900/95 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm sm:max-w-md h-[90vh] flex flex-col shadow-2xl mx-2">{/* Fixed height for consistency */}
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-4 sm:p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold flex items-center">
                <Heart className="mr-2 sm:mr-3" size={20} />
                Your Emergency Kit
              </h2>
              <p className="text-red-100 mt-1 text-sm sm:text-base">
                Remember these beautiful moments. You are loved. You matter.
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {allFavorites.length === 0 ? (
          <div className="p-6 sm:p-12 text-center flex-grow">
            <Heart size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
              No favorite memories yet
            </h3>
            <p className="text-gray-500 mb-6 text-sm sm:text-base">
              Mark some of your happiest memories as favorites to create your emergency kit
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
            >
              Create Memories
            </button>
          </div>
        ) : (
          <div className="flex-grow overflow-auto p-4 sm:p-6">{/* Mobile-optimized scrollable container */}
            {/* Memory Counter */}
            <div className="text-center mb-4 sm:mb-6">
              <p className="text-sm text-gray-500">
                Memory {currentIndex + 1} of {allFavorites.length}
              </p>
              <div className="flex justify-center space-x-1 mt-2">
                {allFavorites.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentIndex ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Memory Content */}
            {currentMemory && (
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                {/* Date Header */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                    {new Date(currentMemory.entryDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </h3>
                  {!currentMemory.isMedia && (
                    <span className="text-2xl">{getMoodEmojiLocal(currentMemory.mood)}</span>
                  )}
                </div>

                {/* Memory Content */}
                {currentMemory.isMedia ? (
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mb-4">
                      {currentMemory.type === 'image' && <Image size={32} className="text-white" />}
                      {currentMemory.type === 'video' && <Video size={32} className="text-white" />}
                      {currentMemory.type === 'audio' && <Mic size={32} className="text-white" />}
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-2">{currentMemory.filename}</h4>
                    <p className="text-gray-600 text-sm italic">"{currentMemory.caption}"</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Your reflection:</h4>
                      <p className="text-gray-600 bg-white/60 p-4 rounded-lg leading-relaxed">
                        {currentMemory.content}
                      </p>
                    </div>
                    
                    {currentMemory.gratitude.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">You were grateful for:</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentMemory.gratitude.map((item, index) => (
                            <span key={index} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                              💚 {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentMemory.achievements.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Your achievements:</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentMemory.achievements.map((item, index) => (
                            <span key={index} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                              🎉 {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center gap-2">
              <button
                onClick={prevMemory}
                disabled={allFavorites.length <= 1}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </button>

              <button
                onClick={() => onSelectMemory(currentMemory.entryDate)}
                className="px-3 sm:px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                <span className="hidden sm:inline">View Full Entry</span>
                <span className="sm:hidden">View</span>
              </button>

              <button
                onClick={nextMemory}
                disabled={allFavorites.length <= 1}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Emergency Resources - Fixed at bottom */}
        <div className="bg-gray-50 p-3 sm:p-6 border-t rounded-b-2xl flex-shrink-0">
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <button className="flex items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm sm:text-base">
              <span>📞</span>
              <span className="hidden sm:inline">Call Crisis Line</span>
              <span className="sm:hidden">Crisis</span>
            </button>
            <button className="flex items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm sm:text-base">
              <Heart size={14} />
              <span className="hidden sm:inline">Text Trusted Contact</span>
              <span className="sm:hidden">Contact</span>
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2 sm:mt-3">
            You are not alone. Help is always available.
          </p>
        </div>
      </div>
    </div>
  );
};

// Memory Carousel Component
const MemoryCarousel = ({ 
  media, 
  onMediaClick 
}: { 
  media: (MediaAttachment & { entryDate: string })[], 
  onMediaClick: (entryDate: string) => void 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-scroll functionality
  useEffect(() => {
    if (!isPaused && media.length > 1) {
      const interval = setInterval(() => {
        nextSlide();
      }, 3000); // Auto-scroll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [isPaused, media.length, currentIndex]);

  const nextSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % media.length);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const prevSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 300);
  };

  if (media.length === 0) return null;

  return (
    <div 
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Carousel Container */}
      <div className="relative h-64">
        <div 
          className="flex flex-nowrap transition-transform duration-300 ease-in-out h-full w-full"
          style={{ 
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {media.map((item, index) => (
            <div 
              key={item.id}
              className="h-full px-2 flex-shrink-0 w-[50%]"
              onClick={() => onMediaClick(item.entryDate)}
            >
              <CarouselMediaCard 
                media={item} 
                isActive={index === currentIndex}
                isAdjacent={Math.abs(index - currentIndex) === 1 || 
                           (currentIndex === 0 && index === media.length - 1) ||
                           (currentIndex === media.length - 1 && index === 0)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {media.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            disabled={isAnimating}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm shadow-lg rounded-full p-3 hover:bg-white hover:scale-110 transition-all duration-200 disabled:opacity-50 z-10"
          >
            <ChevronLeft size={20} className="text-gray-700" />
          </button>
          <button
            onClick={nextSlide}
            disabled={isAnimating}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm shadow-lg rounded-full p-3 hover:bg-white hover:scale-110 transition-all duration-200 disabled:opacity-50 z-10"
          >
            <ChevronRight size={20} className="text-gray-700" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {media.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {media.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              disabled={isAnimating}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex 
                  ? 'bg-purple-500 w-6' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}

      {/* Auto-scroll indicator */}
      {!isPaused && media.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/20 text-white text-xs px-2 py-1 rounded-full">
          Auto-scroll
        </div>
      )}
    </div>
  );
};

// Carousel Media Card Component
const CarouselMediaCard = ({ 
  media, 
  isActive = false, 
  isAdjacent = false 
}: { 
  media: MediaAttachment & { entryDate: string };
  isActive?: boolean;
  isAdjacent?: boolean;
}) => {
  return (
    <div className={`
      bg-white rounded-xl overflow-hidden shadow-lg transition-all duration-300 cursor-pointer h-full
      ${isActive ? 'scale-105 shadow-2xl ring-2 ring-purple-400' : ''}
      ${isAdjacent ? 'scale-95 opacity-90' : ''}
      ${!isActive && !isAdjacent ? 'scale-90 opacity-70' : ''}
      hover:scale-105 hover:shadow-xl
    `}>
      <div className="relative h-40">
        {media.type === 'image' && (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            <Image size={40} className="text-gray-400 relative z-10" />
            <span className="absolute top-3 right-3 text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">
              IMG
            </span>
            <div className="absolute bottom-3 left-3 right-3">
              <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full animate-pulse" style={{width: '60%'}}></div>
              </div>
            </div>
          </div>
        )}
        
        {media.type === 'video' && (
          <div className="w-full h-full bg-gradient-to-br from-purple-100 via-pink-100 to-red-100 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            <Video size={40} className="text-gray-400 relative z-10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 shadow-lg hover:scale-110 transition-transform">
                <Play size={24} className="text-purple-600 ml-1" />
              </div>
            </div>
            <span className="absolute top-3 right-3 text-xs bg-purple-500 text-white px-2 py-1 rounded-full font-medium">
              VIDEO
            </span>
            <span className="absolute bottom-3 right-3 text-xs bg-black/50 text-white px-2 py-1 rounded-full">
              2:34
            </span>
          </div>
        )}

        {/* Active indicator */}
        {isActive && (
          <div className="absolute top-3 left-3 w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-800 truncate flex-1">
            {media.filename}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
              {new Date(media.entryDate).getDate()}
            </span>
          </div>
        </div>
        
        {media.caption && (
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-2">
            {media.caption}
          </p>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{new Date(media.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          <div className="flex items-center gap-1">
            <Heart size={12} className="text-red-400" />
            <span>Memory</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Media Attachment Card Component
const MediaAttachmentCard = ({ media }: { media: MediaAttachment }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const getMediaIcon = () => {
    switch (media.type) {
      case 'image':
        return <Image size={16} className="text-blue-600" />;
      case 'video':
        return <Video size={16} className="text-purple-600" />;
      case 'audio':
        return <Mic size={16} className="text-green-600" />;
      default:
        return <Image size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Media Content */}
      <div className="relative">
        {media.type === 'image' && (
          <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <Image size={32} className="text-gray-400" />
            <span className="absolute bottom-2 right-2 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              IMG
            </span>
          </div>
        )}
        
        {media.type === 'video' && (
          <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center relative">
            <Video size={32} className="text-gray-400" />
            <button 
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 hover:bg-opacity-30 transition-all"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              <Play size={24} className="text-white" />
            </button>
            <span className="absolute bottom-2 right-2 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              VIDEO
            </span>
          </div>
        )}
        
        {media.type === 'audio' && (
          <div className="aspect-video bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
            <div className="text-center">
              <Mic size={32} className="text-gray-400 mx-auto mb-2" />
              <button 
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            </div>
            <span className="absolute bottom-2 right-2 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              AUDIO
            </span>
          </div>
        )}
      </div>

      {/* Media Info */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {getMediaIcon()}
          <span className="text-sm font-medium text-gray-700 truncate">
            {media.filename}
          </span>
        </div>
        {media.caption && (
          <p className="text-xs text-gray-500 leading-relaxed">{media.caption}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {new Date(media.uploadedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

// Upload Modal Component
const UploadModal = ({ 
  onClose, 
  selectedDate, 
  onSave 
}: { 
  onClose: () => void; 
  selectedDate: string | null;
  onSave: (entry: JournalEntry) => void;
}) => {
  const [mood, setMood] = useState<JournalEntry['mood']>('neutral');
  const [emotion, setEmotion] = useState<JournalEntry['emotion']>('calm');
  const [reflection, setReflection] = useState('');
  const [gratitudeItems, setGratitudeItems] = useState<string[]>(['']);
  const [achievementItems, setAchievementItems] = useState<string[]>(['']);
  const [uploadedMedia, setUploadedMedia] = useState<MediaAttachment[]>([]);
  const [currentGratitude, setCurrentGratitude] = useState('');
  const [currentAchievement, setCurrentAchievement] = useState('');

  const moodOptions = [
    { mood: 'very-sad' as const, emoji: '😢', label: 'Very Sad' },
    { mood: 'sad' as const, emoji: '😕', label: 'Sad' },
    { mood: 'neutral' as const, emoji: '😐', label: 'Neutral' },
    { mood: 'happy' as const, emoji: '😊', label: 'Happy' },
    { mood: 'very-happy' as const, emoji: '😄', label: 'Very Happy' }
  ];

  const emotionOptions: { emotion: JournalEntry['emotion'], emoji: string, title: string, description: string }[] = [
    { emotion: 'joy', emoji: '😄', title: 'Joy', description: 'Pure celebration & happiness' },
    { emotion: 'hope', emoji: '🌟', title: 'Hope', description: 'Optimism & dreams' },
    { emotion: 'love', emoji: '❤️', title: 'Love', description: 'Deep connection & belonging' },
    { emotion: 'calm', emoji: '🌊', title: 'Calm', description: 'Peace & tranquility' },
    { emotion: 'strength', emoji: '💪', title: 'Strength', description: 'Resilience & courage' },
    { emotion: 'comfort', emoji: '☁️', title: 'Comfort', description: 'Warmth & security' },
    { emotion: 'gratitude', emoji: '🙏', title: 'Gratitude', description: 'Thankfulness & appreciation' },
    { emotion: 'belonging', emoji: '🏡', title: 'Belonging', description: 'Acceptance & community' },
    { emotion: 'sad', emoji: '😢', title: 'Sadness', description: 'Gentle sadness that needs care' },
    { emotion: 'disappointed', emoji: '😞', title: 'Disappointment', description: 'Learning from setbacks' }
  ];

  const handleMoodChange = (newMood: JournalEntry['mood']) => {
    setMood(newMood);
    // Auto-suggest emotion based on mood
    const suggestedEmotion = moodToEmotionMap[newMood];
    if (suggestedEmotion) {
      setEmotion(suggestedEmotion);
    }
  };

  const handleFileUpload = (type: 'image' | 'video' | 'audio') => {
    // In a real app, this would handle file upload
    const newMedia: MediaAttachment = {
      id: Date.now().toString(),
      type,
      url: `/api/placeholder/${type}`,
      filename: `${type}_${Date.now()}.${type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'mp3'}`,
      caption: '',
      uploadedAt: new Date()
    };
    setUploadedMedia(prev => [...prev, newMedia]);
  };

  const addGratitudeItem = () => {
    if (currentGratitude.trim()) {
      setGratitudeItems(prev => [...prev.filter(item => item), currentGratitude.trim()]);
      setCurrentGratitude('');
    }
  };

  const addAchievementItem = () => {
    if (currentAchievement.trim()) {
      setAchievementItems(prev => [...prev.filter(item => item), currentAchievement.trim()]);
      setCurrentAchievement('');
    }
  };

  const removeGratitudeItem = (index: number) => {
    setGratitudeItems(prev => prev.filter((_, i) => i !== index));
  };

  const removeAchievementItem = (index: number) => {
    setAchievementItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Use selectedDate if available, otherwise use today's date
    const saveDate = selectedDate || new Date().toISOString().split('T')[0];
    
    console.log('Saving memory entry:', { saveDate, mood, emotion, reflection });
    
    // Create new journal entry
    const newEntry: JournalEntry = {
      date: saveDate,
      mood,
      emotion,
      content: reflection,
      gratitude: gratitudeItems.filter(item => item.trim()),
      achievements: achievementItems.filter(item => item.trim()),
      mediaAttachments: uploadedMedia
    };

    // Call the onSave function passed from parent
    onSave(newEntry);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl max-w-sm sm:max-w-2xl w-full max-h-[95vh] overflow-y-auto">{/* Increased height and made mobile responsive */}
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold flex items-center">
                <BookOpen className="mr-2 text-blue-600" size={20} />
                New Memory Entry
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {selectedDate 
                  ? new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric' 
                    })
                  : new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric' 
                    })
                }
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">{/* Mobile responsive padding */}
          {/* Mood Selector */}
          <div>
            <h4 className="font-semibold mb-3 text-gray-800">How are you feeling?</h4>
            <div className="flex justify-between gap-2">
              {moodOptions.map((option) => (
                <button
                  key={option.mood}
                  onClick={() => handleMoodChange(option.mood)}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    mood === option.mood 
                      ? 'border-blue-500 bg-blue-50 scale-105' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.emoji}</div>
                  <div className="text-xs font-medium text-gray-600">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Emotion Selector */}
          <div>
            <h4 className="font-semibold mb-3 text-gray-800">Which emotion jar would you like to add?</h4>
            <div className="grid grid-cols-2 gap-2">
              {emotionOptions.map((option) => (
                <button
                  key={option.emotion}
                  onClick={() => setEmotion(option.emotion)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    emotion === option.emotion 
                      ? 'border-purple-500 bg-purple-50 scale-[1.02]' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{option.emoji}</span>
                    <span className="font-medium text-sm text-gray-800">{option.title}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Media Upload Section */}
          <div>
            <h4 className="font-semibold mb-3 text-gray-800">Add Memories:</h4>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                onClick={() => handleFileUpload('image')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Image className="text-blue-500 mb-2" size={24} />
                <span className="text-sm font-medium">Photo</span>
              </button>
              <button
                onClick={() => handleFileUpload('video')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                <Video className="text-purple-500 mb-2" size={24} />
                <span className="text-sm font-medium">Video</span>
              </button>
              <button
                onClick={() => handleFileUpload('audio')}
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                <Mic className="text-green-500 mb-2" size={24} />
                <span className="text-sm font-medium">Voice</span>
              </button>
            </div>

            {/* Uploaded Media Preview */}
            {uploadedMedia.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {uploadedMedia.map((media) => (
                  <div key={media.id} className="relative bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {media.type === 'image' && <Image size={16} className="text-blue-600" />}
                      {media.type === 'video' && <Video size={16} className="text-purple-600" />}
                      {media.type === 'audio' && <Mic size={16} className="text-green-600" />}
                      <span className="text-sm font-medium truncate">{media.filename}</span>
                      <button
                        onClick={() => setUploadedMedia(prev => prev.filter(m => m.id !== media.id))}
                        className="ml-auto p-1 hover:bg-gray-200 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reflection Section */}
          <div>
            <label className="block font-semibold mb-2 text-gray-800">
              Reflection:
            </label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="How was your day? What happened? How did it make you feel?"
              className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
          </div>

          {/* Gratitude Section */}
          <div>
            <label className="block font-semibold mb-2 text-gray-800">
              Grateful for:
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentGratitude}
                  onChange={(e) => setCurrentGratitude(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addGratitudeItem()}
                  placeholder="What are you grateful for today?"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={addGratitudeItem}
                  className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Add
                </button>
              </div>
              {gratitudeItems.filter(item => item).map((item, index) => (
                <div key={index} className="flex items-center gap-2 bg-green-50 p-2 rounded-lg">
                  <span className="text-green-600">💚</span>
                  <span className="flex-1 text-sm">{item}</span>
                  <button
                    onClick={() => removeGratitudeItem(index)}
                    className="p-1 hover:bg-green-200 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements Section */}
          <div>
            <label className="block font-semibold mb-2 text-gray-800">
              Achievements:
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentAchievement}
                  onChange={(e) => setCurrentAchievement(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addAchievementItem()}
                  placeholder="What did you accomplish today?"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={addAchievementItem}
                  className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add
                </button>
              </div>
              {achievementItems.filter(item => item).map((item, index) => (
                <div key={index} className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg">
                  <span className="text-blue-600">🎉</span>
                  <span className="flex-1 text-sm">{item}</span>
                  <button
                    onClick={() => removeAchievementItem(index)}
                    className="p-1 hover:bg-blue-200 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 sm:p-6 rounded-b-xl">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 sm:px-6 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!reflection.trim()}
              className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              title={!reflection.trim() ? "Please add a reflection to save your memory" : "Save your memory entry"}
            >
              Save Memory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};