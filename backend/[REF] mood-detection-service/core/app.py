from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import os

from core.suicide_text_detector import SuicideTextDetector

# Initialize FastAPI app
app = FastAPI(
    title="Buddyku Suicide Text Detection API",
    description="API for detecting suicide risk in text messages",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the detector
detector = SuicideTextDetector()

# Define request and response models
class MessageRequest(BaseModel):
    text: str

class MessagesRequest(BaseModel):
    messages: List[str]

class ChatHistoryRequest(BaseModel):
    user_id: Optional[str] = None
    messages: List[str]

@app.get("/")
def read_root():
    """Health check endpoint"""
    return {"status": "online", "service": "Buddyku Suicide Text Detection API"}

@app.post("/detect/")
def detect_single_message(request: MessageRequest):
    """Detect suicide risk in a single text message"""
    try:
        result = detector.detect_suicide_risk(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing text: {str(e)}")

@app.post("/detect-batch/")
def detect_multiple_messages(request: MessagesRequest):
    """Detect suicide risk in multiple text messages"""
    try:
        results = []
        for message in request.messages:
            result = detector.detect_suicide_risk(message)
            results.append(result)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing messages: {str(e)}")

@app.post("/analyze-chat/")
def analyze_chat_history(request: ChatHistoryRequest):
    """Analyze a full chat history for suicide risk patterns"""
    try:
        # Get overall analysis
        analysis = detector.analyze_chat_history(request.messages)
        
        # Get detailed analysis of each message
        message_details = []
        for message in request.messages:
            result = detector.detect_suicide_risk(message)
            message_details.append(result)
        
        return {
            "user_id": request.user_id,
            "overall_analysis": analysis,
            "message_details": message_details
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing chat history: {str(e)}")

@app.get("/risk-factors/")
def get_risk_factors():
    """Return the risk factors and concerning phrases monitored by the system"""
    concerning_phrases = {
        "kill myself": 10,
        "want to die": 9,
        "end my life": 9,
        "suicide": 8,
        "no reason to live": 8, 
        "better off without me": 7,
        "can't take it anymore": 6,
        "don't want to be here": 6,
        "tired of living": 6,
        "hopeless": 5,
        "worthless": 5,
        "no future": 5,
        "give up": 4,
        "no point": 4
    }
    
    risk_thresholds = {
        "HIGH": "≥ 0.8",
        "MODERATE": "≥ 0.5 and < 0.8",
        "LOW": "< 0.5"
    }
    
    return {
        "risk_thresholds": risk_thresholds,
        "concerning_phrases": concerning_phrases,
        "description": "The system monitors text for concerning phrases and patterns that may indicate suicide risk."
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)