#!/bin/bash

# EC2 Deployment Script for Buddyku API
# This script deploys the application to EC2 with proper configuration

set -e  # Exit on any error

echo "🚀 Starting EC2 deployment for Buddyku API..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're on EC2
if [ ! -f /sys/hypervisor/uuid ] || [ ! -f /sys/devices/virtual/dmi/id/product_uuid ]; then
    print_warning "This script is designed to run on EC2. Make sure you're on your EC2 instance."
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update -y

# Install Docker
print_status "Installing Docker..."
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ubuntu

# Fix Docker permissions
print_status "Fixing Docker permissions..."
sudo chmod 666 /var/run/docker.sock
sudo systemctl restart docker

# Install Docker Compose
print_status "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Test Docker permissions
print_status "Testing Docker permissions..."
if docker ps > /dev/null 2>&1; then
    print_status "✅ Docker permissions are working"
else
    print_warning "⚠️ Docker permissions issue detected. Trying to fix..."
    sudo chmod 666 /var/run/docker.sock
    sudo systemctl restart docker
    sleep 5
    
    if docker ps > /dev/null 2>&1; then
        print_status "✅ Docker permissions fixed"
    else
        print_error "❌ Docker permissions still not working. You may need to log out and back in."
        print_status "Trying to continue anyway..."
    fi
fi

# Create application directory
print_status "Setting up application directory..."
APP_DIR="/home/ubuntu/buddyku"
sudo mkdir -p $APP_DIR
sudo chown ubuntu:ubuntu $APP_DIR

# Copy application files (assuming you've uploaded them)
print_status "Copying application files..."
# Note: You'll need to upload your files to EC2 first
# You can use scp, rsync, or git clone

# Set up environment
print_status "Setting up environment..."
cd $APP_DIR

# Create .env file for production
cat > .env << EOF
# Production environment variables
PYTHONPATH=/app
ENVIRONMENT=production
LOG_LEVEL=info
EOF

# Set proper permissions
chmod +x deploy.sh
chmod +x backend/start.sh

# Build and start the application
print_status "Building Docker image..."
docker-compose build --no-cache

print_status "Starting application..."
docker-compose up -d

# Wait for application to start
print_status "Waiting for application to start..."
sleep 30

# Check if application is running
print_status "Checking application status..."
if curl -f http://localhost:8000/health; then
    print_status "✅ Application is running successfully!"
    print_status "Health check passed"
else
    print_error "❌ Application failed to start"
    print_status "Checking logs..."
    docker-compose logs backend
    exit 1
fi

# Show running containers
print_status "Running containers:"
docker ps

# Show resource usage
print_status "Resource usage:"
docker stats --no-stream

# Set up auto-restart on boot
print_status "Setting up auto-restart on boot..."
sudo tee /etc/systemd/system/buddyku.service > /dev/null << EOF
[Unit]
Description=Buddyku API Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable buddyku.service

print_status "✅ Deployment completed successfully!"
print_status "Application is running on http://localhost:8000"
print_status "Health check: http://localhost:8000/health"
print_status "API docs: http://localhost:8000/docs"

# Show useful commands
echo ""
print_status "Useful commands:"
echo "  View logs: docker-compose logs -f backend"
echo "  Restart: docker-compose restart backend"
echo "  Stop: docker-compose down"
echo "  Start: docker-compose up -d"
echo "  Check status: docker-compose ps"
echo "  Monitor resources: docker stats"
