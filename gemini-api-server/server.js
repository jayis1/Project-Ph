/**
 * Gemini HTTP API Server
 *
 * HTTP server that wraps Gemini CLI with session management
 * Runs on the API server to handle voice interface queries
 *
 * Usage:
 *   node server.js
 *
 * Endpoints:
 *   POST /ask - Send a prompt to Gemini (with optional callId for session)
 *   POST /end-session - Clean up session for a call
 *   GET /health - Health check
 */

const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  buildQueryContext,
  buildStructuredPrompt,
  tryParseJsonFromText,
  validateRequiredFields,
  buildRepairPrompt,
} = require('./structured');

const app = express();
const PORT = process.env.PORT || 3333;

/**
 * Build the full environment that Gemini CLI expects
 * This mimics what happens when you run `gemini` in a terminal
 * with your zsh profile fully loaded.
 */
function buildGeminiEnvironment() {
  const HOME = process.env.HOME || '/root';
  const PAI_DIR = path.join(HOME, '.gemini');

  // In Docker, we just need basic PATH and the API key
  const env = {
    ...process.env,
    HOME,
    PAI_DIR,
    // CRITICAL: These tell Gemini it's running in the proper environment
    GEMINI: '1',
    GEMINI_ENTRYPOINT: 'cli',
  };

  // Ensure GEMINI_API_KEY is present
  if (!env.GEMINI_API_KEY) {
    console.warn('[WARNING] GEMINI_API_KEY is missing in environment variables!');
  }

  return env;
}

// Pre-build the environment once at startup
const geminiEnv = buildGeminiEnvironment();
console.log('[STARTUP] Loaded environment with', Object.keys(geminiEnv).length, 'variables');
console.log('[STARTUP] PATH includes:', geminiEnv.PATH.split(':').slice(0, 5).join(', '), '...');

// Log which API keys are available (without showing values)
const apiKeys = Object.keys(geminiEnv).filter(k =>
  k.includes('API_KEY') || k.includes('TOKEN') || k.includes('SECRET') || k === 'PAI_DIR'
);
console.log('[STARTUP] API keys loaded:', apiKeys.join(', '));

// Session storage: callId -> geminiSessionId
const sessions = new Map();

// Model selection - Use stable 1.5 flash for v1beta compatibility
// gemini-2.0 models may not be available in v1beta API
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-001';

function parseGeminiStdout(stdout) {
  // Gemini Code CLI may output JSONL; when it does, extract the `result` message.
  // Otherwise, fall back to raw stdout.
  let response = '';
  let sessionId = null;

  try {
    const lines = String(stdout || '').trim().split('\n');
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'result' && parsed.result) {
          response = parsed.result;
          sessionId = parsed.session_id;
        }
      } catch {
        // Not JSONL; ignore.
      }
    }

    if (!response) response = String(stdout || '').trim();
  } catch {
    response = String(stdout || '').trim();
  }

  return { response, sessionId };
}

function runGeminiOnce({ fullPrompt, callId, timestamp, model }) {
  const startTime = Date.now();

  // Simplified arguments for Docker sandbox
  // The sandbox version doesn't support all CLI flags, just basic -p prompt
  const args = [
    '-p', fullPrompt
  ];

  // Session resume not supported in sandbox mode, skip for now
  console.log(`[${timestamp}] Starting query for call: ${callId}`);

  return new Promise((resolve, reject) => {
    // Use globally installed @google/gemini-cli from npm
    const gemini = spawn('gemini', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      env: geminiEnv
    });

    let stdout = '';
    let stderr = '';

    gemini.stdin.end();
    gemini.stdout.on('data', (data) => { stdout += data.toString(); });
    gemini.stderr.on('data', (data) => { stderr += data.toString(); });

    gemini.on('error', (error) => {
      reject(error);
    });

    gemini.on('close', (code) => {
      const duration_ms = Date.now() - startTime;
      resolve({ code, stdout, stderr, duration_ms });
    });
  });
}

/**
 * Wrapper for runGeminiOnce with fallback logic
 */
