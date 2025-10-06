from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.chat_model import ChatRequest
from pydantic import BaseModel
from typing import List, Optional, Literal
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

# Pydantic models for summary endpoint
class MessageSummary(BaseModel):
    role: str
    content: str

class SummaryRequest(BaseModel):
    messages: List[MessageSummary]

class MoodSummaryResponse(BaseModel):
    date: str
    mood: Literal["very-sad", "sad", "neutral", "happy", "very-happy"]
    emotion: Literal["belonging", "calm", "comfort", "disappointment", "gratitude", "hope", "joy", "love", "sadness", "strength"]
    content: str
    gratitude: List[str]
    achievements: List[str]
    isFavorite: bool = False

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

CHAT_SYSTEM_PROMPT = """
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
Always keep the response short and concise.
"""

SUMMARY_SYSTEM_PROMPT = """
You are an AI assistant that analyzes chat conversations and creates personal journal entries from the user's perspective. Based on the conversation history, you need to:

1. **Determine the overall mood** from: very-sad, sad, neutral, happy, very-happy
2. **Identify the primary emotion** from: belonging, calm, comfort, disappointment, gratitude, hope, joy, love, sadness, strength
3. **Write a personal journal entry** (2-3 sentences) from the user's first-person perspective about their day/feelings
4. **Extract gratitude items** - things the user was thankful for or appreciated
5. **Identify achievements** - any accomplishments, progress, or positive actions the user mentioned

**Output Format:**
You must respond with ONLY a valid JSON object in this exact format:
{
  "mood": "sad",
  "emotion": "sadness", 
  "content": "Personal journal entry from user's perspective in first person (I felt..., I did..., etc.)",
  "gratitude": ["item1", "item2"],
  "achievements": ["achievement1", "achievement2"]
}

**Writing Style Guidelines:**
- Write in first person (I, me, my) as if the user is writing their own journal
- Use natural, personal language like: "I felt...", "Today was...", "I struggled with...", "I managed to..."
- Focus on the user's internal experience and emotions
- Make it sound like a genuine personal reflection, not a clinical observation
- Keep it conversational and authentic

**Examples of good content style:**
- "Felt really overwhelmed today with work stress. Had a good talk with someone who understood what I was going through."
- "Woke up feeling anxious about the presentation. Managed to get through it even though my heart was racing."
- "Had a tough day dealing with family drama. Felt emotionally drained but glad I could express my feelings."
- "Felt lonely after a long day. Watched some comfort shows and tried to be kind to myself."

**Guidelines:**
- Be empathetic and authentic to the user's emotional state
- If the user discussed stress, sadness, or difficult topics, reflect that naturally
- Look for any positive moments, support received, or personal growth
- Gratitude should be simple and personal: "A friend's text message", "Hot coffee", "Getting through the day"
- Achievements can be small but meaningful: "Opened up about my feelings", "Asked for help", "Did self-care"
- Keep content brief but meaningful and personal
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
        system_prompt = CHAT_SYSTEM_PROMPT
        if risk_score is not None or mood is not None:
            system_prompt = CHAT_SYSTEM_PROMPT + "\n\n" + (
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
                                logger.info(f"Streaming chunk: {text_to_yield}")
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


@router.post("/generate-summary", response_model=MoodSummaryResponse)
async def generate_summary(request: SummaryRequest):
    """
    Endpoint to generate mood and emotion summary from chat conversation history.
    """
    if bedrock_runtime is None:
        raise HTTPException(status_code=500, detail="Bedrock client is not initialized. Check your AWS credentials and region.")

    try:
        messages = request.messages
        logger.info(f"Generating summary for {len(messages)} messages")

        if not messages:
            raise HTTPException(status_code=400, detail="No messages provided.")

        # Prepare conversation text for analysis
        conversation_text = ""
        for msg in messages:
            role_label = "User" if msg.role == "user" else "Assistant"
            conversation_text += f"{role_label}: {msg.content}\n"

        # Create the summary analysis prompt
        analysis_prompt = f"""
Analyze this conversation and provide a mood summary:

{conversation_text}

Remember to respond with ONLY valid JSON in the specified format.
"""

        # Prepare the request body for summary generation
        messages_list = [
            {"role": "user", "content": [{"text": analysis_prompt}]}
        ]

        system_list = [{"text": SUMMARY_SYSTEM_PROMPT}]

        body = json.dumps({
            "messages": messages_list,
            "system": system_list,
            "inferenceConfig": {
                "maxTokens": 1024,
                "temperature": 0.3  # Lower temperature for more consistent JSON output
            },
            "schemaVersion": "messages-v1"
        })

        # Call Bedrock to generate summary
        response = bedrock_runtime.invoke_model(
            modelId=MODEL_ID,
            body=body,
            contentType='application/json',
            accept='application/json'
        )

        # Parse the response
        response_body = json.loads(response['body'].read())
        summary_text = response_body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '')

        logger.info(f"Raw summary response: {summary_text}")

        # Parse the JSON response from the model
        try:
            # Clean up the response text to extract JSON
            json_start = summary_text.find('{')
            json_end = summary_text.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_text = summary_text[json_start:json_end]
                summary_data = json.loads(json_text)
            else:
                raise ValueError("No valid JSON found in response")

            # Add current date and default favorite status
            from datetime import datetime
            summary_data['date'] = datetime.now().strftime('%Y-%m-%d')
            summary_data['isFavorite'] = False

            logger.info(f"Parsed summary data: {summary_data}")
            
            return MoodSummaryResponse(**summary_data)

        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f"Failed to parse summary JSON: {e}, Raw text: {summary_text}")
            # Return default sad/stress example as fallback
            from datetime import datetime
            return MoodSummaryResponse(
                date=datetime.now().strftime('%Y-%m-%d'),
                mood="sad",
                emotion="sadness",
                content="Had a conversation about feelings and emotional experiences. The discussion touched on various topics and emotional states.",
                gratitude=["Having someone to talk to"],
                achievements=["Opened up about feelings"],
                isFavorite=False
            )

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"An error occurred during summary generation: {e}")
        # Return fallback response
        from datetime import datetime
        return MoodSummaryResponse(
            date=datetime.now().strftime('%Y-%m-%d'),
            mood="neutral",
            emotion="calm",
            content="Had a conversation with the assistant. The discussion covered various topics and provided a space for reflection.",
            gratitude=["Taking time to reflect"],
            achievements=["Engaged in meaningful conversation"],
            isFavorite=False
        )