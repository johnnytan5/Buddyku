from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Dict, List, Any
import boto3
import json
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
from src.api import chat, mood_detection, suicide_detector
from routers import phone

# Define valid emotions
VALID_EMOTIONS = [
    "belonging", "calm", "comfort", "disappointment", 
    "gratitude", "hope", "joy", "love", "sadness", "strength"
]

# Pydantic models
class MediaAttachment(BaseModel):
    id: str
    type: Literal["image", "video", "audio"]
    url: str
    filename: str
    caption: str = None
    uploadedAt: str
    isFavorite: bool = False

class EmotionUpload(BaseModel):
    user_id: str
    date: str
    mood: Literal["very-sad", "sad", "neutral", "happy", "very-happy"]
    emotion: Literal["belonging", "calm", "comfort", "disappointment", 
                    "gratitude", "hope", "joy", "love", "sadness", "strength"]
    title: str = None
    content: str
    description: str = None
    location: str = None
    people: List[str] = []
    tags: List[str] = []
    gratitude: List[str] = []
    achievements: List[str] = []
    mediaAttachments: List[MediaAttachment] = []
    isFavorite: bool = False

class EmotionBatchUpload(BaseModel):
    user_id: str
    entries: List[EmotionUpload]

class UserEmotionFetch(BaseModel):
    user_id: str

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('S3_ACCESS_KEY_ID', 'AKIA535ZCMO577NWOHFR'),
    aws_secret_access_key=os.getenv('S3_SECRET_ACCESS_KEY'),
    region_name=os.getenv('S3_REGION', 'ap-southeast-1')  # Default to us-east-1, update as needed
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://frontend:3000",  # Add this for Docker
        "http://localhost", 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include all routers
app.include_router(phone.router)
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(mood_detection.router, prefix="/api", tags=["mood_detection"])
app.include_router(suicide_detector.router, prefix="/api", tags=["suicide_detector"])


@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI backend!"}

# Add this to backend/main.py after the existing endpoints

@app.get("/health")
async def health_check():
    """
    Health check endpoint for Docker and load balancer
    """
    return {
        "status": "healthy",
        "message": "Backend service is running",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/uploadEmotionsS3")
async def upload_emotions_s3(emotion_data: EmotionUpload):
    """
    Upload emotion data to S3 bucket 'emotion-jar-memory' in frontend-compatible format
    
    Parameters:
    - user_id: User identifier
    - date: Date of the emotion entry
    - mood: Mood level (very-sad to very-happy)
    - emotion: One of the 10 valid emotions
    - content: Main content/text
    - title, description, location, people, tags: Optional context
    - gratitude, achievements: Lists
    - mediaAttachments: Media files
    - isFavorite: Whether this is a favorite entry
    """
    try:
        # Validate emotion
        if emotion_data.emotion not in VALID_EMOTIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid emotion. Must be one of: {VALID_EMOTIONS}"
            )
        
        # Create timestamp for unique file naming
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create the complete JournalEntry data structure to upload
        upload_data = {
            "user_id": emotion_data.user_id,
            "date": emotion_data.date,
            "mood": emotion_data.mood,
            "emotion": emotion_data.emotion,
            "title": emotion_data.title,
            "content": emotion_data.content,
            "description": emotion_data.description,
            "location": emotion_data.location,
            "people": emotion_data.people,
            "tags": emotion_data.tags,
            "gratitude": emotion_data.gratitude,
            "achievements": emotion_data.achievements,
            "mediaAttachments": [media.dict() for media in emotion_data.mediaAttachments],
            "isFavorite": emotion_data.isFavorite,
            "timestamp": timestamp,
            "upload_time": datetime.now().isoformat()
        }
        
        # Convert to JSON string
        json_data = json.dumps(upload_data, indent=2)
        
        # Create S3 key (file path in bucket) - organized by emotion/user_id
        s3_key = f"{emotion_data.emotion}/{emotion_data.user_id}/{timestamp}.json"
        
        # Upload to S3
        s3_client.put_object(
            Bucket='emotion-jar-memory',
            Key=s3_key,
            Body=json_data,
            ContentType='application/json'
        )
        
        return {
            "success": True,
            "message": "Emotion data uploaded successfully",
            "s3_key": s3_key,
            "bucket": "emotion-jar-memory"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload to S3: {str(e)}"
        )

