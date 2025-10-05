"""
S3 Combined Router and Client for emotion-related S3 operations
"""
import boto3
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Literal
from botocore.exceptions import ClientError, NoCredentialsError
import logging
import json
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter()

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

class S3Client:
    def __init__(self, 
                 aws_access_key_id: Optional[str] = None,
                 aws_secret_access_key: Optional[str] = None,
                 region_name: str = "ap-southeast-1",
                 bucket_name: Optional[str] = None):
        """
        Initialize S3 client
        
        Args:
            aws_access_key_id: AWS access key (optional, can use environment variables)
            aws_secret_access_key: AWS secret key (optional, can use environment variables)
            region_name: AWS region
            bucket_name: Default bucket name for operations
        """
        self.region_name = region_name
        self.bucket_name = bucket_name or os.getenv('AWS_S3_BUCKET')
        
        try:
            # Initialize S3 client
            if aws_access_key_id and aws_secret_access_key:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=aws_access_key_id,
                    aws_secret_access_key=aws_secret_access_key,
                    region_name=region_name
                )
            else:
                # Use default credential chain (environment variables, IAM roles, etc.)
                self.s3_client = boto3.client('s3', region_name=region_name)
                
            logger.info(f"S3 client initialized for region: {region_name}")
            
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {str(e)}")
            raise

    def upload_file(self, 
                   local_file_path: str, 
                   s3_key: str, 
                   bucket_name: Optional[str] = None,
                   extra_args: Optional[Dict[str, Any]] = None) -> bool:
        """
        Upload a file to S3
        
        Args:
            local_file_path: Path to local file
            s3_key: S3 object key (file path in bucket)
            bucket_name: S3 bucket name (optional, uses default if not provided)
            extra_args: Additional arguments for upload (e.g., metadata, content type)
            
        Returns:
            bool: True if successful, False otherwise
        """
        bucket = bucket_name or self.bucket_name
        if not bucket:
            logger.error("No bucket name provided")
            return False
            
        try:
            self.s3_client.upload_file(
                local_file_path, 
                bucket, 
                s3_key,
                ExtraArgs=extra_args or {}
            )
            logger.info(f"Successfully uploaded {local_file_path} to s3://{bucket}/{s3_key}")
            return True
            
        except FileNotFoundError:
            logger.error(f"File not found: {local_file_path}")
            return False
        except ClientError as e:
            logger.error(f"Failed to upload file: {str(e)}")
            return False

    def download_file(self, 
                     s3_key: str, 
                     local_file_path: str, 
                     bucket_name: Optional[str] = None) -> bool:
        """
        Download a file from S3
        
        Args:
            s3_key: S3 object key
            local_file_path: Local path to save the file
            bucket_name: S3 bucket name (optional, uses default if not provided)
            
        Returns:
            bool: True if successful, False otherwise
        """
        bucket = bucket_name or self.bucket_name
        if not bucket:
            logger.error("No bucket name provided")
            return False
            
        try:
            self.s3_client.download_file(bucket, s3_key, local_file_path)
            logger.info(f"Successfully downloaded s3://{bucket}/{s3_key} to {local_file_path}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to download file: {str(e)}")
            return False

    def delete_file(self, 
                   s3_key: str, 
                   bucket_name: Optional[str] = None) -> bool:
        """
        Delete a file from S3
        
        Args:
            s3_key: S3 object key
            bucket_name: S3 bucket name (optional, uses default if not provided)
            
        Returns:
            bool: True if successful, False otherwise
        """
        bucket = bucket_name or self.bucket_name
        if not bucket:
            logger.error("No bucket name provided")
            return False
            
        try:
            self.s3_client.delete_object(Bucket=bucket, Key=s3_key)
            logger.info(f"Successfully deleted s3://{bucket}/{s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete file: {str(e)}")
            return False

    def list_files(self, 
                  prefix: str = "", 
                  bucket_name: Optional[str] = None) -> list:
        """
        List files in S3 bucket
        
        Args:
            prefix: Prefix to filter files
            bucket_name: S3 bucket name (optional, uses default if not provided)
            
        Returns:
            list: List of file keys
        """
        bucket = bucket_name or self.bucket_name
        if not bucket:
            logger.error("No bucket name provided")
            return []
            
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=bucket,
                Prefix=prefix
            )
            
            files = []
            if 'Contents' in response:
                files = [obj['Key'] for obj in response['Contents']]
                
            logger.info(f"Found {len(files)} files with prefix '{prefix}'")
            return files
            
        except ClientError as e:
            logger.error(f"Failed to list files: {str(e)}")
            return []

    def get_presigned_url(self, 
                         s3_key: str, 
                         expiration: int = 3600,
                         bucket_name: Optional[str] = None) -> Optional[str]:
        """
        Generate a presigned URL for S3 object
        
        Args:
            s3_key: S3 object key
            expiration: URL expiration time in seconds
            bucket_name: S3 bucket name (optional, uses default if not provided)
            
        Returns:
            str: Presigned URL or None if failed
        """
        bucket = bucket_name or self.bucket_name
        if not bucket:
            logger.error("No bucket name provided")
            return None
            
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': s3_key},
                ExpiresIn=expiration
            )
            logger.info(f"Generated presigned URL for s3://{bucket}/{s3_key}")
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {str(e)}")
            return None

    def file_exists(self, 
                   s3_key: str, 
                   bucket_name: Optional[str] = None) -> bool:
        """
        Check if file exists in S3
        
        Args:
            s3_key: S3 object key
            bucket_name: S3 bucket name (optional, uses default if not provided)
            
        Returns:
            bool: True if file exists, False otherwise
        """
        bucket = bucket_name or self.bucket_name
        if not bucket:
            logger.error("No bucket name provided")
            return False
            
        try:
            self.s3_client.head_object(Bucket=bucket, Key=s3_key)
            return True
            
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            logger.error(f"Error checking file existence: {str(e)}")
            return False

