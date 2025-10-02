#!/usr/bin/env python3
"""
Example script for making outbound AI calls.
This demonstrates how to use the AI calling system to make calls TO users.
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

def make_ai_call_example():
    """Example of making an outbound AI call"""
    
    # Example 1: Basic AI call
    print("📞 Example 1: Basic AI Call")
    basic_call = {
        "to_number": "+1234567890",  # Replace with actual phone number
        "user_id": "user123"
    }
    
    print(f"Making basic call to {basic_call['to_number']}...")
    # Uncomment to make actual call:
    # response = requests.post(f"{BACKEND_URL}/ai-calling/initiate-ai-call", json=basic_call)
    # print(f"Response: {response.json()}")
    
    # Example 2: AI call with mood context
    print("\n📞 Example 2: AI Call with Mood Context")
    mood_call = {
        "to_number": "+1234567890",  # Replace with actual phone number
        "user_id": "user456",
        "initial_mood": "stressed"
    }
    
    print(f"Making mood-aware call to {mood_call['to_number']}...")
    # Uncomment to make actual call:
    # response = requests.post(f"{BACKEND_URL}/ai-calling/initiate-ai-call", json=mood_call)
    # print(f"Response: {response.json()}")
    
    # Example 3: AI call with custom prompt
    print("\n📞 Example 3: AI Call with Custom Prompt")
    custom_call = {
        "to_number": "+1234567890",  # Replace with actual phone number
        "user_id": "user789",
        "custom_prompt": "I'm calling to check in on your mental health and see how you're doing today."
    }
    
    print(f"Making custom prompt call to {custom_call['to_number']}...")
    # Uncomment to make actual call:
    # response = requests.post(f"{BACKEND_URL}/ai-calling/initiate-ai-call", json=custom_call)
    # print(f"Response: {response.json()}")

def check_system_health():
    """Check if the system is ready for outbound calls"""
    print("🔍 Checking system health...")
    
    try:
        # Check AI calling health
        response = requests.get(f"{BACKEND_URL}/ai-calling/health", timeout=10)
        if response.status_code == 200:
            print("✅ AI calling service is healthy")
            print(f"   {response.json()}")
        else:
            print(f"❌ AI calling service unhealthy: {response.status_code}")
            
        # Check Twilio configuration
        response = requests.get(f"{BACKEND_URL}/phone/health", timeout=10)
        if response.status_code == 200:
            print("✅ Twilio configuration is healthy")
            print(f"   {response.json()}")
        else:
            print(f"❌ Twilio configuration unhealthy: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Health check failed: {str(e)}")

def main():
    """Main function"""
    print("🤖 AI Outbound Calling Examples")
    print("=" * 50)
    
    # Check system health first
    check_system_health()
    
    print("\n" + "=" * 50)
    print("📞 Outbound Call Examples")
    print("=" * 50)
    
    # Show examples (without making actual calls)
    make_ai_call_example()
    
    print("\n" + "=" * 50)
    print("✅ Examples completed!")
    print("\nTo make actual calls:")
    print("1. Set your TEST_PHONE_NUMBER in .env file")
    print("2. Uncomment the request.post() lines above")
    print("3. Run the script again")
    print("\nThe user will receive a call from your Twilio number with Ruby ready to chat!")

if __name__ == "__main__":
    main()
