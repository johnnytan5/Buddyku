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
from core.twilio_helper import TwilioHelper

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice_webhooks"])

# Store conversation state (in production, use Redis or database)
conversation_states = {}

def debug_conversation_states():
    logger.info(f"Total conversation states: {len(conversation_states)}")
    for call_sid, state in conversation_states.items():
        logger.info(f"State {call_sid}: emergency_contact_number={state.emergency_contact_number}")

class ConversationState:
    def __init__(self, call_sid: str):
        self.call_sid = call_sid
        self.message_history = []
        self.current_mood = None
        self.risk_score = None
        self.is_active = True
        self.ai_response_count = 0
        self.emergency_contact_number = None 
        self.emergency_contact_name = None 
        self.user_name = None  
        self.context = None 
        self.custom_prompt = None 

def get_or_create_conversation_state(call_sid: str) -> ConversationState:
    """Get or create conversation state for a call"""
    debug_conversation_states()  # Debug: Check all states
    if call_sid not in conversation_states:
        conversation_states[call_sid] = ConversationState(call_sid)
        logger.info(f"Created new conversation state for {call_sid}")
    else:
        logger.info(f"Retrieved existing conversation state for {call_sid}")
    return conversation_states[call_sid]

def call_ai_chat_api(message: str, message_history: list = None, mood: str = None, risk_score: float = None, custom_prompt: str = None) -> str:
    """Call the existing AI chat API to get response"""
    try:
        # Get the backend URL from environment or use localhost
        backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        chat_url = f"{backend_url}/api/chat"
        
        payload = {
            "message": message,
            "message_history": message_history or [],
            "mood": mood,
            "risk_score": risk_score,
            "custom_prompt": custom_prompt
        }
        
        logger.info(f"Calling AI chat API with payload: {payload}")
        
        response = requests.post(chat_url, json=payload, timeout=30)
        
        if response.status_code == 200:
            # Handle streaming response properly
            ai_response = ""
            try:
                # Try to get JSON response first
                data = response.json()
                ai_response = data.get("message", "I'm here to help.")
            except:
                # Fallback to text response
                ai_response = response.text.strip()
            
            logger.info(f"AI Response: {ai_response}")
            return ai_response
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

        logger.info(f"=== CALL SID DEBUG ===")
        logger.info(f"Outbound call SID: {call_sid}")
        
        # Get user context from query parameters
        user_id = request.query_params.get("user_id")
        initial_mood = request.query_params.get("mood")
        custom_prompt = request.query_params.get("custom_prompt")
        emergency_number = request.query_params.get("emergency_number") 
        emergency_contact_name = request.query_params.get("emergency_contact_name")  
        name = request.query_params.get("name")
        context = request.query_params.get("context")
        
        logger.info(f"Outbound call to {to_number}, CallSid: {call_sid}, User: {user_id}")
        # Debug logging
        logger.info(f"=== WEBHOOK DEBUG ===")
        logger.info(f"Emergency number from form: {emergency_number}")
        logger.info(f"Emergency contact name from form: {emergency_contact_name}")
        logger.info(f"Name from form: {name}")
        logger.info(f"Context from form: {context}")
        
        # Create conversation state with user context
        state = get_or_create_conversation_state(call_sid)
        state.current_mood = initial_mood
        state.user_id = user_id
        state.emergency_contact_number = emergency_number
        state.emergency_contact_name = emergency_contact_name  
        state.user_name = name 
        state.context = context 
        state.custom_prompt = custom_prompt
        
        # Create TwiML response
        response = VoiceResponse()

        # Personalized welcome message based on context
        user_name = state.user_name or "Johnny"  # Get the user's name

        if custom_prompt:
            # Give user a supportive crisis message instead
            welcome_message = f"Hello {user_name}! I'm Ruby, your AI companion. I'm here to provide immediate support and listen to you. How are you feeling right now?"
        elif initial_mood and initial_mood != "neutral":
            welcome_message = f"Hello {user_name}! I'm Ruby, your AI companion. I understand you might be feeling {initial_mood} today. I'm here to listen and support you. How are you doing?"
        else:
            welcome_message = f"Hello {user_name}! I'm Ruby, your AI companion. I'm here to listen and chat with you. How are you feeling today?"

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

        logger.info(f"=== SPEECH CALL SID DEBUG ===")
        logger.info(f"Speech input SID: {call_sid}")
        
        logger.info(f"Speech input for {call_sid}: '{speech_result}' (confidence: {confidence})")
        
        # Get conversation state
        state = get_or_create_conversation_state(call_sid)

        # DEBUG: Check if state has the data
        logger.info(f"=== STATE DEBUG ===")
        logger.info(f"Call SID: {call_sid}")
        logger.info(f"State emergency_contact_number: {state.emergency_contact_number}")
        logger.info(f"State emergency_contact_name: {state.emergency_contact_name}")
        logger.info(f"State user_name: {state.user_name}")
        logger.info(f"State context: {state.context}")
        logger.info(f"State AI response count: {state.ai_response_count}")
        
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
            risk_score=state.risk_score,
            custom_prompt=state.custom_prompt
        )
        
        # Add AI response to history
        state.message_history.append({
            "role": "assistant",
            "content": ai_response
        })

        # Increment AI response counter
        state.ai_response_count += 1
        
        # Create TwiML response
        response = VoiceResponse()
        response.say(ai_response, voice="alice", language="en-US")

        # Check if we should transfer to emergency contact (after 2-3 responses)
        if state.ai_response_count >= 2:  # Adjust this number as needed
            # Create conference room
            conference_name = f"crisis_support_{call_sid}"
            
            response.say("I'm now connecting you with your emergency contact who can provide additional support.", voice="alice")
            
            # Put current user in conference
            response.dial().conference(
                conference_name,
                start_conference_on_enter=True,
                end_conference_on_exit=False,
                wait_url="/voice/webhook/conference-wait"
            )
            
            logger.info(f"=== EMERGENCY CONTACT DEBUG ===")
            logger.info(f"Emergency contact number: {state.emergency_contact_number}")
            logger.info(f"Emergency contact name: {state.emergency_contact_name}")
            logger.info(f"User name: {state.user_name}")
            logger.info(f"Context: {state.context}")
            logger.info(f"AI response count: {state.ai_response_count}")

            # Initiate call to emergency contact here
            if state.emergency_contact_number:
                logger.info(f"✅ Attempting to call emergency contact: {state.emergency_contact_number}")
                try:
                    twilio = TwilioHelper()
                    
                    # Get backend URL for emergency contact webhook
                    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
                    emergency_webhook_url = f"{backend_url}/voice/webhook/emergency-call"
                    
                    # Add context as query parameters
                    params = {
                        "user_name": state.user_name or "the user",
                        "context": state.context or "crisis situation", 
                        "emergency_contact_name": state.emergency_contact_name or "emergency contact",
                        "conference_name": conference_name
                    }
                    
                    from urllib.parse import urlencode
                    emergency_webhook_url += "?" + urlencode(params)
                    
                    # Make the emergency contact call
                    emergency_result = twilio.make_phone_call(
                        to_number=state.emergency_contact_number,
                        twiml_url=emergency_webhook_url
                    )
                    
                    if emergency_result["success"]:
                        logger.info(f"Emergency contact call initiated: {emergency_result['call_sid']}")
                    else:
                        logger.warning(f"Failed to call emergency contact: {emergency_result['error']}")
                        
                except Exception as e:
                    logger.error(f"Error calling emergency contact: {str(e)}")
            
            return Response(content=str(response), media_type="application/xml")
        
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


