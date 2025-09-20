// Shared types and data for memory system
export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  filename: string;
  caption?: string;
  uploadedAt: Date;
  isFavorite?: boolean;
}

export interface JournalEntry {
  date: string;
  mood: 'very-sad' | 'sad' | 'neutral' | 'happy' | 'very-happy';
  emotion?: 'joy' | 'hope' | 'love' | 'calm' | 'strength' | 'comfort' | 'gratitude' | 'belonging' | 'sad' | 'disappointed';
  
  // Core memory content
  title?: string; // Short, memorable title for this entry
  content: string; // Main memory content
  description?: string; // Detailed story/context
  
  // Context
  location?: string;
  people?: string[];
  tags?: string[];
  
  gratitude: string[];
  achievements: string[];
  mediaAttachments: MediaAttachment[];
  isFavorite?: boolean;
}

export interface MemoryJarItem {
  id: string;
  type: 'journal' | 'gratitude' | 'achievement' | 'media';
  content: string;
  emotion: 'joy' | 'hope' | 'love' | 'calm' | 'strength' | 'comfort' | 'gratitude' | 'belonging' | 'sad' | 'disappointed';
  date: string;
  isFavorite: boolean;
  mediaUrl?: string;
  sourceEntryId: string;
  
  // Memory details
  description?: string; // Rich description for this specific memory
  tags?: string[]; // Custom tags like "family", "work", "travel"
  location?: string;
  people?: string[];
  intensity?: 1 | 2 | 3 | 4 | 5; // Emotional intensity
  context?: string; // Brief context
}

// Emotion mapping from mood to default emotion
export const moodToEmotionMap: Record<JournalEntry['mood'], JournalEntry['emotion']> = {
  'very-happy': 'joy',
  'happy': 'joy',
  'neutral': 'calm',
  'sad': 'sad',
  'very-sad': 'disappointed'
};

// Simple emotion descriptions
export const emotionDescriptions = {
  'joy': {
    title: 'Pure Joy & Celebration',
    description: 'Moments of pure celebration, laughter, and unbridled happiness. When you feel like dancing, laughing out loud, or sharing good news.'
  },
  'hope': {
    title: 'Seeds of Hope',
    description: 'Optimism and dreams taking root in your heart. When planning future goals, seeing possibility, or feeling inspired about what\'s ahead.'
  },
  'love': {
    title: 'Deep Love & Connection',
    description: 'Warm connections and the feeling of belonging. During family time, romantic moments, or feeling deeply connected to others.'
  },
  'calm': {
    title: 'Peaceful Tranquility',
    description: 'Moments of balance and inner peace. During meditation, quiet moments in nature, or when feeling perfectly centered.'
  },
  'strength': {
    title: 'Inner Strength',
    description: 'Moments of resilience, courage, and personal power. When facing challenges, overcoming obstacles, or feeling truly confident in yourself.'
  },
  'comfort': {
    title: 'Cozy Comfort',
    description: 'Safe, warm moments of gentle contentment. During self-care, cozy evenings at home, or when feeling emotionally secure and nurtured.'
  },
  'gratitude': {
    title: 'Heartfelt Gratitude',
    description: 'Deep appreciation for life\'s blessings, big and small. When counting your blessings, feeling thankful, or recognizing simple pleasures.'
  },
  'belonging': {
    title: 'Sense of Belonging',
    description: 'The beautiful feeling of being accepted and valued. When feeling part of a group, being understood, or finding your community.'
  },
  'sad': {
    title: 'Gentle Sadness',
    description: 'Tender emotions that need acknowledgment and care. During losses, missing someone, or processing difficult but natural feelings.'
  },
  'disappointed': {
    title: 'Learning from Disappointment',
    description: 'Growing through unmet expectations with resilience. When plans don\'t work out, facing setbacks, or finding strength in difficult moments.'
  }
};

