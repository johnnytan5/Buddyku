from fastapi import APIRouter, Request, HTTPException, Form
from fastapi.responses import Response
from twilio.twiml.voice_response import VoiceResponse, Gather, Say, Pause
from twilio.twiml.messaging_response import MessagingResponse
import logging
import json
import os
from typing import Optional
import requests
from urllib.parse import urlencode

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice_webhooks"])

# Store conversation state (in production, use Redis or database)
conversation_states = {}

class ConversationState:
    def __init__(self, call_sid: str):
        self.call_sid = call_sid
        self.message_history = []
        self.current_mood = None
        self.risk_score = None
        self.is_active = True

def get_or_create_conversation_state(call_sid: str) -> ConversationState:
    """Get or create conversation state for a call"""
    if call_sid not in conversation_states:
        conversation_states[call_sid] = ConversationState(call_sid)
    return conversation_states[call_sid]

def call_ai_chat_api(message: str, message_history: list = None, mood: str = None, risk_score: float = None) -> str:
    """Call the existing AI chat API to get response"""
    try:
        # Get the backend URL from environment or use localhost
        backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        chat_url = f"{backend_url}/api/chat"
        
        payload = {
            "message": message,
            "message_history": message_history or [],
            "mood": mood,
            "risk_score": risk_score
        }
        
        logger.info(f"Calling AI chat API with payload: {payload}")
        
        response = requests.post(chat_url, json=payload, timeout=30)
        
        if response.status_code == 200:
            # For streaming response, we need to collect all chunks
            ai_response = ""
            for chunk in response.iter_content(chunk_size=1024, decode_unicode=True):
                if chunk:
                    ai_response += chunk
            
            logger.info(f"AI Response: {ai_response}")
            return ai_response.strip()
        else:
            logger.error(f"AI API error: {response.status_code} - {response.text}")
            return "I'm sorry, I'm having trouble processing that right now. Could you please try again?"
            
    except Exception as e:
        logger.error(f"Error calling AI API: {str(e)}")
        return "I'm sorry, I'm experiencing technical difficulties. Please try again later."

@router.post("/webhook/answer")
async def handle_outbound_call(request: Request):
    """
    Handle outbound calls - this is where the call starts when we call someone
    """
    try:
        # Get call information from Twilio
        form_data = await request.form()
        call_sid = form_data.get("CallSid")
        to_number = form_data.get("To")
        from_number = form_data.get("From")
        
        # Get user context from query parameters
        user_id = form_data.get("user_id")
        initial_mood = form_data.get("mood")
        custom_prompt = form_data.get("custom_prompt")
        
        logger.info(f"Outbound call to {to_number}, CallSid: {call_sid}, User: {user_id}")
        
        # Create conversation state with user context
        state = get_or_create_conversation_state(call_sid)
        state.current_mood = initial_mood
        state.user_id = user_id
        
        # Create TwiML response
        response = VoiceResponse()
        
        # Personalized welcome message based on context
        if custom_prompt:
            welcome_message = f"Hello! I'm Ruby, your AI companion. {custom_prompt} How are you feeling today?"
        elif initial_mood and initial_mood != "neutral":
            welcome_message = f"Hello! I'm Ruby, your AI companion. I understand you might be feeling {initial_mood} today. I'm here to listen and support you. How are you doing?"
        else:
            welcome_message = "Hello! I'm Ruby, your AI companion. I'm here to listen and chat with you. How are you feeling today?"
        
        response.say(welcome_message, voice="alice", language="en-US")
        
        # Add the welcome message to conversation history
        state.message_history.append({
            "role": "assistant", 
            "content": welcome_message
        })
        
        # Start gathering user input
        gather = Gather(
            input="speech",
            action="/voice/webhook/gather",
            method="POST",
            speech_timeout="auto",
            timeout=10,
            language="en-US"
        )
        response.append(gather)
        
        # Fallback if no input
        response.say("I didn't catch that. Please try speaking again.", voice="alice")
        response.redirect("/voice/webhook/gather")
        
        return Response(content=str(response), media_type="application/xml")
        
    except Exception as e:
        logger.error(f"Error handling outbound call: {str(e)}")
        response = VoiceResponse()
        response.say("I'm sorry, there was an error. Please try calling again later.", voice="alice")
        return Response(content=str(response), media_type="application/xml")

