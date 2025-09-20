from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from core.mood_detector import MoodDetector
import os
import tempfile

app = FastAPI(title="Suicide Mood Detection API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for EC2 deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the mood detector
model_path = os.path.join(os.path.dirname(__file__), "notebook", "suicide_mood_model.keras")
detector = MoodDetector(model_path=model_path)

@app.get("/") 
def read_root():
    return {"message": "Suicide Mood Detection API", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "model_loaded": True}

@app.post("/predict-mood")
async def predict_mood(file: UploadFile = File(...)):
    """
    Predict mood from uploaded image
    Returns: mood, confidence score, risk assessment
    """
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
