# Suicide Detection API - Docker Setup

This guide explains how to run the Suicide Detection API using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Model files in the correct locations

## Quick Start

### 1. Ensure Model Files Are Present

Make sure you have the following model files:
- `backend/notebook/suicide_mood_model.keras`
- `backend/notebook/suicide-text-model.keras`
- `backend/notebook/tokenizer.pkl` (for text detection)

### 2. Build and Run

```bash
# Build and start the services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 3. Access the API

- **API Base URL**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **API Documentation**: http://localhost:8000/docs

## Available Endpoints

### Mood Detection (Image-based)
- `POST /predict-mood` - Analyze single image
- `POST /predict-mood-batch` - Analyze multiple images

### Text Detection (Text-based)
- `POST /predict-text` - Analyze single text
- `POST /predict-text-batch` - Analyze multiple texts
- `POST /analyze-chat-history` - Analyze chat conversation

## Docker Commands

### Development
```bash
# Build and run
docker-compose up --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production (with Nginx)
```bash
# Run with nginx reverse proxy
docker-compose --profile production up -d --build
```

### Individual Container Management
```bash
# Build backend only
docker build -t suicide-detection-api ./backend

# Run backend container
docker run -p 8000:8000 -v $(pwd)/backend/notebook:/app/notebook suicide-detection-api

# Access container shell
docker-compose exec backend bash
```

## Environment Variables

You can customize the setup using environment variables:

```bash
# Create .env file
echo "API_PORT=8000" > .env
echo "MODEL_PATH=/app/notebook" >> .env
```

## Troubleshooting

### Model Files Missing
If you get errors about missing model files:
1. Ensure model files are in `backend/notebook/` directory
2. Check file permissions
3. Verify file names match exactly

### Port Already in Use
```bash
# Change port in docker-compose.yml
ports:
  - "8001:8000"  # Use port 8001 instead
```

### Memory Issues
```bash
# Increase Docker memory limit
# In Docker Desktop: Settings > Resources > Memory
```

### View Container Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend

# Follow logs in real-time
docker-compose logs -f backend
```

## API Testing

### Test Health Endpoint
```bash
curl http://localhost:8000/health
```

### Test Text Detection
```bash
curl -X POST "http://localhost:8000/predict-text" \
  -H "Content-Type: application/json" \
  -d '{"text": "I am feeling hopeless and want to end it all"}'
```

### Test Mood Detection
```bash
curl -X POST "http://localhost:8000/predict-mood" \
  -F "file=@path/to/your/image.jpg"
```

## Production Deployment

For production deployment:

1. **Use production profile**:
   ```bash
   docker-compose --profile production up -d
   ```

2. **Set up SSL certificates** (modify nginx.conf)

3. **Use environment variables** for configuration

4. **Set up monitoring** and logging

5. **Use Docker secrets** for sensitive data

## File Structure
```
Buddyku/
├── docker-compose.yml
├── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── main.py
│   ├── requirements.txt
│   ├── start.sh
│   └── notebook/
│       ├── suicide_mood_model.keras
│       ├── suicide-text-model.keras
│       └── tokenizer.pkl
└── DOCKER_README.md
```
