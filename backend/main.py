from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
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
class EmotionUpload(BaseModel):
    user_id: str
    emotion: Literal["belonging", "calm", "comfort", "disappointment", 
                    "gratitude", "hope", "joy", "love", "sadness", "strength"]
    text: str

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
    allow_origins=["http://localhost:3000"],
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

@app.post("/uploadEmotionsS3")
async def upload_emotions_s3(emotion_data: EmotionUpload):
    """
    Upload emotion data to S3 bucket 'emotion-jar-memory'
    
    Parameters:
    - user_id: User identifier
    - emotion: One of the 10 valid emotions
    - text: The text content to store
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
        
        # Create the data structure to upload
        upload_data = {
            "user_id": emotion_data.user_id,
            "emotion": emotion_data.emotion,
            "text": emotion_data.text,
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
