# S3 API Client

This module provides a Python client for AWS S3 operations.

## Features

- Upload files to S3
- Download files from S3
- Delete files from S3
- List files in S3 bucket
- Generate presigned URLs
- Check file existence

## Usage

```python
from s3.s3_client import S3Client

# Initialize client
s3 = S3Client(
    region_name='ap-southeast-1',
    bucket_name='your-bucket-name'
)

# Upload a file
s3.upload_file('local_file.txt', 'uploads/local_file.txt')

# Download a file
s3.download_file('uploads/local_file.txt', 'downloaded_file.txt')

# List files
files = s3.list_files('uploads/')
print(files)

# Generate presigned URL
url = s3.get_presigned_url('uploads/file.txt', expiration=3600)
print(url)
```

## Environment Variables

Set these environment variables for configuration:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_REGION`: AWS region (default: ap-southeast-1)
- `AWS_S3_BUCKET`: Default S3 bucket name

## Dependencies

- boto3 (already included in requirements.txt)



