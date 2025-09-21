# Buddyku 🌟

**Your safe space for daily reflection, guided journaling, and compassionate AI support.**

Buddyku is a full-stack mental health application that provides a supportive environment for users to track their emotions, journal their thoughts, and receive AI-powered emotional support through an empathetic chatbot companion named Ruby.

## ✨ Features

### 🤖 AI Chat Companion (Ruby)
- **Empathetic AI Support**: Ruby provides warm, supportive, and encouraging responses
- **Crisis Detection**: Advanced suicide risk detection with appropriate crisis intervention
- **Safe Space**: Non-judgmental environment for emotional expression
- **Crisis Resources**: Malaysian mental health hotlines and support contacts

### �� Journaling & Memory Management
- **Daily Journaling**: Track emotions, moods, and daily experiences
- **Memory Jar System**: Organize memories by emotions (gratitude, joy, love, etc.)
- **Media Attachments**: Support for images, videos, and audio recordings
- **Emotion Tracking**: 10 core emotions including belonging, calm, comfort, gratitude, hope, joy, love, sadness, strength

### 🎯 Mood Detection & Analysis
- **AI-Powered Mood Detection**: Analyze facial expressions and text sentiment
- **Suicide Risk Assessment**: Advanced text analysis for mental health risk detection
- **Emotional Insights**: Comprehensive emotional state tracking and analysis

### 📞 Communication Features
- **Phone Integration**: Twilio-powered calling system for crisis support
- **Video Calling**: Face-to-face communication capabilities
- **Emergency Kit**: Quick access to breathing exercises and crisis resources

## 🏗️ Architecture

### Backend (FastAPI + Python)
- **Framework**: FastAPI with Gunicorn for production
- **AI Integration**: AWS Bedrock for AI chat and analysis
- **Storage**: AWS S3 for media attachments
- **Communication**: Twilio for phone services
- **Database**: Emotion and journal entry management

### Frontend (Next.js + React)
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with custom components
- **Mobile-First**: Responsive design optimized for mobile devices
- **Real-time**: Live chat and emotion tracking

### Infrastructure
- **Containerization**: Docker with multi-service architecture
- **Reverse Proxy**: Nginx for load balancing and routing
- **Production Ready**: Gunicorn with optimized worker configuration
- **Health Monitoring**: Comprehensive health checks and monitoring

## �� Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Buddyku
   ```

2. **Environment Setup**
   ```bash
   # Backend environment variables
   cp backend/.env.example backend/.env
   # Edit backend/.env with your AWS and Twilio credentials
   ```

3. **Run with Docker Compose**
   ```bash
   # Build and start all services
   docker-compose up --build
   
   # Access the application
   # Frontend: http://localhost:3000
   # Backend API: http://localhost:8000
   # API Docs: http://localhost:8000/docs
   ```

### Development Mode

1. **Backend Development**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

2. **Frontend Development**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## �� Application Pages

### 🏠 Home
- Welcome screen with Buddyku branding
- Quick access to main features

### 💬 Chat (Avatar)
- AI chat interface with Ruby
- Real-time conversation with empathetic responses
- Crisis detection and intervention

### 🧠 Memory
- Calendar view of journal entries
- Daily mood and emotion tracking
- Media attachment support
- Emergency breathing exercises

### 😊 Emotion (Explore)
- Emotion jar system for memory organization
- Visual representation of emotional memories
- Random memory popup for reflection

### 👤 Profile
- User settings and preferences
- Personal information management

### 📹 Video Call
- Face-to-face communication
- Real-time video streaming capabilities

## 🔧 API Endpoints

### Core Endpoints
- `POST /api/chat` - AI chat with Ruby
- `POST /api/detect-suicide` - Suicide risk detection
- `POST /api/mood-detection` - Mood analysis from images
- `POST /uploadEmotionsS3` - Upload journal entries
- `POST /fetch-all-emotions` - Retrieve user emotions

### Phone Integration
- `POST /phone/call` - Make phone calls
- `GET /phone/call/{call_sid}/status` - Check call status
- `GET /phone/calls` - List recent calls

### Health & Monitoring
- `GET /health` - Backend health check
- `GET /phone/health` - Phone service health

## ��️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Gunicorn** - Production WSGI server
- **AWS Bedrock** - AI/ML services
- **AWS S3** - File storage
- **Twilio** - Communication services
- **Boto3** - AWS SDK

### Frontend
- **Next.js 15** - React framework
- **React 19** - UI library
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety
- **Lucide React** - Icons

### Infrastructure
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **Docker Compose** - Orchestration

## 🔐 Environment Variables

### Backend (.env)
```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
S3_BUCKET_NAME=your_s3_bucket
S3_REGION=ap-southeast-1

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=your_twilio_number

# Bedrock Configuration
AWS_REGION=ap-southeast-1
```

## 🚀 Deployment

### EC2 Deployment
1. **Launch EC2 Instance** (Recommended: t3.xlarge for production)
2. **Install Docker** and Docker Compose
3. **Configure Security Groups** (ports 80, 443, 22)
4. **Deploy Application**:
   ```bash
   # Copy application files
   scp -r . ubuntu@your-ec2-ip:~/buddyku/
   
   # SSH and start services
   ssh ubuntu@your-ec2-ip
   cd ~/buddyku
   docker-compose up -d
   ```

### Production Considerations
- **HTTPS**: Use ngrok or ALB for HTTPS support
- **Domain**: Configure custom domain with SSL
- **Monitoring**: Set up CloudWatch or similar monitoring
- **Backup**: Regular S3 backups for user data

## �� Testing

### API Testing
```bash
# Health check
curl http://localhost:8000/health

# Chat with Ruby
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Ruby", "message_history": []}'
```

### Frontend Testing
```bash
cd frontend
npm run dev
# Visit http://localhost:3000
```

## 📊 Monitoring & Health Checks

- **Backend Health**: `GET /health`
- **Phone Service**: `GET /phone/health`
- **Docker Health**: Built-in health checks for all services
- **Resource Monitoring**: Memory and CPU limits configured

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Crisis Support

**Malaysian Mental Health Resources:**
- Malaysian Mental Health Association (MMHA): +603-2780-6803
- Befrienders Kuala Lumpur: +603-7627-2929
- Talian Kasih (National Hotline): 15999

## 📞 Support

For technical support or questions about Buddyku, please open an issue in the repository.

---

**Buddyku** - Your compassionate companion for mental wellness 🌟
