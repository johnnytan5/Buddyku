#!/bin/bash

# Upload script to transfer files to EC2
# Pre-configured for your EC2 instance

set -e

# Your EC2 instance details
EC2_IP="13.229.59.23"
EC2_KEY="/Users/johnnytan/Downloads/mood-detection-v2.pem"
EC2_USER="ubuntu"

echo "🚀 Uploading Buddyku to EC2..."

# Create a temporary directory with only necessary files
TEMP_DIR="buddyku-ec2"
mkdir -p $TEMP_DIR

# Copy necessary files
echo "📁 Copying application files..."
cp -r backend $TEMP_DIR/
cp docker-compose.yml $TEMP_DIR/
cp nginx.conf $TEMP_DIR/
cp deploy-ec2.sh $TEMP_DIR/
cp deploy.sh $TEMP_DIR/

# Create a simple .gitignore for EC2
cat > $TEMP_DIR/.gitignore << EOF
# EC2 specific ignores
*.log
.env
venv/
__pycache__/
*.pyc
EOF

# Upload to EC2
echo "📤 Uploading files to EC2..."
rsync -avz -e "ssh -i $EC2_KEY" $TEMP_DIR/ $EC2_USER@$EC2_IP:/home/ubuntu/buddyku/

# Clean up
rm -rf $TEMP_DIR

echo "✅ Upload completed!"
echo "Now SSH into your EC2 instance and run:"
echo "  ssh -i $EC2_KEY $EC2_USER@$EC2_IP"
echo "  cd /home/ubuntu/buddyku"
echo "  chmod +x deploy-ec2.sh"
echo "  ./deploy-ec2.sh"
