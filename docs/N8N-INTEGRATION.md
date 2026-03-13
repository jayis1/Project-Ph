# n8n Integration Guide

Complete guide for integrating AI Phone with n8n workflows for automation and monitoring.

## Overview

AI Phone sends webhook events for call lifecycle tracking. You can use these events in n8n to:

- **Log calls** to databases or spreadsheets
- **Send notifications** to Slack/Discord/Email when calls complete
- **Trigger automations** based on call outcomes
- **Monitor system health** and call quality
- **Create dashboards** with call analytics

## Webhook Events

### Inbound Calls

Sent to `N8N_WEBHOOK_URL` configured in your `.env`:

| Event | Trigger | Payload |
|-------|---------|---------|
| `start` | Call answered | `{ event, callId, timestamp, from, to }` |
| `speech` | User speaks | `{ event, callId, timestamp, transcript }` |
| `end` | Call hangup | `{ event, callId, timestamp, duration }` |

### Outbound Calls

Sent to `webhookUrl` specified in `/api/outbound-call` request:

| Event | Trigger | Payload |
|-------|---------|---------|
| `queued` | Call initiated | `{ event, callId, timestamp, to }` |
| `dialing` | Calling number | `{ event, callId, timestamp, to }` |
| `playing` | TTS playing | `{ event, callId, timestamp, to, duration }` |
| `conversing` | Two-way conversation started | `{ event, callId, timestamp, to, duration }` |
| `completed` | Call ended successfully | `{ event, callId, timestamp, to, duration, reason }` |
| `failed` | Call failed | `{ event, callId, timestamp, to, duration, reason }` |

## Configuration

### 1. Environment Variables

Add to your `.env` or `docker-compose.yml`:

```bash
# For inbound call webhooks
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/ai-phone-inbound

# Example with n8n cloud
N8N_WEBHOOK_URL=https://app.n8n.cloud/webhook/abc123def456
```

### 2. Per-Call Webhooks (Outbound)

Specify webhook URL when making outbound calls:

```bash
curl -X POST http://localhost:3000/api/outbound-call \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15551234567",
    "message": "Your server is back online",
    "webhookUrl": "https://your-n8n.com/webhook/server-alerts"
  }'
```

---

## Example Workflows

### 1. Call Logger (Basic)

**Purpose**: Log all calls to Google Sheets

**Nodes**:

1. **Webhook** - Trigger on any event
2. **Set** - Format data
3. **Google Sheets** - Append row

**Webhook Configuration**:

- Method: POST
- Path: `ai-phone-inbound`
- Response: `{ "ok": true }`

**Set Node** (extract fields):

```json
{
  "timestamp": "{{ $json.timestamp }}",
  "event": "{{ $json.event }}",
  "callId": "{{ $json.callId }}",
  "from": "{{ $json.from || 'N/A' }}",
  "to": "{{ $json.to || 'N/A' }}",
  "transcript": "{{ $json.transcript || '' }}",
  "duration": "{{ $json.duration || 0 }}"
}
```

**Google Sheets**:

- Sheet: "Call Log"
- Columns: Timestamp, Event, Call ID, From, To, Transcript, Duration

---

### 2. Slack Notifications

**Purpose**: Send Slack message when calls complete

**Nodes**:

1. **Webhook** - Trigger
2. **Switch** - Filter by event type
3. **Slack** - Send message

**Switch Node**:

- Route 1: `{{ $json.event === 'completed' }}`
- Route 2: `{{ $json.event === 'failed' }}`

**Slack Message** (completed):

```
✅ Call completed
• To: {{ $json.to }}
• Duration: {{ $json.duration }}s
• Reason: {{ $json.reason }}
```

**Slack Message** (failed):

```
❌ Call failed
• To: {{ $json.to }}
• Reason: {{ $json.reason }}
```

---

### 3. Conversation Transcription

**Purpose**: Save full conversation transcripts to database

**Nodes**:

1. **Webhook** - Trigger
2. **Switch** - Filter `speech` events
3. **Postgres** - Insert transcript

**Switch Condition**:

```javascript
{{ $json.event === 'speech' }}
```

**Postgres Insert**:

```sql
INSERT INTO call_transcripts (call_id, timestamp, speaker, text)
VALUES (
  '{{ $json.callId }}',
  '{{ $json.timestamp }}',
  'user',
  '{{ $json.transcript }}'
)
```

---

### 4. Alert Escalation

**Purpose**: If outbound alert call fails, escalate to SMS

**Nodes**:

1. **Webhook** - Trigger
2. **Switch** - Check if failed
3. **Twilio** - Send SMS backup

**Switch Condition**:

```javascript
{{ $json.event === 'failed' && $json.reason === 'no_answer' }}
```

**Twilio SMS**:

```
ALERT: Attempted to call {{ $json.to }} but got no answer.
Original message: {{ $json.message }}
```

---

### 5. Call Analytics Dashboard

**Purpose**: Real-time call metrics

**Nodes**:

1. **Webhook** - Trigger
2. **Function** - Calculate metrics
3. **InfluxDB** - Store metrics
4. **Grafana** - Visualize

**Function Node**:

