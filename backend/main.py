from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
from api import chat, mood_detection, suicide_detector, summary
from routers import phone, voice_webhooks, ai_calling
from s3.s3_combined import router as s3_router
from dynamodb.dynamodb_combined import router as dynamodb_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://frontend:3000",  # Add this for Docker
        "http://localhost", 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include all routers
app.include_router(phone.router)
app.include_router(voice_webhooks.router)
app.include_router(ai_calling.router)
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(mood_detection.router, prefix="/api", tags=["mood_detection"])
app.include_router(suicide_detector.router, prefix="/api", tags=["suicide_detector"])
app.include_router(summary.router, prefix="/api", tags=["summary"])
app.include_router(s3_router, prefix="/api", tags=["s3"])
app.include_router(dynamodb_router, prefix="/api", tags=["dynamodb"])

@app.get("/health")
async def health_check():
    """
    Health check endpoint for Docker and load balancer
    """
    return {
        "status": "healthy",
        "message": "Backend service is running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI backend!"}


