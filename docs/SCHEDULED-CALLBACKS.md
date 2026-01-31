# Scheduled Callback Feature

## Overview

The Gemini Phone system now supports scheduled callbacks, allowing AI crew members to call you back after a specified delay. This is useful for:

- Server monitoring alerts ("Call me back in 5 minutes with the server status")
- Reminder callbacks ("Call me in 1 hour to remind me about the meeting")
- Delayed notifications ("Call me back in 30 seconds to test this feature")

## How It Works

### During a Phone Call

When you're on a call with any crew member, you can request a callback:

**Examples:**

- "Call me back in 5 minutes with the server status"
- "Remind me in 1 hour about the backup"
- "Call me in 30 seconds to test this"

The AI will:

1. Acknowledge your request
2. Schedule the callback
3. End the current call
4. Call you back at the specified time with the requested information

### Supported Time Formats

- **Seconds**: "30 seconds", "45 sec"
- **Minutes**: "5 minutes", "10 min"
- **Hours**: "1 hour", "2 hours", "3 hr"

### AI Response Format

The AI uses special markers in its response to trigger callbacks:

#### Immediate Callback

```
I'll call them now. 🗣️ CALLBACK: +15551234567
```

#### Scheduled Callback

```
I'll call back in 5 minutes. 🗣️ SCHEDULED_CALLBACK: +15551234567 | 5 minutes | Here's your server status
```

Format: `🗣️ SCHEDULED_CALLBACK: <phone_number> | <delay> | <message>`

## API Endpoints

### List Scheduled Callbacks

```bash
GET /api/callbacks
```

**Response:**

```json
{
  "success": true,
  "count": 2,
  "callbacks": [
    {
      "id": "CB1",
      "phoneNumber": "+15551234567",
      "message": "Here's your server status",
      "scheduledTime": "2026-01-31T19:15:00.000Z",
      "deviceName": "Morpheus"
    }
  ]
}
```

### Get Specific Callback

```bash
GET /api/callbacks/:id
```

**Response:**

```json
{
  "success": true,
  "callback": {
    "id": "CB1",
    "phoneNumber": "+15551234567",
    "message": "Here's your server status",
    "scheduledTime": "2026-01-31T19:15:00.000Z",
    "deviceName": "Morpheus"
  }
}
```

### Cancel Scheduled Callback

```bash
DELETE /api/callbacks/:id
```

**Response:**

```json
{
  "success": true,
  "message": "Callback cancelled"
}
```

## Implementation Details

### System Context

The conversation loop includes callback instructions in the system context:

```
[SYSTEM] CALLBACK CAPABILITIES:
- Immediate callback: "I'll call them now. 🗣️ CALLBACK: <number>"
- Scheduled callback: "I'll call back in X. 🗣️ SCHEDULED_CALLBACK: <number> | <delay> | <message>"
  Examples: "🗣️ SCHEDULED_CALLBACK: +15551234567 | 5 minutes | Here's your server status"
```

### Detection Logic

The conversation loop detects callback requests using regex patterns:

```javascript
// Immediate callback
const callbackMatch = geminiResponse.match(/🗣️\s*CALLBACK:\s*([+\d]+)/im);

// Scheduled callback
const scheduledMatch = geminiResponse.match(/🗣️\s*SCHEDULED_CALLBACK:\s*([+\d]+)\s*\|\s*([^|]+)\s*\|\s*(.+)/im);
```

### Storage

Scheduled callbacks are stored in-memory using a Map. In production, this should be persisted to a database to survive restarts.

### Execution

Callbacks are executed using `setTimeout` with the parsed delay. The system calls `initiateOutboundCall` with the specified message and phone number.

## Example Workflow

1. **User calls Morpheus** (extension 9000)
2. **User says**: "Call me back in 5 minutes with the server CPU usage"
3. **Morpheus responds**: "I'll call you back in 5 minutes with the server CPU usage."
4. **System detects**: `🗣️ SCHEDULED_CALLBACK: +15551234567 | 5 minutes | Here's the server CPU usage`
5. **Call ends**
6. **5 minutes later**: Morpheus calls back with "Here's the server CPU usage: ..."

## Testing

### Test Immediate Callback

```bash
# Call extension 9000
# Say: "Call me back right now"
# Morpheus should end the call and immediately call you back
```

### Test Scheduled Callback

```bash
# Call extension 9000
# Say: "Call me back in 30 seconds to test this feature"
# Wait 30 seconds
# Morpheus should call you back
```

### Check Scheduled Callbacks

```bash
curl http://localhost:3000/api/callbacks
```

### Cancel a Callback

```bash
curl -X DELETE http://localhost:3000/api/callbacks/CB1
```

## Future Enhancements

- **Persistent storage**: Store callbacks in database
- **Recurring callbacks**: Support daily/weekly callbacks
- **Callback history**: Track completed callbacks
- **Web UI**: Manage callbacks via Mission Control dashboard
- **Calendar integration**: Schedule callbacks based on calendar events