```javascript
const event = $json.event;
const duration = $json.duration || 0;

return {
  measurement: 'gemini_calls',
  tags: {
    event: event,
    to: $json.to
  },
  fields: {
    duration: duration,
    count: 1
  },
  timestamp: new Date($json.timestamp).getTime()
};
```

---

### 6. Voice Command Automation

**Purpose**: Execute actions based on voice commands

**Nodes**:

1. **Webhook** - Trigger on `speech` event
2. **Function** - Parse intent
3. **HTTP Request** - Execute action
4. **Slack** - Confirm

**Function Node** (intent detection):

```javascript
const transcript = $json.transcript.toLowerCase();

if (transcript.includes('restart server')) {
  return {
    action: 'restart',
    target: 'web-server',
    command: 'systemctl restart nginx'
  };
}

if (transcript.includes('check disk')) {
  return {
    action: 'check',
    target: 'disk',
    command: 'df -h'
  };
}

return null; // No action
```

---

## Advanced Patterns

### Multi-Webhook Routing

Send different events to different workflows:

```javascript
// In conversation-loop.js or sip-handler.js
const webhooks = {
  transcripts: process.env.N8N_TRANSCRIPT_WEBHOOK,
  alerts: process.env.N8N_ALERT_WEBHOOK,
  analytics: process.env.N8N_ANALYTICS_WEBHOOK
};

// Send to multiple endpoints
await Promise.all([
  axios.post(webhooks.transcripts, { event: 'speech', ...data }),
  axios.post(webhooks.analytics, { event: 'metrics', ...data })
]);
```

### Webhook Security

Add authentication to your n8n webhooks:

**n8n Webhook Node**:

- Authentication: Header Auth
- Header Name: `X-Webhook-Secret`
- Header Value: `your-secret-key`

**Update voice-app**:

```javascript
await axios.post(n8nConfig.webhook_url, payload, {
  headers: {
    'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET
  }
});
```

### Error Handling

Add retry logic for webhook failures:

```javascript
async function sendWebhookWithRetry(url, payload, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.post(url, payload, { timeout: 5000 });
      if (response.status === 200) return true;
    } catch (err) {
      console.warn(`Webhook attempt ${i + 1} failed:`, err.message);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  return false;
}
```

---

## Testing Webhooks

### 1. Using n8n Test Webhook

1. Create webhook node in n8n
2. Click "Listen for Test Event"
3. Make a test call to AI Phone
4. Verify payload in n8n

### 2. Using RequestBin

```bash
# Get a temporary webhook URL
curl https://requestbin.com/api/v1/bins -X POST

# Set as N8N_WEBHOOK_URL
export N8N_WEBHOOK_URL=https://requestbin.com/r/abc123

# Make test call
curl -X POST http://localhost:3000/api/outbound-call \
  -H "Content-Type: application/json" \
  -d '{"to": "9000", "message": "Test", "webhookUrl": "https://requestbin.com/r/abc123"}'
```

### 3. Local Testing with ngrok

```bash
# Start n8n locally
docker run -p 5678:5678 n8nio/n8n

# Expose with ngrok
ngrok http 5678

# Use ngrok URL
export N8N_WEBHOOK_URL=https://abc123.ngrok.io/webhook/ai-phone
```

---

## Troubleshooting

### Webhooks Not Firing

1. **Check environment variable**:

   ```bash
   docker compose exec voice-app env | grep N8N
   ```

2. **Check logs**:

   ```bash
   docker compose logs voice-app | grep Webhook
   ```

3. **Verify n8n webhook is active**:
   - Webhook must be in "Production" mode
   - Workflow must be activated

### 404 Errors

The logs show `Failed to send start: Request failed with status code 404`. This means:

1. **N8N_WEBHOOK_URL is not set** - Add to `.env`
2. **Webhook path is wrong** - Check n8n webhook URL
3. **Workflow is not activated** - Activate in n8n

**Fix**:

```bash
# Add to .env
echo "N8N_WEBHOOK_URL=https://your-n8n.com/webhook/ai-phone" >> .env

# Restart services
docker compose restart voice-app
```

### Payload Issues

If n8n isn't receiving expected data:

1. **Check webhook node settings** - Set "Response Mode" to "Last Node"
2. **Verify JSON parsing** - n8n should auto-detect JSON
3. **Check payload in logs** - Add console.log before sending

---

## Production Recommendations

1. **Use HTTPS** - Always use secure webhooks in production
2. **Add authentication** - Use header auth or API keys
3. **Monitor webhook health** - Track delivery success rates
4. **Set timeouts** - Don't let webhook failures block calls
5. **Rate limit** - Prevent webhook spam from affecting n8n
6. **Use async** - Send webhooks without blocking call flow

---

## Example: Complete Monitoring Stack

```yaml
# docker-compose.yml additions
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=changeme
    volumes:
      - n8n_data:/home/node/.n8n

  influxdb:
    image: influxdb:2.7
    ports:
      - "8086:8086"
    volumes:
      - influxdb_data:/var/lib/influxdb2

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  n8n_data:
  influxdb_data:
  grafana_data:
```

**Workflow**: Webhook → Parse → InfluxDB → Grafana Dashboard

This gives you real-time call analytics, success rates, average duration, and more.