@router.post("/webhook/conference-wait")
async def handle_conference_wait(request: Request):
    """Handle conference wait music while calling emergency contact"""
    try:
        form_data = await request.form()
        call_sid = form_data.get("CallSid")
        retry = request.query_params.get("retry", "0")
        
        response = VoiceResponse()
        
        if retry == "0":
            # First time - play wait music and brief message
            response.say("Please hold while we connect you with your emergency contact.", voice="alice")
            response.play("https://demo.twilio.com/docs/classic.mp3")
            response.pause(length=10)
            response.say("Connecting you now...", voice="alice")
            response.redirect(f"/voice/webhook/conference-wait?retry=1")
        else:
            # Retry - continue waiting in conference
            response.say("Please continue to hold.", voice="alice")
            response.pause(length=20)
            response.say("If your emergency contact doesn't answer, please stay on the line and I'll continue to support you.", voice="alice")
        
        return Response(content=str(response), media_type="application/xml")
        
    except Exception as e:
        logger.error(f"Error handling conference wait: {str(e)}")
        response = VoiceResponse()
        response.say("I'm sorry, there was an error connecting to your emergency contact.", voice="alice")
        response.hangup()
        return Response(content=str(response), media_type="application/xml")
@router.post("/webhook/emergency-call")
async def handle_emergency_contact_call(request: Request):
    """Handle when emergency contact answers"""
    try:
        form_data = await request.form()
        call_sid = form_data.get("CallSid")
        
        # Get context from query params (not form_data)
        user_name = request.query_params.get("user_name", "the user")
        context = request.query_params.get("context", "crisis situation")
        emergency_contact_name = request.query_params.get("emergency_contact_name", "emergency contact")
        conference_name = request.query_params.get("conference_name", f"crisis_support_{call_sid}")
        
        response = VoiceResponse()
        
        # Brief the emergency contact
        response.say(f"Hello {emergency_contact_name}, this is an emergency call regarding {user_name}. "
                    f"They are experiencing a crisis and need immediate support. "
                    f"Context: {context}. "
                    f"Please join the conference to speak with them directly.", 
                    voice="alice")
        
        # Join the conference using the passed conference name
        response.dial().conference(
            conference_name,
            start_conference_on_enter=True,
            end_conference_on_exit=False
        )
        
        return Response(content=str(response), media_type="application/xml")
        
    except Exception as e:
        logger.error(f"Error handling emergency contact call: {str(e)}")
        response = VoiceResponse()
        response.say("I'm sorry, there was an error. Please try calling again later.", voice="alice")
        response.hangup()
        return Response(content=str(response), media_type="application/xml")