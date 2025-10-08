from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import boto3
import os
import json
import logging
import re

router = APIRouter()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

class DetectRequest(BaseModel):
    message: str

class DetectResponse(BaseModel):
    score: int  # 1-10

# Bedrock client
try:
    bedrock_runtime = boto3.client(
        service_name='bedrock-runtime',
        region_name=os.getenv("AWS_REGION", "us-east-1")
    )
    logger.info("Bedrock Runtime client ready for suicide detection.")
except Exception as e:
    logger.error(f"Failed to create Bedrock client for suicide detection: {e}")
    bedrock_runtime = None

MODEL_ID = "amazon.nova-lite-v1:0"

SYSTEM_PROMPT = """
You are a professional counselling agent focused on safety. Your task is to rate whether a single sentence
contains ANY hint of suicidal ideation, self-harm intent, or desire to die.

Rating scale: 1 (no hint) to 10 (very strong hint).
Safety policy: Minimize false negatives. If unsure or there is any small hint, rate above 5.
Notes:
- Consider indirect expressions ("I can't go on", "I don't want to be here", "I'm done") as hints.
- If explicitly suicidal ("I want to kill myself", "I will end it"), rate 9–10.
- Respond with ONLY an integer from 1 to 10. No extra text, no JSON, no punctuation.
"""

def build_body(user_text: str) -> dict:
    return {
        "messages": [
            {
                "role": "user",
                "content": [{"text": f"Sentence: {user_text}\nRating:"}]
            }
        ],
        "system": [
            {"text": SYSTEM_PROMPT}
        ],
        "inferenceConfig": {
            "maxTokens": 16,
            "temperature": 0.0
        },
        "schemaVersion": "messages-v1"
    }

def parse_integer(text: str) -> Optional[int]:
    m = re.search(r"\b(10|[1-9])\b", text or "")
    return int(m.group(1)) if m else None

@router.post("/detect-suicide", response_model=DetectResponse)
async def detect_suicide(req: DetectRequest):
    if bedrock_runtime is None:
        raise HTTPException(status_code=500, detail="Bedrock client not initialized")

    msg = (req.message or "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="message is required")

    try:
        body = json.dumps(build_body(msg))

        resp = bedrock_runtime.invoke_model(
            modelId=MODEL_ID,
            body=body,
            contentType="application/json",
            accept="application/json",
        )

        data = json.loads(resp["body"].read())
        text = (
            data.get("output", {})
                .get("message", {})
                .get("content", [{}])[0]
                .get("text", "")
            or ""
        )

        score = parse_integer(text)
        if score is None:
            logger.warning(f"Could not parse score from model output: {text!r}. Returning 7.")
            score = 7

        return DetectResponse(score=score)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Suicide detection error: {e}")
        return DetectResponse(score=7)