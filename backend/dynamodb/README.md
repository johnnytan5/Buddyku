# DynamoDB API Client

This module provides a Python client for AWS DynamoDB operations.

## Features

- Put items into DynamoDB
- Get items from DynamoDB
- Update items in DynamoDB
- Delete items from DynamoDB
- Query items with conditions
- Scan items with filters
- Batch write operations

## Usage

```python
from dynamodb.dynamodb_client import DynamoDBClient

# Initialize client
db = DynamoDBClient(
    region_name='ap-southeast-1',
    table_name='your-table-name'
)

# Put an item
item = {
    'user_id': '123',
    'email': 'user@example.com',
    'name': 'John Doe',
    'created_at': '2024-01-01T00:00:00Z'
}
db.put_item(item)

# Get an item
retrieved_item = db.get_item({'user_id': '123'})
print(retrieved_item)

# Update an item
db.update_item(
    key={'user_id': '123'},
    update_expression='SET #name = :name',
    expression_attribute_values={':name': 'Jane Doe'},
    expression_attribute_names={'#name': 'name'}
)

# Query items
items = db.query_items(
    key_condition_expression='user_id = :user_id',
    expression_attribute_values={':user_id': '123'}
)
print(items)

# Scan items
all_items = db.scan_items()
print(all_items)
```

## Environment Variables

Set these environment variables for configuration:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_REGION`: AWS region (default: ap-southeast-1)
- `AWS_DYNAMODB_TABLE`: Default DynamoDB table name

## Dependencies

- boto3 (already included in requirements.txt)



