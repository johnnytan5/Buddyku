from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
import re
from core.twilio_helper import TwilioHelper

# Create router
router = APIRouter(prefix="/phone", tags=["phone"])

# Pydantic models for request/response
class PhoneCallRequest(BaseModel):
    to_number: str
    twiml_url: str = "http://demo.twilio.com/docs/voice.xml"
    
    @validator('to_number')
    def validate_phone_number(cls, v):
        # Basic phone number validation (E.164 format)
        if not re.match(r'^\+[1-9]\d{1,14}$', v):
            raise ValueError('Phone number must be in E.164 format (e.g., +1234567890)')
        return v

class PhoneCallResponse(BaseModel):
    success: bool
    call_sid: str = None
    status: str = None
    to: str = None
    from_number: str = None
    message: str = None
    error: str = None

class CallStatusResponse(BaseModel):
    success: bool
    call_sid: str = None
    status: str = None
    to: str = None
    from_number: str = None
    duration: str = None
    start_time: str = None
    end_time: str = None
    error: str = None
    message: str = None

class CallListResponse(BaseModel):
    success: bool
    calls: list = []
    count: int = 0
    error: str = None
    message: str = None

# Dependency to get TwilioHelper instance
def get_twilio_helper():
    try:
        return TwilioHelper()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"Twilio configuration error: {str(e)}")

@router.post("/call", response_model=PhoneCallResponse)
async def make_phone_call(
    request: PhoneCallRequest,
    twilio: TwilioHelper = Depends(get_twilio_helper)
):
    """
    Make a phone call using Twilio.
    
    - **to_number**: Phone number in E.164 format (e.g., +1234567890)
    - **twiml_url**: TwiML URL for call instructions (optional, defaults to demo)
    """
    try:
        result = twilio.make_phone_call(
            to_number=request.to_number,
            twiml_url=request.twiml_url
        )
        
        if result["success"]:
            return PhoneCallResponse(
                success=True,
                call_sid=result["call_sid"],
                status=result["status"],
                to=result["to"],
                from_number=result["from"],
                message=result["message"]
            )
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to make phone call: {str(e)}")

@router.get("/call/{call_sid}/status", response_model=CallStatusResponse)
async def get_call_status(
    call_sid: str,
    twilio: TwilioHelper = Depends(get_twilio_helper)
):
    """
    Get the status of a specific call by its SID.
    """
    try:
        result = twilio.get_call_status(call_sid)
        
        if result["success"]:
            return CallStatusResponse(
                success=True,
                call_sid=result["call_sid"],
                status=result["status"],
                to=result["to"],
                from_number=result["from"],
                duration=result.get("duration"),
                start_time=result.get("start_time"),
                end_time=result.get("end_time")
            )
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get call status: {str(e)}")

@router.get("/calls", response_model=CallListResponse)
async def list_recent_calls(
    limit: int = 10,
    twilio: TwilioHelper = Depends(get_twilio_helper)
):
    """
    List recent phone calls.
    
    - **limit**: Maximum number of calls to return (default: 10)
    """
    try:
        result = twilio.list_recent_calls(limit=limit)
        
        if result["success"]:
            return CallListResponse(
                success=True,
                calls=result["calls"],
                count=result["count"]
            )
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list calls: {str(e)}")

@router.get("/health")
async def phone_service_health():
    """
    Check if the phone service is properly configured.
    """
    try:
        twilio = TwilioHelper()
        return {
            "status": "healthy",
            "message": "Phone service is properly configured",
            "twilio_account_sid": twilio.account_sid[:8] + "..." if twilio.account_sid else None
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Phone service configuration error: {str(e)}"
        }
