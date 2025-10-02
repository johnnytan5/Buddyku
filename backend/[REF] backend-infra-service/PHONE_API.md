# Phone API Documentation

This document describes the phone calling functionality using Twilio integration.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Twilio credentials
   ```

3. Required environment variables:
   - `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
   - `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
   - `TWILIO_FROM_NUMBER`: Your Twilio phone number (E.164 format)

## API Endpoints

### 1. Make a Phone Call
**POST** `/phone/call`

Request body:
```json
{
  "to_number": "+1234567890",
  "twiml_url": "http://demo.twilio.com/docs/voice.xml"  // optional
}
```

Response:
```json
{
  "success": true,
  "call_sid": "CA1234567890abcdef1234567890abcdef",
  "status": "queued",
  "to": "+1234567890",
  "from_number": "+15551234567",
  "message": "Call initiated successfully"
}
```

### 2. Get Call Status
**GET** `/phone/call/{call_sid}/status`

Response:
```json
{
  "success": true,
  "call_sid": "CA1234567890abcdef1234567890abcdef",
  "status": "completed",
  "to": "+1234567890",
  "from_number": "+15551234567",
  "duration": "45",
  "start_time": "2024-01-01T12:00:00Z",
  "end_time": "2024-01-01T12:00:45Z"
}
```

### 3. List Recent Calls
**GET** `/phone/calls?limit=10`

Response:
```json
{
  "success": true,
  "calls": [
    {
      "call_sid": "CA1234567890abcdef1234567890abcdef",
      "status": "completed",
      "to": "+1234567890",
      "from": "+15551234567",
      "duration": "45",
      "start_time": "2024-01-01T12:00:00Z",
      "end_time": "2024-01-01T12:00:45Z"
    }
  ],
  "count": 1
}
```

### 4. Health Check
**GET** `/phone/health`

Response:
```json
{
  "status": "healthy",
  "message": "Phone service is properly configured",
  "twilio_account_sid": "AC1234567..."
}
```

## Usage Examples

### Using curl:
```bash
# Make a phone call
curl -X POST "http://localhost:8000/phone/call" \
  -H "Content-Type: application/json" \
  -d '{"to_number": "+1234567890"}'

# Check call status
curl "http://localhost:8000/phone/call/CA1234567890abcdef1234567890abcdef/status"

# List recent calls
curl "http://localhost:8000/phone/calls?limit=5"
```

### Using Python requests:
```python
import requests

# Make a phone call
response = requests.post("http://localhost:8000/phone/call", json={
    "to_number": "+1234567890"
})
print(response.json())

# Check call status
call_sid = response.json()["call_sid"]
status_response = requests.get(f"http://localhost:8000/phone/call/{call_sid}/status")
print(status_response.json())
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid phone number format, etc.)
- `404`: Call not found
- `500`: Server error (Twilio configuration issues, etc.)

Error responses include:
```json
{
  "detail": "Error message describing what went wrong"
}
```

## Notes

- Phone numbers must be in E.164 format (e.g., +1234567890)
- The default TwiML URL uses Twilio's demo voice instructions
- You can provide custom TwiML URLs for custom call flows
- All calls are logged for debugging purposes