@app.post("/uploadEmotionsS3-batch")
async def upload_emotions_s3_batch(batch_data: EmotionBatchUpload):
    """
    Upload multiple emotion entries to S3 bucket 'emotion-jar-memory' in batch
    
    Parameters:
    - user_id: User identifier
    - entries: List of emotion entries to upload
    """
    try:
        user_id = batch_data.user_id
        entries = batch_data.entries
        results = []
        errors = []
        
        # Process each entry in the batch
        for i, emotion_data in enumerate(entries):
            try:
                # Validate emotion
                if emotion_data.emotion not in VALID_EMOTIONS:
                    errors.append({
                        "index": i,
                        "error": f"Invalid emotion: {emotion_data.emotion}. Must be one of: {VALID_EMOTIONS}"
                    })
                    continue
                
                # Create timestamp for unique file naming
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]  # Include microseconds for uniqueness
                
                # Create the complete JournalEntry data structure to upload
                upload_data = {
                    "user_id": emotion_data.user_id,
                    "date": emotion_data.date,
                    "mood": emotion_data.mood,
                    "emotion": emotion_data.emotion,
                    "title": emotion_data.title,
                    "content": emotion_data.content,
                    "description": emotion_data.description,
                    "location": emotion_data.location,
                    "people": emotion_data.people,
                    "tags": emotion_data.tags,
                    "gratitude": emotion_data.gratitude,
                    "achievements": emotion_data.achievements,
                    "mediaAttachments": [media.dict() for media in emotion_data.mediaAttachments],
                    "isFavorite": emotion_data.isFavorite,
                    "timestamp": timestamp,
                    "upload_time": datetime.now().isoformat()
                }
                
                # Convert to JSON string
                json_data = json.dumps(upload_data, indent=2)
                
                # Create S3 key (file path in bucket) - organized by emotion/user_id
                s3_key = f"{emotion_data.emotion}/{emotion_data.user_id}/{timestamp}.json"
                
                # Upload to S3
                s3_client.put_object(
                    Bucket='emotion-jar-memory',
                    Key=s3_key,
                    Body=json_data,
                    ContentType='application/json'
                )
                
                results.append({
                    "index": i,
                    "success": True,
                    "s3_key": s3_key,
                    "emotion": emotion_data.emotion,
                    "date": emotion_data.date
                })
                
            except Exception as e:
                errors.append({
                    "index": i,
                    "error": f"Failed to upload entry: {str(e)}",
                    "emotion": emotion_data.emotion,
                    "date": emotion_data.date
                })
                continue
        
        return {
            "success": True,
            "message": f"Batch upload completed. {len(results)} successful, {len(errors)} failed.",
            "user_id": user_id,
            "total_entries": len(entries),
            "successful_uploads": len(results),
            "failed_uploads": len(errors),
            "results": results,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process batch upload: {str(e)}"
        )

@app.post("/fetch-all-emotions")
async def fetch_all_emotions(user_data: UserEmotionFetch):
    """
    Fetch all emotion data for a specific user and transform it into frontend-compatible format
    
    Returns data in the format expected by the frontend memory system
    """
    try:
        user_id = user_data.user_id
        journal_entries = {}
        
        # Fetch data for each emotion bucket
        for emotion in VALID_EMOTIONS:
            try:
                # List all objects in the emotion/user_id/ prefix
                prefix = f"{emotion}/{user_id}/"
                
                response = s3_client.list_objects_v2(
                    Bucket='emotion-jar-memory',
                    Prefix=prefix
                )
                
                # If objects exist, fetch and parse each one
                if 'Contents' in response:
                    for obj in response['Contents']:
                        try:
                            # Get the object content
                            obj_response = s3_client.get_object(
                                Bucket='emotion-jar-memory',
                                Key=obj['Key']
                            )
                            
                            # Parse the JSON content
                            content = obj_response['Body'].read().decode('utf-8')
                            emotion_entry = json.loads(content)
                            
                            # Use the data directly from S3 (it's already in JournalEntry format)
                            journal_entry = {
                                "date": emotion_entry.get('date', ''),
                                "mood": emotion_entry.get('mood', 'neutral'),
                                "emotion": emotion_entry.get('emotion', emotion),
                                "title": emotion_entry.get('title'),
                                "content": emotion_entry.get('content', ''),
                                "description": emotion_entry.get('description'),
                                "location": emotion_entry.get('location'),
                                "people": emotion_entry.get('people', []),
                                "tags": emotion_entry.get('tags', []),
                                "gratitude": emotion_entry.get('gratitude', []),
                                "achievements": emotion_entry.get('achievements', []),
                                "mediaAttachments": emotion_entry.get('mediaAttachments', []),
                                "isFavorite": emotion_entry.get('isFavorite', False)
                            }
                            
                            # Use date as key, or create unique key if date already exists
                            entry_key = journal_entry['date']
                            counter = 1
                            while entry_key in journal_entries:
                                entry_key = f"{journal_entry['date']}_{counter}"
                                counter += 1
                            
                            journal_entries[entry_key] = journal_entry
                            
                        except Exception as e:
                            # Skip individual file errors, continue with others
                            print(f"Error reading file {obj['Key']}: {str(e)}")
                            continue
                            
            except Exception as e:
                # Skip emotion bucket errors, continue with others
                print(f"Error accessing emotion bucket {emotion}: {str(e)}")
                continue
        
        return {
            "user_id": user_id,
            "journal_entries": journal_entries
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch emotions from S3: {str(e)}"
        )