async function queryGeminiWithFallback({ fullPrompt, callId, timestamp, model }) {
  try {
    const result = await runGeminiOnce({ fullPrompt, callId, timestamp, model: model || GEMINI_MODEL });

    // Check for success but stderr containing 429/quota error (CLI sometimes exits 0 but logs error)
    if (result.stderr && (result.stderr.includes('429') || result.stderr.includes('Quota exceeded') || result.stderr.includes('quota'))) {
      throw new Error('Quota exceeded detected in stderr: ' + result.stderr);
    }

    return result;
  } catch (err) {
    // Check if error is quota related
    const isQuotaError = err.message && (
      err.message.includes('429') ||
      err.message.includes('Quota exceeded') ||
      err.message.includes('quota')
    );

    const currentModel = model || GEMINI_MODEL;
    if (isQuotaError && currentModel !== 'gemini-1.5-flash-001') {
      console.warn(`[GEMINI] Quota exceeded for ${currentModel}, falling back to gemini-1.5-flash-001...`);
      return await runGeminiOnce({ fullPrompt, callId, timestamp, model: 'gemini-1.5-flash-001' });
    }
    throw err;
  }
}

/**
 * Voice Context - Prepended to all voice queries
 *
 * This tells Gemini how to handle voice-specific patterns:
 * - Output VOICE_RESPONSE for TTS (conversational, 40 words max)
 * - Output COMPLETED for status logging (12 words max)
 * - For Slack delivery requests: do the work, send to Slack, then acknowledge
 */
const VOICE_CONTEXT = `[VOICE CALL CONTEXT]
This query comes via voice call. You MUST include BOTH of these lines in your response:

🗣️ VOICE_RESPONSE: [Your conversational answer in 40 words or less. This is what gets spoken aloud via TTS. Be natural and helpful, like talking to a friend.]

🎯 COMPLETED: [Status summary in 12 words or less. This is for logging only.]

IMPORTANT: The VOICE_RESPONSE line is what the caller HEARS. Make it conversational and complete - don't just say "Done" or "Task completed". Actually answer their question or confirm what you did in a natural way.

SLACK DELIVERY: When the caller requests delivery to Slack (phrases like "send to Slack", "post to #channel", "message me when done"):
1. Do the requested work (research, generate content, analyze, etc.)
2. Send results to the specified Slack channel using the Slack skill
3. Include a VOICE_RESPONSE like: "Done! I sent the weather info to the 508 channel."

The caller may hang up while you're working (they'll hear hold music). That's fine - complete the work and send to Slack. They'll see it there.

Example query: "What's the weather in Royce City?"
Example response:
🗣️ VOICE_RESPONSE: It's 65 degrees and partly cloudy in Royce City right now. Great weather for being outside!
🎯 COMPLETED: Weather lookup for Royce City done.
[END VOICE CONTEXT]

CALLBACKS: When the caller asks to be called back (e.g., "call me back in 5 minutes", "schedule a call"):
1. Acknowledge the request in VOICE_RESPONSE.
2. Look for "[SYSTEM] Current Caller ID: <number>" in the context.
3. Output a CALLBACK line with that number.
Example:
🗣️ VOICE_RESPONSE: I'll call you back in 5 minutes. Talk soon!
🗣️ CALLBACK: <caller_id_from_context>
🎯 COMPLETED: Scheduled callback.

WEBHOOKS: If the user asks to trigger an automation, flow, or external action (e.g., "turn on the lights", "add row to spreadsheet", "start the onboarding flow"):
1. Confirm the action in VOICE_RESPONSE.
2. Output a WEBHOOK line with a JSON string payload.
Example:
"Trigger the marketing flow for email test@example.com"
🗣️ VOICE_RESPONSE: check! I'm starting the marketing flow for that email now.
⚡ WEBHOOK: {"flow": "marketing", "email": "test@example.com"}
🎯 COMPLETED: Triggered marketing flow.


`;

// Middleware
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

/**
 * POST /ask
 *
 * Request body:
 *   {
 *     "prompt": "What Docker containers are running?",
 *     "callId": "optional-call-uuid",
 *     "devicePrompt": "optional device-specific prompt"
 *   }
 *
 * Response:
 *   { "success": true, "response": "...", "duration_ms": 1234, "sessionId": "..." }
 *
 * Session Management:
 *   - If callId is provided and we have a stored session, uses --resume
 *   - First query for a callId captures the session_id for future turns
 *   - This maintains conversation context across multiple turns in a phone call
 *
 * Device Prompts:
 *   - If devicePrompt is provided, it's prepended before VOICE_CONTEXT
 *   - This allows each device (NAS, Proxmox, etc.) to have its own identity and skills
 */
