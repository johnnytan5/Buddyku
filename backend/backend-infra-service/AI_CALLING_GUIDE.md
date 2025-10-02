# AI Calling Agent Setup Guide (Outbound Calls Only)

This guide explains how to set up and use the AI calling agent that makes outbound calls to users with Ruby, your AI companion.

## Overview

The AI calling agent makes outbound calls TO users, allowing them to have voice conversations with Ruby, your AI companion. The system uses:
- **Twilio Voice API** for making outbound phone calls
- **Your existing AI chat system** for conversation intelligence
- **Speech-to-text and text-to-speech** for natural voice interaction
- **Real-time conversation tracking** with mood and risk assessment

## Architecture

```
Your API → Twilio → User's Phone → Ruby AI Conversation → User
```

## Setup Steps

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Existing Twilio credentials
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890

# Backend URL (for webhooks)
BACKEND_URL=https://your-backend-domain.com

# Optional: For production
TWILIO_WEBHOOK_SECRET=your_webhook_secret
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Twilio Webhooks (Optional for Outbound)

For outbound calls, you don't need to configure webhook URLs in Twilio Console since the webhook URL is passed directly when making the call. However, you can set a default webhook URL if needed.

### 4. Test the Setup

#### Health Check
```bash
curl https://your-backend-domain.com/ai-calling/health
```

#### Initiate an AI Call
```bash
curl -X POST "https://your-backend-domain.com/ai-calling/initiate-ai-call" \
  -H "Content-Type: application/json" \
  -d '{
    "to_number": "+1234567890",
    "user_id": "user123",
    "initial_mood": "neutral"
  }'
```

## API Endpoints

### AI Calling Management

#### POST `/ai-calling/initiate-ai-call`
Start an AI-powered phone call.

**Request:**
```json
{
  "to_number": "+1234567890",
  "user_id": "optional_user_id",
  "initial_mood": "happy|neutral|sad|stressed",
  "custom_prompt": "optional_custom_instructions"
}
```

**Response:**
```json
{
  "success": true,
  "call_sid": "CA1234567890abcdef",
  "status": "queued",
  "to": "+1234567890",
  "from_number": "+15551234567",
  "message": "AI call initiated successfully",
  "webhook_url": "https://your-backend.com/voice/webhook/answer"
}
```

#### GET `/ai-calling/call/{call_sid}/analytics`
Get conversation analytics for a call.

#### GET `/ai-calling/calls/active`
Get list of active AI calls.

#### POST `/ai-calling/call/{call_sid}/end`
Manually end a call.

### Voice Webhooks (Internal)

#### POST `/voice/webhook/answer`
Handles incoming calls and starts the AI conversation.

#### POST `/voice/webhook/gather`
Processes user speech input and generates AI responses.

#### POST `/voice/webhook/status`
Handles call status updates (call ended, etc.).

## How It Works

### 1. Outbound Call Initiation
When you call the `/ai-calling/initiate-ai-call` endpoint:
- Your system makes a call TO the user's phone number
- Twilio calls the user's phone
- When the user answers, your webhook at `/voice/webhook/answer` handles the call
- Ruby introduces herself and starts the conversation

### 2. Conversation Flow
1. **User answers the call** → Ruby greets them
2. **User speaks** → Twilio converts to text
3. **Text sent to AI** → Your existing chat API processes the message
4. **AI responds** → Text converted to speech by Twilio
5. **Cycle repeats** → Natural conversation continues

### 3. Conversation Features
- **Mood tracking**: Ruby can detect and respond to user emotions
- **Risk assessment**: Suicide detection and crisis intervention
- **Memory**: Conversation history maintained throughout the call
- **Natural endings**: Users can say "goodbye" to end the call
- **Personalized greetings**: Based on user context and mood

## Customization

### Custom Prompts
You can customize Ruby's behavior by passing a `custom_prompt`:

```json
{
  "to_number": "+1234567890",
  "custom_prompt": "Focus on helping the user with anxiety management techniques"
}
```

### Mood Context
Set initial mood for more personalized conversations:

```json
{
  "to_number": "+1234567890",
  "initial_mood": "stressed",
  "user_id": "user123"
}
```

## Production Considerations

### 1. Security
- Enable webhook signature validation in production
- Use HTTPS for all webhook URLs
- Implement rate limiting for call initiation

### 2. Scalability
- Use Redis or database for conversation state storage
- Implement call queuing for high volume
- Add monitoring and alerting

### 3. Analytics
- Track call duration, conversation length
- Monitor mood changes during calls
- Analyze conversation topics and outcomes

## Testing

### Local Development
1. Use ngrok to expose your local server:
   ```bash
   ngrok http 8000
   ```
2. Update Twilio webhook URL to your ngrok URL
3. Test with your phone number

### Production Testing
1. Use Twilio's test credentials for development
2. Test with verified phone numbers only
3. Monitor logs for any issues

## Troubleshooting

### Common Issues

1. **Webhook not receiving calls**
   - Check webhook URL in Twilio console
   - Verify HTTPS is working
   - Check server logs for errors

2. **AI not responding**
   - Verify your chat API is working
   - Check BACKEND_URL environment variable
   - Review conversation state management

3. **Poor speech recognition**
   - Check Twilio's speech recognition settings
   - Verify language settings
   - Test with clear, slow speech

### Debug Endpoints

- `/voice/conversations` - View active conversations
- `/ai-calling/health` - Check service health
- `/phone/health` - Check Twilio configuration

## Example Usage

### Python Client
```python
import requests

# Start an AI call
response = requests.post("https://your-backend.com/ai-calling/initiate-ai-call", json={
    "to_number": "+1234567890",
    "user_id": "user123",
    "initial_mood": "neutral"
})

call_sid = response.json()["call_sid"]
print(f"Call started: {call_sid}")

# Check call status
status = requests.get(f"https://your-backend.com/phone/call/{call_sid}/status")
print(f"Call status: {status.json()}")
```

### JavaScript Client
```javascript
// Start an AI call
const response = await fetch('https://your-backend.com/ai-calling/initiate-ai-call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to_number: '+1234567890',
    user_id: 'user123',
    initial_mood: 'neutral'
  })
});

const data = await response.json();
console.log('Call started:', data.call_sid);
```

## Next Steps

1. **Set up your Twilio account** and get your credentials
2. **Configure webhook URLs** in Twilio console
3. **Test with a simple call** to verify everything works
4. **Customize Ruby's personality** for your use case
5. **Add analytics and monitoring** for production use
6. **Scale up** with proper database and caching

Your AI calling agent is now ready to provide voice-based emotional support and companionship through phone calls!
