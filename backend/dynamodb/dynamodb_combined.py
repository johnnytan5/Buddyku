"""
DynamoDB Combined Router and Client for user-related database operations
"""
import boto3
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from botocore.exceptions import ClientError, NoCredentialsError
import logging
from decimal import Decimal
import json
import hashlib
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter()

# Pydantic models
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

class DynamoDBClient:
    def __init__(self, 
                 aws_access_key_id: Optional[str] = None,
                 aws_secret_access_key: Optional[str] = None,
                 region_name: str = "ap-southeast-1",
                 table_name: Optional[str] = None):
        """
        Initialize DynamoDB client
        
        Args:
            aws_access_key_id: AWS access key (optional, can use environment variables)
            aws_secret_access_key: AWS secret key (optional, can use environment variables)
            region_name: AWS region
            table_name: Default table name for operations
        """
        self.region_name = region_name
        self.table_name = table_name or os.getenv('AWS_DYNAMODB_TABLE')
        
        try:
            # Initialize DynamoDB client
            if aws_access_key_id and aws_secret_access_key:
                self.dynamodb = boto3.resource(
                    'dynamodb',
                    aws_access_key_id=aws_access_key_id,
                    aws_secret_access_key=aws_secret_access_key,
                    region_name=region_name
                )
            else:
                # Use default credential chain (environment variables, IAM roles, etc.)
                self.dynamodb = boto3.resource('dynamodb', region_name=region_name)
                
            logger.info(f"DynamoDB client initialized for region: {region_name}")
            
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize DynamoDB client: {str(e)}")
            raise

    def _convert_decimals(self, obj):
        """Convert Decimal objects to regular numbers for JSON serialization"""
        if isinstance(obj, list):
            return [self._convert_decimals(i) for i in obj]
        elif isinstance(obj, dict):
            return {k: self._convert_decimals(v) for k, v in obj.items()}
        elif isinstance(obj, Decimal):
            return float(obj) if obj % 1 != 0 else int(obj)
        else:
            return obj

    def put_item(self, 
                item: Dict[str, Any], 
                table_name: Optional[str] = None) -> bool:
        """
        Put an item into DynamoDB table
        
        Args:
            item: Dictionary representing the item to store
            table_name: DynamoDB table name (optional, uses default if not provided)
            
        Returns:
            bool: True if successful, False otherwise
        """
        table = table_name or self.table_name
        if not table:
            logger.error("No table name provided")
            return False
            
        try:
            table_resource = self.dynamodb.Table(table)
            table_resource.put_item(Item=item)
            logger.info(f"Successfully put item in table {table}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to put item: {str(e)}")
            return False

    def get_item(self, 
                key: Dict[str, Any], 
                table_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get an item from DynamoDB table
        
        Args:
            key: Dictionary with primary key attributes
            table_name: DynamoDB table name (optional, uses default if not provided)
            
        Returns:
            dict: Item data or None if not found
        """
        table = table_name or self.table_name
        if not table:
            logger.error("No table name provided")
            return None
            
        try:
            table_resource = self.dynamodb.Table(table)
            response = table_resource.get_item(Key=key)
            
            if 'Item' in response:
                item = self._convert_decimals(response['Item'])
                logger.info(f"Successfully retrieved item from table {table}")
                return item
            else:
                logger.info(f"No item found with key {key}")
                return None
                
        except ClientError as e:
            logger.error(f"Failed to get item: {str(e)}")
            return None

    def update_item(self, 
                   key: Dict[str, Any], 
                   update_expression: str,
                   expression_attribute_values: Dict[str, Any],
                   expression_attribute_names: Optional[Dict[str, str]] = None,
                   table_name: Optional[str] = None) -> bool:
        """
        Update an item in DynamoDB table
        
        Args:
            key: Dictionary with primary key attributes
            update_expression: Update expression (e.g., "SET #attr = :val")
            expression_attribute_values: Values for the update expression
            expression_attribute_names: Attribute name mappings (for reserved words)
            table_name: DynamoDB table name (optional, uses default if not provided)
            
        Returns:
            bool: True if successful, False otherwise
        """
        table = table_name or self.table_name
        if not table:
            logger.error("No table name provided")
            return False
            
        try:
            table_resource = self.dynamodb.Table(table)
            
            update_kwargs = {
                'Key': key,
                'UpdateExpression': update_expression,
                'ExpressionAttributeValues': expression_attribute_values
            }
            
            if expression_attribute_names:
                update_kwargs['ExpressionAttributeNames'] = expression_attribute_names
                
            table_resource.update_item(**update_kwargs)
            logger.info(f"Successfully updated item in table {table}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to update item: {str(e)}")
            return False

    def delete_item(self, 
                   key: Dict[str, Any], 
                   table_name: Optional[str] = None) -> bool:
        """
        Delete an item from DynamoDB table
        
        Args:
            key: Dictionary with primary key attributes
            table_name: DynamoDB table name (optional, uses default if not provided)
            
        Returns:
            bool: True if successful, False otherwise
        """
        table = table_name or self.table_name
        if not table:
            logger.error("No table name provided")
            return False
            
        try:
            table_resource = self.dynamodb.Table(table)
            table_resource.delete_item(Key=key)
            logger.info(f"Successfully deleted item from table {table}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete item: {str(e)}")
            return False

    def query_items(self, 
                   key_condition_expression: str,
                   expression_attribute_values: Dict[str, Any],
                   expression_attribute_names: Optional[Dict[str, str]] = None,
                   filter_expression: Optional[str] = None,
                   index_name: Optional[str] = None,
                   limit: Optional[int] = None,
                   table_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Query items from DynamoDB table
        
        Args:
            key_condition_expression: Key condition expression
            expression_attribute_values: Values for the query expression
            expression_attribute_names: Attribute name mappings (for reserved words)
            filter_expression: Optional filter expression
            index_name: GSI or LSI name to query
            limit: Maximum number of items to return
            table_name: DynamoDB table name (optional, uses default if not provided)
            
        Returns:
            list: List of items matching the query
        """
        table = table_name or self.table_name
        if not table:
            logger.error("No table name provided")
            return []
            
        try:
            table_resource = self.dynamodb.Table(table)
            
            query_kwargs = {
                'KeyConditionExpression': key_condition_expression,
                'ExpressionAttributeValues': expression_attribute_values
            }
            
            if expression_attribute_names:
                query_kwargs['ExpressionAttributeNames'] = expression_attribute_names
            if filter_expression:
                query_kwargs['FilterExpression'] = filter_expression
            if index_name:
                query_kwargs['IndexName'] = index_name
            if limit:
                query_kwargs['Limit'] = limit
                
            response = table_resource.query(**query_kwargs)
            
            items = self._convert_decimals(response.get('Items', []))
            logger.info(f"Query returned {len(items)} items from table {table}")
            return items
            
        except ClientError as e:
            logger.error(f"Failed to query items: {str(e)}")
            return []

    def scan_items(self, 
                  filter_expression: Optional[str] = None,
                  expression_attribute_values: Optional[Dict[str, Any]] = None,
                  expression_attribute_names: Optional[Dict[str, str]] = None,
                  limit: Optional[int] = None,
                  table_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Scan items from DynamoDB table
        
        Args:
            filter_expression: Filter expression
            expression_attribute_values: Values for the filter expression
            expression_attribute_names: Attribute name mappings (for reserved words)
            limit: Maximum number of items to return
            table_name: DynamoDB table name (optional, uses default if not provided)
            
        Returns:
            list: List of items from the scan
        """
        table = table_name or self.table_name
        if not table:
            logger.error("No table name provided")
            return []
            
        try:
            table_resource = self.dynamodb.Table(table)
            
            scan_kwargs = {}
            
            if filter_expression:
                scan_kwargs['FilterExpression'] = filter_expression
            if expression_attribute_values:
                scan_kwargs['ExpressionAttributeValues'] = expression_attribute_values
            if expression_attribute_names:
                scan_kwargs['ExpressionAttributeNames'] = expression_attribute_names
            if limit:
                scan_kwargs['Limit'] = limit
                
            response = table_resource.scan(**scan_kwargs)
            
            items = self._convert_decimals(response.get('Items', []))
            logger.info(f"Scan returned {len(items)} items from table {table}")
            return items
            
        except ClientError as e:
            logger.error(f"Failed to scan items: {str(e)}")
            return []

    def batch_write_items(self, 
                         items: List[Dict[str, Any]], 
                         table_name: Optional[str] = None) -> bool:
        """
        Batch write items to DynamoDB table
        
        Args:
            items: List of items to write
            table_name: DynamoDB table name (optional, uses default if not provided)
            
        Returns:
            bool: True if successful, False otherwise
        """
        table = table_name or self.table_name
        if not table:
            logger.error("No table name provided")
            return False
            
        try:
            table_resource = self.dynamodb.Table(table)
            
            # Process items in batches of 25 (DynamoDB limit)
            for i in range(0, len(items), 25):
                batch = items[i:i+25]
                
                with table_resource.batch_writer() as batch_writer:
                    for item in batch:
                        batch_writer.put_item(Item=item)
                        
            logger.info(f"Successfully batch wrote {len(items)} items to table {table}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to batch write items: {str(e)}")
            return False

# Initialize DynamoDB client with proper credentials
try:
    db_client = DynamoDBClient(
        aws_access_key_id=os.getenv('S3_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('S3_SECRET_ACCESS_KEY'),
        region_name=os.getenv('S3_REGION', 'ap-southeast-1'),
        table_name=os.getenv('AWS_DYNAMODB_TABLE', 'users')
    )
    print("Using real DynamoDB client with AWS credentials")
    
except Exception as e:
    print(f"Failed to initialize DynamoDB client: {e}")
    print("Please configure AWS credentials in your .env file")
    raise e

@router.post("/register")
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
        
        print(f"Connected to DynamoDB table: users")
        
        # Check if user already exists by scanning for email
        print("Checking if user already exists...")
        existing_users = db_client.scan_items(
            filter_expression='email = :email',
            expression_attribute_values={':email': user_data.email},
            table_name='users'
        )
        
        if existing_users:
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
            'last_login': None,
        }
        
        print(f"Storing user item: {user_item}")
        success = db_client.put_item(user_item, table_name='users')
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store user in database")
            
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

@router.post("/login")
async def login_user(login_data: UserLogin):
    """
    Authenticate user and return profile details from users table
    """
    try:
        # Query by email
        users = db_client.scan_items(
            filter_expression='email = :email',
            expression_attribute_values={':email': login_data.email},
            table_name='users'
        )
        
        if not users:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user = users[0]
        
        # Verify password
        password_hash = hashlib.sha256(login_data.password.encode()).hexdigest()
        if user.get('password') != password_hash:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Update last login
        success = db_client.update_item(
            key={'user_id': user['user_id'], 'timestamp': user['timestamp']},
            update_expression='SET last_login = :timestamp',
            expression_attribute_values={':timestamp': datetime.now().isoformat()},
            table_name='users'
        )
        
        if not success:
            print("Warning: Failed to update last login timestamp")
        
        return {
            "user_id": user['user_id'],
            "email": user['email'],
            "name": user['name'],
            "phone": user['phone'],
            "emergency_contact_name": user.get('emergency_contact_name'),
            "emergency_contact_phone": user.get('emergency_contact_phone'),
            "last_login": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if "Invalid credentials" in str(e):
            raise e
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@router.get("/profile/{user_id}")
async def get_user_profile(user_id: str):
    """
    Get user profile details from DynamoDB users table
    """
    try:
        # Query by user_id (partition key)
        users = db_client.query_items(
            key_condition_expression='user_id = :user_id',
            expression_attribute_values={':user_id': user_id},
            table_name='users'
        )
        
        if not users:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get the most recent user record (highest timestamp)
        user = max(users, key=lambda x: x['timestamp'])
        
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

@router.put("/profile/{user_id}")
async def update_user_profile(user_id: str, profile_data: UserProfile):
    """
    Update user profile in DynamoDB
    """
    try:
        # First, get the current user record
        users = db_client.query_items(
            key_condition_expression='user_id = :user_id',
            expression_attribute_values={':user_id': user_id},
            table_name='users'
        )
        
        if not users:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get the most recent user record
        user = max(users, key=lambda x: x['timestamp'])
        
        # Update the user record
        success = db_client.update_item(
            key={'user_id': user['user_id'], 'timestamp': user['timestamp']},
            update_expression='SET #name = :name, phone = :phone, emergency_contact_name = :emergency_contact_name, emergency_contact_phone = :emergency_contact_phone',
            expression_attribute_values={
                ':name': profile_data.name,
                ':phone': profile_data.phone,
                ':emergency_contact_name': profile_data.emergency_contact_name,
                ':emergency_contact_phone': profile_data.emergency_contact_phone
            },
            expression_attribute_names={'#name': 'name'},
            table_name='users'
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        return {
            "success": True,
            "message": "Profile updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Profile update error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

@router.delete("/profile/{user_id}")
async def delete_user_profile(user_id: str):
    """
    Delete user profile from DynamoDB
    """
    try:
        # First, get all user records for this user_id
        users = db_client.query_items(
            key_condition_expression='user_id = :user_id',
            expression_attribute_values={':user_id': user_id},
            table_name='users'
        )
        
        if not users:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete all user records (in case there are multiple timestamps)
        success_count = 0
        for user in users:
            success = db_client.delete_item(
                key={'user_id': user['user_id'], 'timestamp': user['timestamp']},
                table_name='users'
            )
            if success:
                success_count += 1
        
        if success_count == 0:
            raise HTTPException(status_code=500, detail="Failed to delete user profile")
        
        return {
            "success": True,
            "message": f"User profile deleted successfully ({success_count} records removed)"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Profile deletion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete profile: {str(e)}")


# Example usage
if __name__ == "__main__":
    # Initialize DynamoDB client
    db = DynamoDBClient()
    
    # Example operations
    # item = {
    #     'user_id': '123',
    #     'email': 'user@example.com',
    #     'name': 'John Doe',
    #     'created_at': '2024-01-01T00:00:00Z'
    # }
    # 
    # # Put item
    # db.put_item(item)
    # 
    # # Get item
    # retrieved_item = db.get_item({'user_id': '123'})
    # print(retrieved_item)
    # 
    # # Query items
    # items = db.query_items(
    #     key_condition_expression='user_id = :user_id',
    #     expression_attribute_values={':user_id': '123'}
    # )
    # print(items)