@router.post("/webhook/gather")
async def handle_speech_input(request: Request):
    """
    Handle speech input from the user
    """
    try:
        form_data = await request.form()
        call_sid = form_data.get("CallSid")
        speech_result = form_data.get("SpeechResult", "").strip()
        confidence = float(form_data.get("Confidence", "0"))
        
        logger.info(f"Speech input for {call_sid}: '{speech_result}' (confidence: {confidence})")
        
        # Get conversation state
        state = get_or_create_conversation_state(call_sid)
        
        if not speech_result or confidence < 0.3:
            # Low confidence or no speech detected
            response = VoiceResponse()
            response.say("I didn't quite catch that. Could you please speak a bit more clearly?", voice="alice")
            gather = Gather(
                input="speech",
                action="/voice/webhook/gather",
                method="POST",
                speech_timeout="auto",
                timeout=10,
                language="en-US"
            )
            response.append(gather)
            response.say("I'm still here if you'd like to try again.", voice="alice")
            return Response(content=str(response), media_type="application/xml")
        
        # Add user message to history
        state.message_history.append({
            "role": "user",
            "content": speech_result
        })
        
        # Check for goodbye/end call phrases
        goodbye_phrases = ["goodbye", "bye", "end call", "hang up", "stop", "quit", "exit"]
        if any(phrase in speech_result.lower() for phrase in goodbye_phrases):
            response = VoiceResponse()
            response.say("Thank you for talking with me today. Take care and remember, I'm always here when you need someone to listen. Goodbye!", voice="alice")
            response.hangup()
            return Response(content=str(response), media_type="application/xml")
        
        # Get AI response
        ai_response = call_ai_chat_api(
            message=speech_result,
            message_history=state.message_history,
            mood=state.current_mood,
            risk_score=state.risk_score
        )
        
        # Add AI response to history
        state.message_history.append({
            "role": "assistant",
            "content": ai_response
        })
        
        # Create TwiML response
        response = VoiceResponse()
        response.say(ai_response, voice="alice", language="en-US")
        
        # Continue the conversation
        gather = Gather(
            input="speech",
            action="/voice/webhook/gather",
            method="POST",
            speech_timeout="auto",
            timeout=10,
            language="en-US"
        )
        response.append(gather)
        
        # Fallback
        response.say("I'm still here if you'd like to continue our conversation.", voice="alice")
        response.redirect("/voice/webhook/gather")
        
        return Response(content=str(response), media_type="application/xml")
        
    except Exception as e:
        logger.error(f"Error handling speech input: {str(e)}")
        response = VoiceResponse()
        response.say("I'm sorry, I'm having trouble understanding right now. Let's try again.", voice="alice")
        response.redirect("/voice/webhook/gather")
        return Response(content=str(response), media_type="application/xml")

@router.post("/webhook/status")
async def handle_call_status(request: Request):
    """
    Handle call status updates (call ended, etc.)
    """
    try:
        form_data = await request.form()
        call_sid = form_data.get("CallSid")
        call_status = form_data.get("CallStatus")
        call_duration = form_data.get("CallDuration")
        
        logger.info(f"Call {call_sid} status: {call_status}, duration: {call_duration}")
        
        # Clean up conversation state when call ends
        if call_status in ["completed", "busy", "no-answer", "failed", "canceled"]:
            if call_sid in conversation_states:
                del conversation_states[call_sid]
                logger.info(f"Cleaned up conversation state for call {call_sid}")
        
        return Response(content="OK", media_type="text/plain")
        
    except Exception as e:
        logger.error(f"Error handling call status: {str(e)}")
        return Response(content="OK", media_type="text/plain")

@router.get("/conversations")
async def get_active_conversations():
    """
    Get list of active conversations (for debugging/monitoring)
    """
    return {
        "active_conversations": len(conversation_states),
        "conversations": [
            {
                "call_sid": call_sid,
                "message_count": len(state.message_history),
                "is_active": state.is_active
            }
            for call_sid, state in conversation_states.items()
        ]
    }

@router.delete("/conversations/{call_sid}")
async def end_conversation(call_sid: str):
    """
    Manually end a conversation (for testing)
    """
    if call_sid in conversation_states:
        del conversation_states[call_sid]
        return {"message": f"Conversation {call_sid} ended"}
    else:
        raise HTTPException(status_code=404, detail="Conversation not found")