# Initialize S3 client with proper credentials
try:
    s3_client = S3Client(
        aws_access_key_id=os.getenv('S3_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('S3_SECRET_ACCESS_KEY'),
        region_name=os.getenv('S3_REGION', 'ap-southeast-1'),
        bucket_name=os.getenv('AWS_S3_BUCKET', 'emotion-jar-memories')
    )
    print("Using real S3 client with AWS credentials")
    
except Exception as e:
    print(f"Failed to initialize S3 client: {e}")
    print("Please configure AWS credentials in your .env file")
    raise e

@router.post("/uploadEmotionsS3")
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
        
        # Upload to S3 using the configured client
        s3_client.s3_client.put_object(
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
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload to S3: {str(e)}"
        )

@router.post("/uploadEmotionsS3-batch")
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
                
                # Upload to S3 using the configured client
                s3_client.s3_client.put_object(
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

@router.post("/fetch-all-emotions")
async def fetch_all_emotions(user_data: UserEmotionFetch):
    """
    Fetch all emotion data for a specific user and transform it into frontend-compatible format
    
    Returns data in the format expected by the frontend memory system
    """
    try:
        # Import DynamoDB client to validate user
        from dynamodb.dynamodb_combined import db_client
        
        # Validate user exists in users table
        user_response = db_client.query_items(
            key_condition_expression='user_id = :user_id',
            expression_attribute_values={':user_id': user_data.user_id},
            table_name='users'
        )
        
        if not user_response:
            raise HTTPException(status_code=401, detail="Invalid user session")
        
        user_id = user_data.user_id
        
        # Fetch actual data from S3
        journal_entries = {}
        
        # Define valid emotions to search for
        VALID_EMOTIONS = ["belonging", "calm", "comfort", "disappointment", "gratitude", "hope", "joy", "love", "sadness", "strength"]
        
        # Fetch data for each emotion bucket
        for emotion in VALID_EMOTIONS:
            try:
                # List all objects in the emotion/user_id/ prefix
                prefix = f"{emotion}/{user_id}/"
                files = s3_client.list_files(prefix=prefix, bucket_name='emotion-jar-memories')
                
                # If objects exist, fetch and parse each one
                if files:
                    for s3_key in files:
                        try:
                            # Get the object content using the configured S3 client
                            obj_response = s3_client.s3_client.get_object(
                                Bucket='emotion-jar-memories',
                                Key=s3_key
                            )
                            
                            # Parse the JSON content
                            content = obj_response['Body'].read().decode('utf-8')
                            emotion_entry = json.loads(content)
                            
                            # Use the data directly from S3 (it's already in JournalEntry format)
                            journal_entry = {
                                "user_id": emotion_entry.get('user_id', user_id),
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
                            print(f"Error reading file {s3_key}: {str(e)}")
                            continue
                            
            except Exception as e:
                # Skip emotion bucket errors, continue with others
                print(f"Error accessing emotion bucket {emotion}: {str(e)}")
                continue
        
        return {
            "user_id": user_id,
            "journal_entries": journal_entries
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if "Invalid user session" in str(e):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch emotions from S3: {str(e)}"
        )


# Example usage
if __name__ == "__main__":
    # Initialize S3 client
    s3 = S3Client()
    
    # Example operations
    # s3.upload_file("local_file.txt", "uploads/local_file.txt")
    # s3.download_file("uploads/local_file.txt", "downloaded_file.txt")
    # files = s3.list_files("uploads/")
    # print(files)
