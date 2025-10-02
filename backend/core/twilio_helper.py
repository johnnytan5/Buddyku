import os
from twilio.rest import Client
from typing import Optional
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TwilioHelper:
    def __init__(self):
        """Initialize Twilio client with environment variables."""
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_FROM_NUMBER")
        
        if not all([self.account_sid, self.auth_token, self.from_number]):
            raise ValueError("Missing required Twilio environment variables")
        
        self.client = Client(self.account_sid, self.auth_token)
    
    def make_phone_call(self, to_number: str, twiml_url: str = "http://demo.twilio.com/docs/voice.xml") -> dict:
        """
        Make a phone call using Twilio.
        
        Args:
            to_number (str): The phone number to call (e.g., "+1234567890")
            twiml_url (str): The TwiML URL to use for the call (default: demo URL)
        
        Returns:
            dict: Call information including SID and status
        """
        try:
            call = self.client.calls.create(
                url=twiml_url,
                to=to_number,
                from_=self.from_number,
            )
            
            logger.info(f"Call initiated successfully. SID: {call.sid}")
            
            return {
                "success": True,
                "call_sid": call.sid,
                "status": call.status,
                "to": to_number,
                "from": self.from_number,
                "message": "Call initiated successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to make phone call: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to initiate call"
            }
    
    def get_call_status(self, call_sid: str) -> dict:
        """
        Get the status of a specific call.
        
        Args:
            call_sid (str): The SID of the call to check
        
        Returns:
            dict: Call status information
        """
        try:
            call = self.client.calls(call_sid).fetch()
            
            return {
                "success": True,
                "call_sid": call.sid,
                "status": call.status,
                "to": call.to,
                "from": call.from_,
                "duration": call.duration,
                "start_time": call.start_time,
                "end_time": call.end_time
            }
            
        except Exception as e:
            logger.error(f"Failed to get call status: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to retrieve call status"
            }
    
    def list_recent_calls(self, limit: int = 10) -> dict:
        """
        List recent calls.
        
        Args:
            limit (int): Maximum number of calls to return
        
        Returns:
            dict: List of recent calls
        """
        try:
            calls = self.client.calls.list(limit=limit)
            
            call_list = []
            for call in calls:
                call_list.append({
                    "call_sid": call.sid,
                    "status": call.status,
                    "to": call.to,
                    "from": call.from_,
                    "duration": call.duration,
                    "start_time": call.start_time,
                    "end_time": call.end_time
                })
            
            return {
                "success": True,
                "calls": call_list,
                "count": len(call_list)
            }
            
        except Exception as e:
            logger.error(f"Failed to list calls: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to retrieve call list"
            }