// Sample journal entries data
export const journalEntriesData: Record<string, JournalEntry> = {
  '2025-09-15': {
    date: '2025-09-15',
    mood: 'happy',
    emotion: 'joy',
    title: 'Perfect Picnic with Best Friends',
    content: 'Had a great day with friends. We went to the park and had a picnic. The weather was perfect and everyone was in such good spirits.',
    description: 'What started as a simple text message from Sarah turned into the most spontaneous and joyful day I\'ve had in weeks. We gathered at Riverside Park around noon with homemade food, Mike\'s guitar, and Emma\'s famous cookies. The afternoon flew by with laughter, music, and that rare feeling of being completely present. These simple moments with people who matter reminded me that happiness doesn\'t need to be complicated.',
    location: 'Riverside Park, near the old oak tree',
    people: ['Sarah', 'Mike', 'Emma'],
    tags: ['spontaneous', 'friendship', 'outdoor', 'music', 'laughter'],
    gratitude: ['Good weather', 'Supportive friends', 'Having a free afternoon', 'Emma\'s baking skills'],
    achievements: ['Completed morning workout', 'Called mom', 'Made time for friendship', 'Stayed present and put phone away'],
    isFavorite: true,
    mediaAttachments: [
      {
        id: '1',
        type: 'image',
        url: '/api/placeholder/400/300',
        filename: 'park_picnic.jpg',
        caption: 'Beautiful day at the park with friends - Sarah and Emma laughing while Mike plays guitar in the background',
        uploadedAt: new Date('2025-09-15'),
        isFavorite: true
      },
      {
        id: '2',
        type: 'video',
        url: '/api/placeholder/video',
        filename: 'friends_laughing.mp4',
        caption: 'Everyone having such a good time - captured the moment when Emma told her hilarious work story',
        uploadedAt: new Date('2025-09-15'),
        isFavorite: false
      }
    ]
  },
  '2025-09-10': {
    date: '2025-09-10',
    mood: 'very-happy',
    emotion: 'gratitude',
    content: 'Got the job I applied for! Feeling excited about this new chapter. All the preparation and interviews finally paid off.',
    gratitude: ['New opportunity', 'Family support'],
    achievements: ['Successful interview', 'Career milestone'],
    isFavorite: true,
    mediaAttachments: [
      {
        id: '3',
        type: 'image',
        url: '/api/placeholder/400/300',
        filename: 'job_offer.jpg',
        caption: 'The moment I got the call!',
        uploadedAt: new Date('2025-09-10'),
        isFavorite: false
      },
      {
        id: '4',
        type: 'audio',
        url: '/api/placeholder/audio',
        filename: 'celebration_voice_note.mp3',
        caption: 'Recording my excitement',
        uploadedAt: new Date('2025-09-10'),
        isFavorite: true
      }
    ]
  },
  '2025-09-18': {
    date: '2025-09-18',
    mood: 'neutral',
    emotion: 'calm',
    content: 'Regular day at work. Feeling okay, nothing special but nothing bad either. Just going through the motions.',
    gratitude: ['Stable routine'],
    achievements: ['Finished project tasks'],
    isFavorite: false,
    mediaAttachments: []
  },
  '2025-09-12': {
    date: '2025-09-12',
    mood: 'happy',
    emotion: 'love',
    content: 'Spent quality time with family. Felt so connected and loved. Had deep conversations and shared stories.',
    gratitude: ['Family time', 'Deep conversations'],
    achievements: ['Listened actively', 'Shared my feelings'],
    isFavorite: true,
    mediaAttachments: []
  },
  '2025-09-08': {
    date: '2025-09-08',
    mood: 'sad',
    emotion: 'disappointed',
    content: 'Didn\'t get the promotion I was hoping for. Feeling let down but trying to stay positive.',
    gratitude: ['Learning opportunity'],
    achievements: ['Handled rejection gracefully'],
    isFavorite: false,
    mediaAttachments: []
  },
  '2025-09-14': {
    date: '2025-09-14',
    mood: 'happy',
    emotion: 'hope',
    content: 'Started planning my future goals and dreams. Feeling optimistic about what\'s ahead.',
    gratitude: ['Clear vision', 'Support system'],
    achievements: ['Created vision board', 'Set 3 new goals'],
    isFavorite: true,
    mediaAttachments: []
  },
  '2025-09-16': {
    date: '2025-09-16',
    mood: 'neutral',
    emotion: 'comfort',
    content: 'Cozy evening at home with hot tea and a good book. Sometimes simple pleasures are the best.',
    gratitude: ['Peaceful moments', 'Good book'],
    achievements: ['Read 50 pages', 'Practiced mindfulness'],
    isFavorite: false,
    mediaAttachments: []
  },
  '2025-09-17': {
    date: '2025-09-17',
    mood: 'happy',
    emotion: 'belonging',
    content: 'Attended a community event and met wonderful people. Felt so welcomed and part of something bigger.',
    gratitude: ['New friendships', 'Community spirit'],
    achievements: ['Stepped out of comfort zone', 'Made 3 new connections'],
    isFavorite: true,
    mediaAttachments: []
  },
  '2025-09-19': {
    date: '2025-09-19',
    mood: 'very-happy',
    emotion: 'joy',
    content: 'Amazing day celebrating with friends! We had such a wonderful time together.',
    gratitude: ['Great friends', 'Celebration moments'],
    achievements: ['Organized successful gathering', 'Created lasting memories'],
    isFavorite: true,
    mediaAttachments: []
  },
  '2025-09-20': {
    date: '2025-09-20',
    mood: 'happy',
    emotion: 'gratitude',
    content: 'Reflecting on all the good things in my life today. Feeling truly blessed.',
    gratitude: ['Health', 'Family', 'Opportunities'],
    achievements: ['Practiced gratitude', 'Called grandparents'],
    isFavorite: false,
    mediaAttachments: []
  }
};

