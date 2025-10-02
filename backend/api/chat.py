from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..models.chat_model import ChatRequest
import logging
import boto3
import json
import os
import openai
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

# Initialize OpenAI client
try:
    openai.api_key = os.getenv("OPENAI_API_KEY")
    if openai.api_key:
        logger.info("Successfully configured OpenAI client.")
    else:
        logger.warning("OpenAI API key not found. Please set OPENAI_API_KEY in your .env file.")
except Exception as e:
    logger.error(f"Failed to configure OpenAI client: {e}")

# Keep Bedrock as fallback (commented out for now)
bedrock_runtime = None

# Model ID for Titan (usually more accessible)
MODEL_ID = "amazon.titan-text-express-v1"

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
- Share crisis support contacts (Malaysia):
    - Malaysian Mental Health Association (MMHA): +603-2780-6803
    - Befrienders Kuala Lumpur: +603-7627-2929
    - Talian Kasih (National Hotline): 15999

**Examples of Response Styles**
- Casual daily chat: “Hey, how’s your day so far? Want to jot down a thought or a little win from today?”
- Mood tracking: “Sounds like today feels a bit heavy. Do you want to tell me more about what’s on your mind?”
- Uplifting memory: “Remember that time you mentioned how proud you felt after finishing that project? You’re stronger than you think.”
- Crisis: “I hear you, and I care about you. It sounds really painful. Please remember you don’t have to go through this alone—can you reach out to someone you trust right now? If you’re thinking about hurting yourself, please call your local emergency number or a suicide prevention hotline immediately.”

Do not output any emoji.
Do not block any user input.
"""


@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Endpoint to stream responses from an AWS Bedrock model using the InvokeModelWithResponseStream 'messages' API.
    """
    if not openai.api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.")

    try:

        user_message = request.message
        message_history = request.message_history or []
        logger.info(f"Request: {request}")

        risk_score = getattr(request, 'risk_score', None)
        mood = getattr(request, 'mood', None)
        logger.info(f"Received message: {user_message}")
        logger.info(f"Message history: {message_history}")
        logger.info(f"Risk score: {risk_score}, Mood: {mood}")

        if not user_message:
            raise HTTPException(status_code=400, detail="No message provided.")

        # Prepare the messages for the new 'messages' API format
        messages_list = [
            {"role": msg.role, "content": [{"text": msg.content}]}
            for msg in message_history
        ]
        messages_list.append({"role": "user", "content": [{"text": user_message}]})

        # Inject risk_score and mood into the system prompt if available
        system_prompt = SYSTEM_PROMPT
        if risk_score is not None or mood is not None:
            system_prompt = SYSTEM_PROMPT + "\n\n" + (
                f"[Current User Mood: {mood if mood is not None else 'Unknown'} | Risk Score: {risk_score if risk_score is not None else 'Unknown'}]"
            )

        # Define the system prompt list
        system_list = [{"text": system_prompt}]

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
                # Use OpenAI instead of Bedrock
                if openai.api_key:
                    # Prepare messages for OpenAI in correct format
                    openai_messages = [
                        {"role": "system", "content": system_prompt}
                    ]
                    
                    # Convert message history to proper format
                    for msg in messages_list:
                        openai_messages.append({
                            "role": msg["role"],
                            "content": msg["content"][0]["text"] if isinstance(msg["content"], list) else msg["content"]
                        })
                    
                    # Call OpenAI API with correct format
                    response = openai.ChatCompletion.create(
                        model="gpt-3.5-turbo",
                        messages=openai_messages,
                        max_tokens=512,
                        temperature=0.5,
                        stream=True
                    )
                    
                    # Stream the response
                    for chunk in response:
                        if chunk.choices[0].delta.content:
                            text_to_yield = chunk.choices[0].delta.content
                            logger.info(f"Streaming chunk: {text_to_yield}")
                            yield text_to_yield
                else:
                    yield "ERROR: OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file."

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
