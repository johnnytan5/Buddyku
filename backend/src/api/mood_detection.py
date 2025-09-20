from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import logging
import boto3
import os
import base64
import json
from dotenv import load_dotenv
import re

load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Bedrock client
try:
    bedrock_runtime = boto3.client(
        service_name='bedrock-runtime',
        region_name=os.getenv("AWS_REGION", "us-east-1")
    )
    logger.info("Successfully created Bedrock Runtime client for mood detection.")
except Exception as e:
    logger.error(f"Failed to create Bedrock client: {e}")
    bedrock_runtime = None

MODEL_ID = "amazon.nova-lite-v1:0"


@router.post("/mood-detection")
async def mood_detection(file: UploadFile = File(...)):
    """
    Accepts an image file, sends it to Bedrock (amazon.nova-lite-v1:0) for mood/risk analysis,
    and returns the result.
    """
    if bedrock_runtime is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "Bedrock client is not initialized. "
                "Check your AWS credentials and region."
                )
            )

    try:
        # Read image and encode as base64
        image_bytes = await file.read()
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        logger.info(
            f"Received image for mood detection: {file.filename}, size: {len(image_bytes)} bytes"
        )

        # Prepare payload for Bedrock using latest Nova VLM API (messages-v1)
        system_list = [
            {
                "text": (
                    "You are a mental health assistant. "
                    "When the user provides you with an image, analyze the user's mood such as happy, neutral, sad, fearful, or anxious. "
                    "and risk of self-harm ranging from 0.1 to 1.0 "
                    "Output mood as null and risk_score as null if you cannot detect a face"
                    "Respond with a JSON object: {\"mood\": <mood>, \"risk_score\": <risk_score>}"
                )
            }
        ]
        message_list = [
            {
                "role": "user",
                "content": [
                    {
                        "image": {
                            "format": "jpeg",
                            "source": {
                                "bytes": image_b64
                            }
                        }
                    },
                    {
                        "text": (
                            "Analyze this image and return a JSON object with the user's mood and risk_score. "
                            "Example: {\"mood\": \"happy\", \"risk_score\": 0.1}"
                        )
                    }
                ]
            }
        ]
        inf_params = {"maxTokens": 300, "topP": 0.1, "topK": 20, "temperature": 0.3}
        native_request = {
            "schemaVersion": "messages-v1",
            "messages": message_list,
            "system": system_list,
            "inferenceConfig": inf_params
        }
        response = bedrock_runtime.invoke_model(
            modelId=MODEL_ID,
            body=json.dumps(native_request),
            contentType='application/json',
            accept='application/json'
        )
        result = response.get('body').read()
        result_json = json.loads(result)

        mood = None
        risk_score = None
        try:
            # The model's output is usually in result_json['output']['message']['content'][0]['text']
            text = result_json["output"]["message"]["content"][0]["text"]

            cleaned = re.sub(r"^```[a-zA-Z]*\\n|```$", "", text.strip())
            cleaned = cleaned.strip()
            if not (cleaned.startswith('{') and cleaned.endswith('}')):
                match = re.search(r'\{.*\}', cleaned, re.DOTALL)
                if match:
                    cleaned = match.group(0)
            logger.info(f"Mood detection output: {cleaned}")

            parsed = json.loads(cleaned)
            mood = parsed.get("mood")
            risk_score = parsed.get("risk_score")

        except Exception as e:
            logger.error(f"Could not parse mood/risk_score from model output: {e}")
        logger.info(f"Extracted mood: {mood}, risk_score: {risk_score}")
        return JSONResponse(content={
            "mood": mood,
            "risk_score": risk_score,
        })
    except Exception as e:
        logger.error(f"Mood detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
