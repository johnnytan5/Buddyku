#!/bin/bash

# Suicide Detection API - EC2 Deployment Script
# Usage: ./deploy.sh your-ec2-ip your-key.pem

set -e

EC2_IP=$1
KEY_FILE=$2

if [ -z "$EC2_IP" ] || [ -z "$KEY_FILE" ]; then
    echo "Usage: ./deploy.sh your-ec2-ip your-key.pem"
    echo "Example: ./deploy.sh 3.15.123.45 my-key.pem"
    exit 1
fi

echo "🚀 Deploying Suicide Detection API to EC2..."

# Step 1: Upload code to EC2
echo "📦 Uploading code to EC2..."
scp -i $KEY_FILE -r . ubuntu@$EC2_IP:~/Buddyku

# Step 2: Install Docker on EC2
echo "🐳 Installing Docker on EC2..."
ssh -i $KEY_FILE ubuntu@$EC2_IP << 'EOF'
    # Update system
    sudo apt update && sudo apt upgrade -y
    
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    
    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Install AWS CLI
    sudo apt install awscli -y
EOF

# Step 3: Deploy application
echo "🚀 Deploying application..."
ssh -i $KEY_FILE ubuntu@$EC2_IP << 'EOF'
    cd ~/Buddyku
    
    # Make sure we're in the right directory
    ls -la
    
    # Check if model files exist
    if [ ! -f "backend/notebook/suicide_mood_model.keras" ]; then
        echo "⚠️  Warning: Model files not found. Please ensure they are uploaded."
    fi
    
    # Build and run with Docker Compose
    docker compose up --build -d
    
    # Wait a moment for services to start
    sleep 10
    
    # Check if services are running
    docker compose ps
    
    # Test the API
    echo "🧪 Testing API..."
    curl -f http://localhost:8000/health || echo "❌ API health check failed"
EOF

echo "✅ Deployment complete!"
echo "🌐 Your API should be available at: http://$EC2_IP:8000"
echo "📚 API docs: http://$EC2_IP:8000/docs"
echo "❤️  Health check: http://$EC2_IP:8000/health"

# Test the deployment
echo "🧪 Testing deployment..."
curl -f http://$EC2_IP:8000/health && echo "✅ API is responding!" || echo "❌ API is not responding"

echo ""
echo "🎉 Deployment Summary:"
echo "   - API URL: http://$EC2_IP:8000"
echo "   - Health: http://$EC2_IP:8000/health"
echo "   - Docs: http://$EC2_IP:8000/docs"
echo ""
echo "📝 Next steps:"
echo "   1. Configure your security groups to allow traffic on port 8000"
echo "   2. Set up a domain name (optional)"
echo "   3. Configure SSL certificate (optional)"
echo "   4. Set up monitoring and backups"