app.post('/ask', async (req, res) => {
  const { prompt, callId, devicePrompt } = req.body;
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: 'Missing prompt in request body'
    });
  }

  // Check if we have an existing session for this call
  const existingSession = callId ? sessions.get(callId) : null;

  console.log(`[${timestamp}] QUERY: "${prompt.substring(0, 100)}..."`);
  console.log(`[${timestamp}] MODEL: ${GEMINI_MODEL}`);
  console.log(`[${timestamp}] SESSION: callId=${callId || 'none'}, existing=${existingSession || 'none'}`);
  console.log(`[${timestamp}] DEVICE PROMPT: ${devicePrompt ? 'Yes (' + devicePrompt.substring(0, 30) + '...)' : 'No'}`);

  try {
    /**
     * Prompt layering order:
     * 1. Device prompt (if provided) - identity and available skills
     * 2. VOICE_CONTEXT - general voice call instructions
     * 3. User's prompt - what they actually said
     */
    let fullPrompt = '';

    if (devicePrompt) {
      fullPrompt += `[DEVICE IDENTITY]\n${devicePrompt}\n[END DEVICE IDENTITY]\n\n`;
    }

    fullPrompt += VOICE_CONTEXT;
    fullPrompt += prompt;

    const { code, stdout, stderr, duration_ms } = await queryGeminiWithFallback({ fullPrompt, callId, timestamp });

    if (code !== 0) {
      console.error(`[${new Date().toISOString()}] ERROR: Gemini CLI exited with code ${code}`);
      console.error(`STDERR: ${stderr}`);
      console.error(`STDOUT: ${stdout.substring(0, 500)}`);
      const errorMsg = stderr || stdout || `Exit code ${code}`;
      return res.json({ success: false, error: `Gemini CLI failed: ${errorMsg}`, duration_ms });
    }

    const { response, sessionId } = parseGeminiStdout(stdout);

    if (sessionId && callId) {
      sessions.set(callId, sessionId);
      console.log(`[${new Date().toISOString()}] SESSION STORED: ${callId} -> ${sessionId}`);
    }

    console.log(`[${new Date().toISOString()}] RESPONSE (${duration_ms}ms): "${response.substring(0, 100)}..."`);

    // Check for WEBHOOK trigger
    const webhookMatch = response.match(/⚡ WEBHOOK: (.*)/);
    if (webhookMatch && process.env.N8N_WEBHOOK_URL) {
      const payload = webhookMatch[1];
      console.log(`[${timestamp}] ⚡ TRIGGERING WEBHOOK: ${process.env.N8N_WEBHOOK_URL}`);
      console.log(`[${timestamp}] PAYLOAD: ${payload}`);

      // Fire and forget webhook
      fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).catch(err => console.error(`[${timestamp}] WEBHOOK ERROR:`, err.message));
    }

    res.json({ success: true, response, sessionId, duration_ms });

  } catch (error) {
    const duration_ms = Date.now() - startTime;
    console.error(`[${timestamp}] ERROR:`, error.message);

    res.json({
      success: false,
      error: error.message,
      duration_ms
    });
  }
});

/**
 * POST /ask-structured
 *
 * Like /ask, but returns machine-validated JSON for n8n automations.
 *
 * Request body:
 *   {
 *     "prompt": "Check Ceph health",
 *     "callId": "optional-call-uuid",
 *     "devicePrompt": "optional device-specific prompt",
 *     "schema": {
 *        "queryType": "ceph_health",
 *        "requiredFields": ["cluster_status","ssd_usage_percent","recommendation"],
 *        "fieldGuidance": { "cluster_status": "Ceph overall health, e.g. HEALTH_OK/HEALTH_WARN/HEALTH_ERR" },
 *        "allowExtraFields": true,
 *        "example": { "cluster_status": "HEALTH_WARN", "ssd_usage_percent": 88, "recommendation": "alert" }
 *     },
 *     "includeVoiceContext": false,
 *     "maxRetries": 1
 *   }
 *
 * Response (success):
 *   { "success": true, "data": {...}, "raw_response": "...", "duration_ms": 1234 }
 */
