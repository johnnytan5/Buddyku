# Gunicorn configuration file for production deployment
import multiprocessing
import os

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes - optimized for t3.xlarge with text models
workers = 2  # Can handle 2 workers with 16GB RAM
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 180  # Increased timeout for text model loading
keepalive = 2

# Restart workers after this many requests, to prevent memory leaks
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = "buddyku-api"

# Server mechanics
daemon = False
pidfile = "/tmp/gunicorn.pid"
user = None
group = None
tmp_upload_dir = None

# SSL (uncomment if using HTTPS)
# keyfile = None
# certfile = None

# Preload app for better performance (disabled for debugging)
preload_app = False

# Worker timeout for graceful shutdown
graceful_timeout = 30

# Environment variables
raw_env = [
    'PYTHONPATH=/app',
]
