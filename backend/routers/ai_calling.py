from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import logging
from core.twilio_helper import TwilioHelper
import os
import json
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-calling", tags=["ai_calling"])

# Pydantic models
class AICallRequest(BaseModel):
    to_number: str
    name: str
    emergency_number: str
    emergency_contact_name: str
    context: str
    custom_prompt: str
    user_id: str
    initial_mood: Optional[str] = None
    
    @validator('to_number')
    def validate_phone_number(cls, v):
        import re
        if not re.match(r'^\+[1-9]\d{1,14}$', v):
            raise ValueError('Phone number must be in E.164 format (e.g., +1234567890)')
        return v
    
    @validator('emergency_number')
    def validate_emergency_phone_number(cls, v):
        import re
        if not re.match(r'^\+[1-9]\d{1,14}$', v):
            raise ValueError('Emergency phone number must be in E.164 format (e.g., +1234567890)')
        return v

class AICallResponse(BaseModel):
    success: bool
    call_sid: str = None
    status: str = None
    to: str = None
    from_number: str = None
    message: str = None
    error: str = None
    webhook_url: str = None

class CallAnalytics(BaseModel):
    call_sid: str
    user_id: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    duration: Optional[int]
    message_count: int
    mood_detected: Optional[str]
    risk_score: Optional[float]
    conversation_summary: Optional[str]

# Dependency to get TwilioHelper instance
def get_twilio_helper():
    try:
        return TwilioHelper()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"Twilio configuration error: {str(e)}")

@router.post("/initiate-ai-call", response_model=AICallResponse)
async def initiate_ai_call(
    request: AICallRequest,
    twilio: TwilioHelper = Depends(get_twilio_helper)
):
    """
    Initiate an outbound AI-powered phone call with Ruby, your AI companion.
    
    This endpoint makes a call TO the user (outbound) and Ruby will start the conversation.
    The user will receive a call from your Twilio number with Ruby ready to chat.
    """
    try:
        # Get the webhook URL for voice interactions
        backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        webhook_url = f"{backend_url}/voice/webhook/answer"
        
        # Add user context to webhook URL if provided
        if any([request.initial_mood, request.custom_prompt, request.name, request.emergency_number, request.emergency_contact_name, request.context]):
            params = {}
            if request.user_id:
                params["user_id"] = request.user_id
            if request.initial_mood:
                params["mood"] = request.initial_mood
            if request.custom_prompt:
                params["custom_prompt"] = request.custom_prompt
            if request.name:
                params["name"] = request.name
            if request.emergency_number:
                params["emergency_number"] = request.emergency_number
            if request.emergency_contact_name:
                params["emergency_contact_name"] = request.emergency_contact_name
            if request.context:
                params["context"] = request.context
            
            if params:
                from urllib.parse import urlencode
                webhook_url += "?" + urlencode(params)
        
        logger.info(f"Making outbound AI call to {request.to_number} (Name: {request.name}) with webhook: {webhook_url}")
        
        # Make the outbound call using Twilio
        result = twilio.make_phone_call(
            to_number=request.to_number,
            twiml_url=webhook_url
        )
        
        if result["success"]:
            # Store call metadata for analytics
            call_metadata = {
                "call_sid": result["call_sid"],
                "user_id": request.user_id,
                "name": request.name,
                "emergency_number": request.emergency_number,
                "emergency_contact_name": request.emergency_contact_name,
                "context": request.context,
                "custom_prompt": request.custom_prompt,
                "initial_mood": request.initial_mood,
                "start_time": datetime.now().isoformat(),
                "webhook_url": webhook_url,
                "call_type": "outbound_ai_call"
            }
            
            # In production, store this in a database
            logger.info(f"Outbound call metadata: {call_metadata}")
            
            return AICallResponse(
                success=True,
                call_sid=result["call_sid"],
                status=result["status"],
                to=result["to"],
                from_number=result["from"],
                message=f"Outbound AI call initiated for {request.name} - Ruby will call shortly",
                webhook_url=webhook_url
            )
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Failed to initiate outbound AI call: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate outbound AI call: {str(e)}")

@router.get("/call/{call_sid}/analytics")
async def get_call_analytics(call_sid: str):
    """
    Get analytics and conversation data for a specific call.
    """
    try:
        # In production, this would fetch from a database
        # For now, we'll return basic information
        return {
            "call_sid": call_sid,
            "message": "Analytics endpoint - implement database storage for production",
            "note": "This would typically include conversation summary, mood analysis, duration, etc."
        }
        
    except Exception as e:
        logger.error(f"Failed to get call analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get call analytics: {str(e)}")

@router.get("/calls/active")
async def get_active_ai_calls():
    """
    Get list of currently active AI calls.
    """
    try:
        # This would typically query a database for active calls
        return {
            "active_calls": 0,
            "message": "Active calls endpoint - implement database tracking for production"
        }
        
    except Exception as e:
        logger.error(f"Failed to get active calls: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get active calls: {str(e)}")

@router.post("/call/{call_sid}/end")
async def end_ai_call(call_sid: str):
    """
    Manually end an AI call (for testing/emergency purposes).
    """
    try:
        # In production, this would use Twilio's API to hang up the call
        return {
            "call_sid": call_sid,
            "message": "Call end requested",
            "note": "Implement Twilio call termination in production"
        }
        
    except Exception as e:
        logger.error(f"Failed to end call: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to end call: {str(e)}")

@router.get("/health")
async def ai_calling_health():
    """
    Health check for AI calling service.
    """
    try:
        twilio = TwilioHelper()
        return {
            "status": "healthy",
            "message": "AI calling service is properly configured",
            "twilio_account_sid": twilio.account_sid[:8] + "..." if twilio.account_sid else None,
            "webhook_url": f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/voice/webhook/answer"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"AI calling service configuration error: {str(e)}"
        }
