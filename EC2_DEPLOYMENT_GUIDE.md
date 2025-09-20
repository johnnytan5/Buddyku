# 🚀 Deploy Your Suicide Detection API to AWS EC2

## Prerequisites
- AWS Account
- AWS CLI installed locally
- Docker installed locally
- Your model files ready

## Method 1: Direct Docker Deployment (Recommended)

### Step 1: Launch EC2 Instance

1. **Go to AWS Console → EC2**
2. **Launch Instance:**
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance Type**: t3.medium (2 vCPU, 4GB RAM) or larger
   - **Key Pair**: Create new or use existing
   - **Security Group**: Create with these rules:
     - SSH (22) - Your IP
     - HTTP (80) - 0.0.0.0/0
     - HTTPS (443) - 0.0.0.0/0
     - Custom TCP (8000) - 0.0.0.0/0

### Step 2: Connect to EC2 Instance

```bash
# Connect via SSH
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y
```

### Step 3: Install Docker on EC2

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply group changes
exit
```

### Step 4: Upload Your Code

**Option A: Using SCP (from your local machine)**
```bash
# From your local machine
scp -i your-key.pem -r /Users/johnnytan/Documents/Buddyku ubuntu@your-ec2-ip:~/
```

**Option B: Using Git (on EC2)**
```bash
# On EC2 instance
git clone https://github.com/yourusername/Buddyku.git
cd Buddyku
```

### Step 5: Deploy Your Application

```bash
# On EC2 instance
cd Buddyku

# Make sure model files are present
ls -la backend/notebook/

# Build and run with Docker Compose
docker compose up --build -d

# Check if it's running
docker compose ps
docker compose logs
```

### Step 6: Test Your API

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test from outside (replace with your EC2 IP)
curl http://your-ec2-ip:8000/health
```

## Method 2: Using Docker Registry (Advanced)

### Step 1: Build and Push to Docker Hub

```bash
# On your local machine
# Login to Docker Hub
docker login

# Build your image
docker build -t yourusername/suicide-detection-api ./backend

# Push to Docker Hub
docker push yourusername/suicide-detection-api
```

### Step 2: Pull and Run on EC2

```bash
# On EC2 instance
docker pull yourusername/suicide-detection-api
docker run -d -p 8000:8000 -v $(pwd)/models:/app/notebook yourusername/suicide-detection-api
```

## Method 3: Using AWS ECS (Most Scalable)

### Step 1: Create ECS Cluster
1. Go to AWS Console → ECS
2. Create Cluster → EC2 Launch Type
3. Configure your EC2 instance as ECS instance

### Step 2: Create Task Definition
```json
{
  "family": "suicide-detection-api",
  "networkMode": "bridge",
  "requiresCompatibilities": ["EC2"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "suicide-detection-api",
      "image": "yourusername/suicide-detection-api",
      "portMappings": [
        {
          "containerPort": 8000,
          "hostPort": 8000
        }
      ],
      "essential": true
    }
  ]
}
```

## Production Setup with Nginx

### Step 1: Create Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    build: ./backend
    restart: unless-stopped
    volumes:
      - ./backend/notebook:/app/notebook
    environment:
      - PYTHONPATH=/app

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    restart: unless-stopped
```

### Step 2: Production Nginx Config

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Monitoring and Maintenance

### Health Checks
```bash
# Check container health
docker ps
docker logs suicide-detection-api

# Monitor resource usage
docker stats
```

### Auto-restart on Failure
```bash
# Add to crontab for auto-restart
crontab -e

# Add this line to restart every 5 minutes if down
*/5 * * * * docker compose -f /home/ubuntu/Buddyku/docker-compose.yml up -d
```

### Backup Strategy
```bash
# Backup your models
tar -czf models-backup-$(date +%Y%m%d).tar.gz backend/notebook/

# Upload to S3
aws s3 cp models-backup-$(date +%Y%m%d).tar.gz s3://your-backup-bucket/
```

## Cost Optimization

### EC2 Instance Types
- **t3.medium**: $0.0416/hour (~$30/month) - Good for development
- **t3.large**: $0.0832/hour (~$60/month) - Good for production
- **c5.large**: $0.085/hour (~$61/month) - CPU optimized

### Auto Scaling
```bash
# Create auto-scaling group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name suicide-detection-asg \
  --launch-template LaunchTemplateName=suicide-detection-template \
  --min-size 1 \
  --max-size 5 \
  --desired-capacity 2
```

## Security Best Practices

1. **Use IAM Roles** instead of access keys
2. **Enable VPC** for network isolation
3. **Use Application Load Balancer** for SSL termination
4. **Regular security updates**
5. **Monitor with CloudWatch**

## Troubleshooting

### Common Issues
```bash
# Container won't start
docker logs container_name

# Port already in use
sudo netstat -tulpn | grep :8000
sudo kill -9 PID

# Out of memory
docker system prune -a
free -h
```

### Performance Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor Docker
docker system df
docker system events
```

## Your Deployment Checklist

- [ ] EC2 instance launched
- [ ] Docker installed on EC2
- [ ] Code uploaded to EC2
- [ ] Model files in correct location
- [ ] Security groups configured
- [ ] Application running
- [ ] Health check passing
- [ ] Domain configured (optional)
- [ ] SSL certificate installed (optional)
- [ ] Monitoring set up
- [ ] Backup strategy implemented