// Data transformation utilities
export const transformEntryToMemories = (entry: JournalEntry, date: string): MemoryJarItem[] => {
  const memories: MemoryJarItem[] = [];
  const emotion = entry.emotion || moodToEmotionMap[entry.mood] || 'calm';
  
  // Add main journal entry with title and description
  const mainTitle = entry.title || `Memory from ${date}`;
  const mainDescription = entry.description || entry.content;
  
  memories.push({
    id: `journal-${date}`,
    type: 'journal',
    content: entry.content,
    description: mainDescription,
    emotion: emotion,
    date,
    isFavorite: entry.isFavorite || false,
    sourceEntryId: date,
    location: entry.location,
    people: entry.people,
    intensity: 3, // Default intensity
    context: entry.location || 'personal memory',
    tags: [
      ...(entry.people || []).map(person => `person:${person}`),
      ...(entry.tags || []),
      ...(entry.location ? [`location:${entry.location}`] : [])
    ]
  });
  
  // Add gratitude items with simple descriptions
  entry.gratitude.forEach((item, index) => {
    memories.push({
      id: `gratitude-${date}-${index}`,
      type: 'gratitude',
      content: item,
      description: `Grateful for ${item.toLowerCase()} during ${entry.location || 'this memorable day'}`,
      emotion: 'gratitude',
      date,
      isFavorite: false,
      sourceEntryId: date,
      location: entry.location,
      intensity: 3,
      context: 'gratitude reflection',
      tags: ['gratitude', ...(entry.location ? [`location:${entry.location}`] : [])]
    });
  });
  
  // Add achievements with context
  entry.achievements.forEach((item, index) => {
    memories.push({
      id: `achievement-${date}-${index}`,
      type: 'achievement',
      content: item,
      description: `Successfully ${item.toLowerCase()} - feeling proud of this accomplishment`,
      emotion: 'strength',
      date,
      isFavorite: false,
      sourceEntryId: date,
      intensity: 4, // Achievements typically feel strong
      context: 'personal accomplishment',
      tags: ['achievement', 'personal-growth']
    });
  });
  
  // Add media memories with simple descriptions
  entry.mediaAttachments.forEach(media => {
    memories.push({
      id: `media-${media.id}`,
      type: 'media',
      content: media.caption || media.filename,
      description: `${media.caption} - captured during ${entry.location || 'this memorable moment'}`,
      emotion: emotion,
      date,
      isFavorite: media.isFavorite || false,
      mediaUrl: media.url,
      sourceEntryId: date,
      location: entry.location,
      context: `${media.type} memory`,
      tags: ['media', media.type, ...(entry.location ? [`location:${entry.location}`] : [])]
    });
  });
  
  return memories;
};

export const distributeMemoriesToJars = (entries: Record<string, JournalEntry>) => {
  const emotionJars: Record<string, MemoryJarItem[]> = {
    'joy': [],
    'hope': [],
    'love': [],
    'calm': [],
    'strength': [],
    'comfort': [],
    'gratitude': [],
    'belonging': [],
    'sad': [],
    'disappointed': []
  };
  
  Object.entries(entries).forEach(([date, entry]) => {
    const memories = transformEntryToMemories(entry, date);
    memories.forEach(memory => {
      emotionJars[memory.emotion].push(memory);
    });
  });
  
  return emotionJars;
};