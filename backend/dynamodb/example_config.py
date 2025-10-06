"""
Example configuration for DynamoDB client
"""
import os
from .dynamodb_client import DynamoDBClient

# Example configuration
def create_dynamodb_client():
    """
    Create DynamoDB client with environment variables or hardcoded values
    """
    # Option 1: Using environment variables (recommended)
    db_client = DynamoDBClient(
        region_name=os.getenv('AWS_REGION', 'ap-southeast-1'),
        table_name=os.getenv('AWS_DYNAMODB_TABLE', 'your-table-name')
    )
    
    # Option 2: Using hardcoded values (not recommended for production)
    # db_client = DynamoDBClient(
    #     aws_access_key_id='your-access-key',
    #     aws_secret_access_key='your-secret-key',
    #     region_name='ap-southeast-1',
    #     table_name='your-table-name'
    # )
    
    return db_client

# Example usage
if __name__ == "__main__":
    db = create_dynamodb_client()
    


