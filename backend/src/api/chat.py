from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..models.chat_model import ChatRequest
import logging
import boto3
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Setup basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

router = APIRouter()

headers = {"Cache-Control": "no-cache", "Connection": "keep-alive"}

# Initialize the Bedrock Runtime client
try:
    bedrock_runtime = boto3.client(
        service_name='bedrock-runtime',
        region_name=os.getenv("AWS_REGION", "us-east-1")
    )
    # Log successful connection
    logger.info("Successfully created Bedrock Runtime client.")
except Exception as e:
    # Log failed connection
    logger.error(f"Failed to create Bedrock client: {e}")
    bedrock_runtime = None

# Model ID for Nova Lite
MODEL_ID = "amazon.nova-lite-v1:0"

SYSTEM_PROMPT = """
**Role & Personality**
You are Ruby, a warm, supportive, and encouraging daily journaling companion for young people. You listen with empathy, respond in a caring and relatable way, and always try to make the user feel understood and valued. You never criticize or shame. You use simple, friendly, and age-appropriate language.

**Core Goals**
1. Help users express their feelings safely.
2. Provide gentle encouragement and positive reinforcement.
3. Suggest healthy coping strategies (e.g., journaling, breathing exercises, grounding techniques).
4. Remind users of their strengths, achievements, and positive memories.
5. If the user shows warning signs of suicidal thoughts or self-harm, shift into a calm, compassionate tone and encourage them to seek help from a trusted adult, counselor, or emergency helpline. Never ignore or dismiss such signs.

**Tone**
- Friendly, compassionate, and trustworthy.
- Encouraging, but never forceful.
- Light and hopeful when possible, but serious and caring if the user expresses distress.

**Safety & Crisis Handling**
- If the user expresses suicidal thoughts, self-harm intentions, or extreme hopelessness, respond with empathy first (e.g., “I’m really sorry you’re feeling this way, it sounds really tough.”).
- Gently guide them toward professional help (e.g., “You don’t have to go through this alone—talking to a trusted friend, family member, or counselor could really help. If you ever feel like you might be in danger of hurting yourself, please call your local emergency number right away.”).
- Offer grounding exercises and uplifting reminders while emphasizing that real people can help right now.

**Examples of Response Styles**
- Casual daily chat: “Hey, how’s your day so far? Want to jot down a thought or a little win from today?”
- Mood tracking: “Sounds like today feels a bit heavy. Do you want to tell me more about what’s on your mind?”
- Uplifting memory: “Remember that time you mentioned how proud you felt after finishing that project? You’re stronger than you think.”
- Crisis: “I hear you, and I care about you. It sounds really painful. Please remember you don’t have to go through this alone—can you reach out to someone you trust right now? If you’re thinking about hurting yourself, please call your local emergency number or a suicide prevention hotline immediately.”
"""


@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Endpoint to stream responses from an AWS Bedrock model using the InvokeModelWithResponseStream 'messages' API.
    """
    if bedrock_runtime is None:
        raise HTTPException(status_code=500, detail="Bedrock client is not initialized. Check your AWS credentials and region.")

    try:
        user_message = request.message
        message_history = request.message_history or []

        if not user_message:
            raise HTTPException(status_code=400, detail="No message provided.")

        # Prepare the messages for the new 'messages' API format
        messages_list = [
            {"role": msg.role, "content": [{"text": msg.content}]}
            for msg in message_history
        ]
        messages_list.append({"role": "user", "content": [{"text": user_message}]})

        # Define the system prompt list
        system_list = [{"text": SYSTEM_PROMPT}]

        # Construct the request body with the new schema
        body = json.dumps({
            "messages": messages_list,
            "system": system_list,
            "inferenceConfig": {
                "maxTokens": 512,
                "temperature": 0.5
            },
            "schemaVersion": "messages-v1"
        })

        # This generator function will handle the streaming logic
        async def event_generator():
            try:
                response = bedrock_runtime.invoke_model_with_response_stream(
                    modelId=MODEL_ID,
                    body=body,
                    contentType='application/json',
                    accept='application/json'
                )

                stream = response.get('body')
                if stream:
                    for event in stream:
                        chunk = event.get('chunk')
                        if chunk:
                            # Parse the JSON response chunk
                            json_chunk = json.loads(chunk.get('bytes').decode('utf-8'))
                            
                            # The streaming text is now in contentBlockDelta
                            content_delta = json_chunk.get("contentBlockDelta")
                            if content_delta:
                                text_to_yield = content_delta.get("delta").get("text")
                                yield text_to_yield

            except Exception as e:
                logger.error(f"An error occurred during streaming: {e}")
                # Yield a final error message to the client
                yield f"ERROR: {str(e)}"
                
        return StreamingResponse(event_generator(), media_type="text/plain", headers=headers)

    except HTTPException as e:
        # Re-raise HTTPException to be handled by FastAPI
        raise e
    except Exception as e:
        logger.error(f"An error occurred during request processing: {e}")
        # Catch other exceptions and return a 500 error
        raise HTTPException(status_code=500, detail=str(e))