app.post('/ask-structured', async (req, res) => {
  const {
    prompt,
    callId,
    devicePrompt,
    schema = {},
    includeVoiceContext = false,
    maxRetries = 1,
  } = req.body || {};

  const timestamp = new Date().toISOString();

  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Missing prompt in request body' });
  }

  const queryContext = buildQueryContext({
    queryType: schema.queryType,
    requiredFields: schema.requiredFields,
    fieldGuidance: schema.fieldGuidance,
    allowExtraFields: schema.allowExtraFields !== false,
    example: schema.example,
  });

  let fullPrompt = buildStructuredPrompt({
    devicePrompt,
    queryContext: (includeVoiceContext ? VOICE_CONTEXT : '') + queryContext,
    userPrompt: prompt,
  });

  console.log(`[${timestamp}] STRUCTURED QUERY: "${String(prompt).substring(0, 100)}..."`);
  console.log(`[${timestamp}] MODEL: ${GEMINI_MODEL}`);
  console.log(`[${timestamp}] SESSION: callId=${callId || 'none'}, existing=${callId ? (sessions.has(callId) ? 'yes' : 'no') : 'none'}`);

  try {
    let lastRaw = '';
    let lastError = 'Unknown error';
    let totalDuration = 0;
    const retries = Number.isFinite(Number(maxRetries)) ? Number(maxRetries) : 0;
    let attemptsMade = 0;

    for (let attempt = 0; attempt <= retries; attempt++) {
      attemptsMade = attempt + 1;
      const { code, stdout, stderr, duration_ms } = await queryGeminiWithFallback({ fullPrompt, callId, timestamp });
      totalDuration += duration_ms;

      if (code !== 0) {
        lastError = `Gemini CLI failed: ${stderr}`;
        lastRaw = String(stdout || '').trim();
        return res.status(502).json({
          success: false,
          error: lastError,
          raw_response: lastRaw,
          duration_ms: totalDuration,
          attempts: attemptsMade,
        });
      }

      const { response, sessionId } = parseGeminiStdout(stdout);
      lastRaw = response;

      if (sessionId && callId) sessions.set(callId, sessionId);

      const parsed = tryParseJsonFromText(response);
      if (!parsed.ok) {
        lastError = parsed.error || 'Failed to parse JSON';
      } else {
        const validation = validateRequiredFields(parsed.data, schema.requiredFields);
        if (validation.ok) {
          return res.json({
            success: true,
            data: parsed.data,
            json_text: parsed.jsonText,
            raw_response: response,
            duration_ms: totalDuration,
            attempts: attemptsMade,
          });
        }
        lastError = validation.error || 'Validation failed';
      }

      if (attempt >= retries) break;

      // Retry once with a repair prompt that forces "JSON only" formatting.
      const repairPrompt = buildRepairPrompt({
        queryType: schema.queryType,
        requiredFields: schema.requiredFields,
        fieldGuidance: schema.fieldGuidance,
        allowExtraFields: schema.allowExtraFields !== false,
        originalUserPrompt: prompt,
        invalidAssistantOutput: lastRaw,
        example: schema.example,
      });

      fullPrompt = buildStructuredPrompt({
        devicePrompt,
        queryContext: includeVoiceContext ? VOICE_CONTEXT : '',
        userPrompt: repairPrompt,
      });
    }

    return res.status(422).json({
      success: false,
      error: lastError,
      raw_response: lastRaw,
      duration_ms: totalDuration,
      attempts: attemptsMade,
    });
  } catch (error) {
    console.error(`[${timestamp}] ERROR:`, error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /end-session
 *
 * Clean up session when a call ends
 *
 * Request body:
 *   { "callId": "call-uuid" }
 */
app.post('/end-session', (req, res) => {
  const { callId } = req.body;
  const timestamp = new Date().toISOString();

  if (callId && sessions.has(callId)) {
    sessions.delete(callId);
    console.log(`[${timestamp}] SESSION ENDED: ${callId}`);
  }

  res.json({ success: true });
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'gemini-api-server',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /
 * Info endpoint
 */
app.get('/', (req, res) => {
  res.json({
    service: 'Gemini HTTP API Server',
    version: '1.0.0',
    endpoints: {
      'POST /ask': 'Send a prompt to Gemini',
      'POST /ask-structured': 'Send a prompt and return validated JSON (n8n)',
      'GET /health': 'Health check'
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(64));
  console.log('Gemini HTTP API Server');
  console.log('='.repeat(64));
  console.log(`\nListening on: http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('\nReady to receive Gemini queries from voice interface.\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});
