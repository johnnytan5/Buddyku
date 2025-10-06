
from fastapi import APIRouter, HTTPException
from models.suicide_model import SuicideDetectionRequest, SuicideDetectionResponse
import logging
import boto3
import json
import os
import re
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

router = APIRouter()

headers = {"Cache-Control": "no-cache", "Connection": "keep-alive"}

try:
    bedrock_runtime = boto3.client(
        service_name='bedrock-runtime',
        region_name=os.getenv("AWS_REGION", "us-east-1")
    )
    logger.info("Successfully created Bedrock Runtime client.")
except Exception as e:
    logger.error(f"Failed to create Bedrock client: {e}")
    bedrock_runtime = None

MODEL_ID = "amazon.nova-lite-v1:0"




@router.post("/detect-suicide", response_model=SuicideDetectionResponse)
async def detect_suicide(request: SuicideDetectionRequest):
    """
    Use LLM to detect suicidal intention in the user message. Returns risk level and risk score.
    """
    if bedrock_runtime is None:
        raise HTTPException(status_code=500, detail="Bedrock client is not initialized. Check your AWS credentials and region.")
    if not request.message:
        raise HTTPException(status_code=400, detail="No message provided.")

    system_list = [{"text": "You are a suicide risk detection assistant. Given a user's message, classify the suicide risk as one of: none, low, moderate, high, very-high. Also, output a risk score between 0 and 1 (float, where 0 is no risk and 1 is highest risk). \n\nIMPORTANT: Messages containing explicit suicidal intent like 'I want to commit suicide', 'I want to end my life', 'I want to kill myself', or similar direct statements MUST be classified as 'very-high' with risk_score of 1.0. \n\nOnly output a JSON object with keys 'risk_level' and 'risk_score'."}]
    messages_list = [{"role": "user", "content": [{"text": request.message}]}]

    body = json.dumps({
        "messages": messages_list,
        "system": system_list,
        "inferenceConfig": {
            "maxTokens": 128,
            "temperature": 0.0,
        },
        "schemaVersion": "messages-v1"
    })

    try:
        response = bedrock_runtime.invoke_model(
            modelId=MODEL_ID,
            body=body,
            contentType='application/json',
            accept='application/json'
        )
        logger.info(f"Bedrock response: {response}")
        result = response.get('body')
        if hasattr(result, 'read'):
            result_str = result.read().decode('utf-8')
        else:
            result_str = result.decode('utf-8') if isinstance(result, bytes) else str(result)

        # Parse the LLM output
        output_json = None
        try:
            # Try to parse as JSON first
            result_json = json.loads(result_str.strip())
            text = result_json["output"]["message"]["content"][0]["text"]
            # Remove code block markers and whitespace
            cleaned = re.sub(r"^```[a-zA-Z]*\n|```$", "", text.strip())
            cleaned = cleaned.strip()
            # Try to parse cleaned as JSON
            try:
                output_json = json.loads(cleaned)
            except Exception:
                # Try to extract JSON substring if extra text
                match = re.search(r'\{.*\}', cleaned, re.DOTALL)
                if match:
                    output_json = json.loads(match.group(0))
        except Exception:
            # Fallback: try to extract JSON from the whole result_str
            match = re.search(r'\{.*\}', result_str, re.DOTALL)
            if match:
                output_json = json.loads(match.group(0))
        if not output_json:
            raise ValueError(f"LLM output not valid JSON: {result_str}")
        risk_level = output_json.get('risk_level', 'none')
        risk_score = float(output_json.get('risk_score', 0.0))
        logger.info(f"LLM suicide detection output: {output_json}")
        return SuicideDetectionResponse(risk_level=risk_level, risk_score=risk_score)
    except Exception as e:
        logger.error(f"LLM suicide detection error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM suicide detection error: {e}")
