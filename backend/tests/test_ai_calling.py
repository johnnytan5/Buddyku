#!/usr/bin/env python3
"""
Test script for AI calling functionality.
Run this to test your AI calling setup.
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
TEST_PHONE_NUMBER = os.getenv("TEST_PHONE_NUMBER", "+1234567890")  # Set this in your .env

def test_health_checks():
    """Test all health check endpoints"""
    print("🔍 Testing health checks...")
    
    endpoints = [
        "/health",
        "/phone/health", 
        "/ai-calling/health"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BACKEND_URL}{endpoint}", timeout=10)
            if response.status_code == 200:
                print(f"✅ {endpoint}: {response.json()}")
            else:
                print(f"❌ {endpoint}: HTTP {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint}: {str(e)}")

def test_ai_call_initiation():
    """Test AI call initiation"""
    print("\n📞 Testing AI call initiation...")
    
    payload = {
        "to_number": TEST_PHONE_NUMBER,
        "user_id": "test_user_123",
        "initial_mood": "neutral"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/ai-calling/initiate-ai-call",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ AI call initiated: {data}")
            return data.get("call_sid")
        else:
            print(f"❌ Failed to initiate call: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error initiating call: {str(e)}")
        return None

def test_call_status(call_sid):
    """Test call status checking"""
    if not call_sid:
        print("⏭️ Skipping call status test (no call_sid)")
        return
        
    print(f"\n📊 Testing call status for {call_sid}...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/phone/call/{call_sid}/status", timeout=10)
        
        if response.status_code == 200:
            print(f"✅ Call status: {response.json()}")
        else:
            print(f"❌ Failed to get call status: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error getting call status: {str(e)}")

def test_webhook_endpoints():
    """Test webhook endpoints (basic connectivity)"""
    print("\n🔗 Testing webhook endpoints...")
    
    webhook_endpoints = [
        "/voice/webhook/answer",
        "/voice/webhook/gather", 
        "/voice/webhook/status"
    ]
    
    for endpoint in webhook_endpoints:
        try:
            # Test with a simple GET request (webhooks expect POST, but this tests connectivity)
            response = requests.get(f"{BACKEND_URL}{endpoint}", timeout=5)
            print(f"✅ {endpoint}: Responding (HTTP {response.status_code})")
        except Exception as e:
            print(f"❌ {endpoint}: {str(e)}")

def main():
    """Run all tests"""
    print("🤖 AI Calling Agent Test Suite")
    print("=" * 50)
    
    # Test 1: Health checks
    test_health_checks()
    
    # Test 2: Webhook endpoints
    test_webhook_endpoints()
    
    # Test 3: AI call initiation (only if TEST_PHONE_NUMBER is set)
    if TEST_PHONE_NUMBER != "+1234567890":
        call_sid = test_ai_call_initiation()
        test_call_status(call_sid)
    else:
        print("\n⏭️ Skipping AI call test (set TEST_PHONE_NUMBER in .env)")
    
    print("\n" + "=" * 50)
    print("✅ Test suite completed!")
    print("\nNext steps:")
    print("1. Set your TEST_PHONE_NUMBER in .env file")
    print("2. Configure Twilio webhook URLs")
    print("3. Test with a real phone call")

if __name__ == "__main__":
    main()
