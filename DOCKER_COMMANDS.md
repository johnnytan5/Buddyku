# Docker Commands Cheat Sheet

## Basic Docker Commands

### Building Images
```bash
# Build an image from Dockerfile
docker build -t my-app .

# Build with specific tag
docker build -t my-app:v1.0 .

# Build without cache
docker build --no-cache -t my-app .
```

### Running Containers
```bash
# Run a container
docker run -p 8000:8000 my-app

# Run in background (detached)
docker run -d -p 8000:8000 my-app

# Run with environment variables
docker run -e API_KEY=123 -p 8000:8000 my-app

# Run with volume mounting
docker run -v /host/path:/container/path my-app
```

### Container Management
```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Stop a container
docker stop container_id

# Remove a container
docker rm container_id

# Remove all stopped containers
docker container prune
```

### Image Management
```bash
# List images
docker images

# Remove an image
docker rmi image_id

# Remove all unused images
docker image prune -a
```

### Docker Compose
```bash
# Start services
docker compose up

# Start in background
docker compose up -d

# Build and start
docker compose up --build

# Stop services
docker compose down

# View logs
docker compose logs -f
```

### Debugging
```bash
# Execute command in running container
docker exec -it container_id bash

# View container logs
docker logs container_id

# Follow logs in real-time
docker logs -f container_id
```

## Your Suicide Detection API Commands

### Build Your Image
```bash
# From your project root
docker build -t suicide-detection-api ./backend

# With version tag
docker build -t suicide-detection-api:v1.0 ./backend
```

### Run Your API
```bash
# Basic run
docker run -p 8000:8000 suicide-detection-api

# With volume for models
docker run -p 8000:8000 -v $(pwd)/backend/notebook:/app/notebook suicide-detection-api

# With environment variables
docker run -p 8000:8000 -e PYTHONPATH=/app suicide-detection-api
```

### Using Docker Compose
```bash
# Start your API
docker compose up --build

# Start with nginx (production)
docker compose --profile production up -d
```
