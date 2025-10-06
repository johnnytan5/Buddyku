from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import cv2
import numpy as np
from core.mood_detector import MoodDetector
from core.suicide_text_detector import SuicideTextDetector
import os
import tempfile

app = FastAPI(title="Suicide Detection API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for EC2 deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global cache for models (lazy loading)
_model_cache = {}

def get_mood_detector():
    """Get the mood detector instance with lazy loading"""
    if 'mood_detector' not in _model_cache:
        try:
            print("Loading mood detection model...")
            model_path = os.path.join(os.path.dirname(__file__), "notebook", "suicide_mood_model.keras")
            _model_cache['mood_detector'] = MoodDetector(model_path=model_path)
            print("Mood detection model loaded successfully")
        except Exception as e:
            print(f"Error loading mood detection model: {str(e)}")
            raise HTTPException(status_code=503, detail=f"Failed to load mood detection model: {str(e)}")
    
    return _model_cache['mood_detector']

def get_text_detector():
    """Get the text detector instance with lazy loading"""
    if 'text_detector' not in _model_cache:
        try:
            print("Loading text detection model...")
            text_model_path = os.path.join(os.path.dirname(__file__), "notebook", "suicide-text-model.keras")
            _model_cache['text_detector'] = SuicideTextDetector(model_path=text_model_path)
            print("Text detection model loaded successfully")
        except Exception as e:
            print(f"Error loading text detection model: {str(e)}")
            raise HTTPException(status_code=503, detail=f"Failed to load text detection model: {str(e)}")
    
    return _model_cache['text_detector']

@app.on_event("startup")
async def startup_event():
    """Application startup - models will be loaded lazily on first request"""
    print("Application started - models will be loaded on first request")

# Pydantic models for request/response schemas
class TextRequest(BaseModel):
    text: str

class ChatHistoryRequest(BaseModel):
    messages: List[str]

class BatchTextRequest(BaseModel):
    texts: List[str]

class MoodInput(BaseModel):
    image_data: str  # Base64 encoded image data
    filename: Optional[str] = None

@app.get("/") 
def read_root():
    return {"message": "Suicide Mood Detection API", "status": "running"}

@app.get("/health")
def health_check():
    mood_loaded = 'mood_detector' in _model_cache
    text_loaded = 'text_detector' in _model_cache
    models_loaded = mood_loaded and text_loaded
    
    return {
        "status": "healthy" if models_loaded else "ready", 
        "model_loaded": models_loaded,
        "mood_detector_loaded": mood_loaded,
        "text_detector_loaded": text_loaded,
        "lazy_loading": True
    }

@app.post("/predict-mood")
async def predict_mood(file: UploadFile = File(...)):
    """
    Predict mood from uploaded image
    Returns: mood, confidence score, risk assessment
    """
    detector = get_mood_detector()  # Lazy load the model
    
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process the uploaded image
        contents = await file.read()
        
        # Convert bytes to numpy array
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Could not decode image")
        
        # Process the image
        processed_frame, results = detector.detect_mood(image)
        
        if not results:
            return JSONResponse(content={
                "message": "No faces detected in the image",
                "mood": None,
                "confidence": None,
                "risk_assessment": None
            })
        
        # Get the first detected face result
        result = results[0]
        
        response = {
            "mood": result["mood"],
            "emotion_description": result["emotion_description"],
            "confidence": float(result["confidence"]),  # Convert to Python float
            "negative_probability": float(result["negative_prob"]),  # Convert to Python float
            "positive_probability": float(result["positive_prob"]),  # Convert to Python float
            "risk_score": float(result["risk_score"]),  # Convert to Python float
            "risk_level": result["risk_level"],
            "alert": result["alert"],
            "bounding_box": {
                "x": int(result["bbox"][0]),
                "y": int(result["bbox"][1]),
                "width": int(result["bbox"][2]),
                "height": int(result["bbox"][3])
            }
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/predict-mood-batch")
async def predict_mood_batch(files: list[UploadFile] = File(...)):
    """
    Predict mood from multiple uploaded images
    """
    results = []
    
    for file in files:
        try:
            if not file.content_type.startswith('image/'):
                results.append({
                    "filename": file.filename,
                    "error": "File must be an image"
                })
                continue
                
            contents = await file.read()
            nparr = np.frombuffer(contents, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                results.append({
                    "filename": file.filename,
                    "error": "Could not decode image"
                })
                continue
            
            processed_frame, face_results = detector.detect_mood(image)
            
            if not face_results:
                results.append({
                    "filename": file.filename,
                    "mood": None,
                    "message": "No faces detected"
                })
            else:
                result = face_results[0]
                results.append({
                    "filename": file.filename,
                    "mood": result["mood"],
                    "confidence": result["confidence"],
                    "risk_level": result["risk_level"],
                    "risk_score": result["risk_score"]
                })
                
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    return JSONResponse(content={"results": results})

# Simplified endpoint with lazy loading
@app.post("/predict_mood")
def predict_mood_simple(data: MoodInput):
    """
    Simplified mood prediction endpoint with lazy loading
    """
    detector = get_mood_detector()  # Lazy load the model
    return detector.predict(data)

# Text Detection Endpoints
@app.post("/predict-text")
async def predict_text(request: TextRequest):
    """
    Predict suicide risk from text input
    Returns: suicide confidence, risk level, concerning phrases
    """
    text_detector = get_text_detector()  # Lazy load the model
    
    try:
        result = text_detector.detect_suicide_risk(request.text)
        
        response = {
            "text": result["text"],
            "cleaned_text": result["cleaned_text"],
            "suicide_confidence": float(result["suicide_confidence"]),
            "risk_level": result["risk_level"],
            "risk_score": float(result["risk_score"]),
            "concerning_phrases": result["concerning_phrases"]
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing text: {str(e)}")

@app.post("/predict-text-batch")
async def predict_text_batch(request: BatchTextRequest):
    """
    Predict suicide risk from multiple text inputs
    """
    results = []
    
    for text in request.texts:
        try:
            result = text_detector.detect_suicide_risk(text)
            results.append({
                "text": result["text"],
                "suicide_confidence": float(result["suicide_confidence"]),
                "risk_level": result["risk_level"],
                "risk_score": float(result["risk_score"]),
                "concerning_phrases": result["concerning_phrases"]
            })
        except Exception as e:
            results.append({
                "text": text,
                "error": str(e)
            })
    
    return JSONResponse(content={"results": results})

@app.post("/analyze-chat-history")
async def analyze_chat_history(request: ChatHistoryRequest):
    """
    Analyze a chat history for suicide risk patterns
    """
    try:
        result = text_detector.analyze_chat_history(request.messages)
        
        response = {
            "risk_level": result["risk_level"],
            "risk_score": float(result["risk_score"]),
            "max_message_score": float(result["max_message_score"]),
            "avg_message_score": float(result["avg_message_score"]),
            "high_risk_messages": result["high_risk_messages"],
            "concerning_phrases_count": result["concerning_phrases_count"],
            "message_count": result["message_count"]
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing chat history: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
