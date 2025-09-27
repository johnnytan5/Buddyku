from fastapi import HTTPException, Request
from twilio.request_validator import RequestValidator
import os
import logging

logger = logging.getLogger(__name__)

def validate_twilio_webhook(request: Request) -> bool:
    """
    Validate that the webhook request is actually from Twilio.
    This helps prevent unauthorized access to your webhook endpoints.
    """
    try:
        # Get Twilio auth token from environment
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        if not auth_token:
            logger.warning("TWILIO_AUTH_TOKEN not set - webhook validation disabled")
            return True  # Allow in development if not configured
        
        # Get the full URL for validation
        url = str(request.url)
        
        # Get form data for validation
        form_data = {}
        if hasattr(request, '_form'):
            form_data = request._form
        else:
            # Parse form data from request body
            body = request.body()
            if body:
                from urllib.parse import parse_qs
                form_data = parse_qs(body.decode())
        
        # Create validator
        validator = RequestValidator(auth_token)
        
        # Validate the request
        is_valid = validator.validate(url, form_data, request.headers.get("X-Twilio-Signature", ""))
        
        if not is_valid:
            logger.warning("Invalid Twilio webhook signature")
            return False
            
        return True
        
    except Exception as e:
        logger.error(f"Error validating Twilio webhook: {str(e)}")
        return False

def require_twilio_webhook(request: Request):
    """
    Dependency to require valid Twilio webhook authentication.
    Use this as a dependency in your webhook endpoints.
    """
    if not validate_twilio_webhook(request):
        raise HTTPException(
            status_code=403, 
            detail="Invalid webhook signature - request not from Twilio"
        )
    return True
