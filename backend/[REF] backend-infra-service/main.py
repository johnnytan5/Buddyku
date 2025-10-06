from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Dict, List, Any
import boto3
from boto3.dynamodb.conditions import Attr
import json
import os
import hashlib
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
from src.api import chat, mood_detection, suicide_detector
from routers import phone, voice_webhooks, ai_calling

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

class UserLogin(BaseModel):
    email: str
    password: str

class UserRegistration(BaseModel):
    email: str
    password: str
    name: str
    phone: str
    emergency_contact_name: str = None
    emergency_contact_phone: str = None
    
    class Config:
        # Allow extra fields to be ignored
        extra = "ignore"

class UserProfile(BaseModel):
    user_id: str
    email: str
    name: str
    phone: str
    emergency_contact_name: str = None
    emergency_contact_phone: str = None
    created_at: str = None
    last_login: str = None

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('S3_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('S3_SECRET_ACCESS_KEY'),
    region_name=os.getenv('S3_REGION')
)

# Initialize DynamoDB client 
dynamodb = boto3.resource(
    'dynamodb',
    aws_access_key_id=os.getenv('S3_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('S3_SECRET_ACCESS_KEY'),
    region_name=os.getenv('S3_REGION')
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
app.include_router(voice_webhooks.router)
app.include_router(ai_calling.router)
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(mood_detection.router, prefix="/api", tags=["mood_detection"])
app.include_router(suicide_detector.router, prefix="/api", tags=["suicide_detector"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "Server is running"}


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
    Upload emotion data to S3 bucket 'emotion-jar-memories' in frontend-compatible format
    
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
            Bucket='emotion-jar-memories',
            Key=s3_key,
            Body=json_data,
            ContentType='application/json'
        )
        
        return {
            "success": True,
            "message": "Emotion data uploaded successfully",
            "s3_key": s3_key,
            "bucket": "emotion-jar-memories"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload to S3: {str(e)}"
        )

@app.post("/uploadEmotionsS3-batch")
async def upload_emotions_s3_batch(batch_data: EmotionBatchUpload):
    """
    Upload multiple emotion entries to S3 bucket 'emotion-jar-memories' in batch
    
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
                    Bucket='emotion-jar-memories',
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
        # Validate user exists in users table
        table = dynamodb.Table('users')
        user_response = table.get_item(Key={'user_id': user_data.user_id})
        
        if 'Item' not in user_response:
            raise HTTPException(status_code=401, detail="Invalid user session")
        
        user_id = user_data.user_id
        journal_entries = {}
        
        # Fetch data for each emotion bucket
        for emotion in VALID_EMOTIONS:
            try:
                # List all objects in the emotion/user_id/ prefix
                prefix = f"{emotion}/{user_id}/"
                
                response = s3_client.list_objects_v2(
                    Bucket='emotion-jar-memories',
                    Prefix=prefix
                )
                
                # If objects exist, fetch and parse each one
                if 'Contents' in response:
                    for obj in response['Contents']:
                        try:
                            # Get the object content
                            obj_response = s3_client.get_object(
                                Bucket='emotion-jar-memories',
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
        if "Invalid user session" in str(e):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch emotions from S3: {str(e)}"
        )

@app.post("/register")
async def register_user(user_data: UserRegistration):
    """
    Register a new user and store in DynamoDB users table
    """
    print(f"Received registration data: {user_data}")
    print(f"Email: {user_data.email}, Name: {user_data.name}, Phone: {user_data.phone}")
    
    try:
        # Validate required fields
        if not user_data.email or not user_data.password or not user_data.name or not user_data.phone:
            raise HTTPException(status_code=400, detail="Missing required fields: email, password, name, and phone are required")
        
        table = dynamodb.Table('users')
        print(f"Connected to DynamoDB table: {table.table_name}")
        
        # Check if user already exists by scanning for email
        print("Checking if user already exists...")
        response = table.scan(
            FilterExpression=Attr('email').eq(user_data.email)
        )
        
        if response['Items']:
            print(f"User with email {user_data.email} already exists")
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Generate user ID
        user_id = f"user_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"Generated user_id: {user_id}")
        
        # Hash password (basic - use bcrypt in production)
        password_hash = hashlib.sha256(user_data.password.encode()).hexdigest()
        
        # Store user in DynamoDB with proper structure
        timestamp = datetime.now().isoformat()
        user_item = {
            'user_id': user_id,
            'timestamp': timestamp,  # Sort key
            'email': user_data.email,
            'password': password_hash,
            'name': user_data.name,
            'phone': user_data.phone,
            'emergency_contact_name': user_data.emergency_contact_name,
            'emergency_contact_phone': user_data.emergency_contact_phone,
            'created_at': timestamp,
            'last_login': None
        }
        
        print(f"Storing user item: {user_item}")
        table.put_item(Item=user_item)
        print("User stored successfully in DynamoDB")
        
        return {
            "success": True,
            "message": "User registered successfully",
            "user_id": user_id
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (like user already exists)
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/login")
async def login_user(login_data: UserLogin):
    """
    Authenticate user and return profile details from users table
    """
    try:
        table = dynamodb.Table('users')
        
        # Query by email
        response = table.scan(
            FilterExpression=Attr('email').eq(login_data.email)
        )
        
        if not response['Items']:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user = response['Items'][0]
        
        # Verify password
        password_hash = hashlib.sha256(login_data.password.encode()).hexdigest()
        if user.get('password') != password_hash:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Update last login (need both user_id and timestamp for composite key)
        table.update_item(
            Key={'user_id': user['user_id'], 'timestamp': user['timestamp']},
            UpdateExpression='SET last_login = :timestamp',
            ExpressionAttributeValues={':timestamp': datetime.now().isoformat()}
        )
        
        return {
            "user_id": user['user_id'],
            "email": user['email'],
            "name": user['name'],
            "phone": user['phone'],
            "emergency_contact_name": user.get('emergency_contact_name'),
            "emergency_contact_phone": user.get('emergency_contact_phone'),
            "last_login": datetime.now().isoformat()
        }
        
    except Exception as e:
        if "Invalid credentials" in str(e):
            raise e
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@app.get("/profile/{user_id}")
async def get_user_profile(user_id: str):
    """
    Get user profile details from DynamoDB users table
    """
    try:
        table = dynamodb.Table('users')
        
        # Query by user_id (partition key) - need to use Key instead of Attr for KeyConditionExpression
        from boto3.dynamodb.conditions import Key
        response = table.query(
            KeyConditionExpression=Key('user_id').eq(user_id)
        )
        
        if not response['Items']:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get the most recent user record (highest timestamp)
        user = max(response['Items'], key=lambda x: x['timestamp'])
        
        return {
            "user_id": user['user_id'],
            "email": user['email'],
            "name": user['name'],
            "phone": user['phone'],
            "emergency_contact_name": user.get('emergency_contact_name'),
            "emergency_contact_phone": user.get('emergency_contact_phone'),
            "created_at": user.get('created_at'),
            "last_login": user.get('last_login')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Profile fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")
