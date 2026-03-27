/**
 * Shared Conversation Loop
 * Extracted from sip-handler.js for use by both inbound and outbound calls
 *
 * Features:
 * - VAD-based speech detection
 * - DTMF # key to end speech early
 * - Whisper transcription
 * - AI API integration
 * - TTS response generation
 * - Turn-taking audio cues (beeps)
 * - Hold music during processing
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const voicemailService = require('./voicemail-service');
const { initiateOutboundCall } = require('./outbound-handler');
const { scheduleCallback } = require('./scheduled-callbacks');
const { saveRecording } = require('./call-recordings');

// Path to audio-temp for cache validation
const AUDIO_TEMP_DIR = path.join(__dirname, '../audio-temp');

// Audio cue URLs
const READY_BEEP_URL = 'http://127.0.0.1:3000/static/ready-beep.wav';
const GOTIT_BEEP_URL = 'http://127.0.0.1:3000/static/gotit-beep.wav';
const HOLD_MUSIC_URL = 'http://127.0.0.1:3000/static/hold-music.mp3';

// Conversational thinking phrases — long enough to feel natural while AI processes
const THINKING_PHRASES = [
  "That's a great question, give me a moment to think about that.",
  "Hold on, let me look into that for you.",
  "Interesting, let me process that for a moment.",
  "Let me think about that, one moment please.",
  "Hmm, that's a good one. Give me a second.",
  "Alright, let me work through that.",
  "Sure, let me figure that out for you.",
  "Good question. Let me think on that.",
  "One moment while I consider that.",
  "Let me dig into that, bear with me.",
];

// Filler phrases — played when AI takes too long (>3 seconds of silence)
const FILLER_PHRASES = [
  "I'm still working on that, bear with me.",
  "This is taking a bit longer than usual, hang tight.",
  "Still thinking, I haven't forgotten about you.",
  "Almost there, just a moment longer.",
  "I'm putting something together for you, one more moment.",
  "Processing, one sec.",
  "Thinking it through, stay with me.",
  "Working on it, almost ready.",
];

// Lazy TTS cache — caches phrases on first use, no upfront generation
const phraseCache = new Map();

/**
 * Get TTS URL for a phrase, caching on first use for instant replay later
 */
async function getCachedPhrase(phrase, ttsService, voiceId) {
  const cachedUrl = phraseCache.get(phrase);
  if (cachedUrl) {
    // Validate the cached audio file still exists on disk
    const filename = cachedUrl.split('/').pop();
    const filepath = path.join(AUDIO_TEMP_DIR, filename);
    if (fs.existsSync(filepath)) {
      return cachedUrl;
    }
    // File was cleaned up — regenerate
    phraseCache.delete(phrase);
    logger.warn('Cached TTS file missing, regenerating', { phrase: phrase.substring(0, 40) });
  }
  // Generate on first use, cache for next time
  const url = await ttsService.generateSpeech(phrase, voiceId);
  phraseCache.set(phrase, url);
  return url;
}

function getRandomThinkingPhrase() {
  return THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
}

function isGoodbye(transcript) {
  const lower = transcript.toLowerCase().trim();
  const words = lower.split(/\s+/);

  // Only consider short phrases as goodbye (6 words or less)
  // This prevents 'Why did you hang up the phone?' from matching
  if (words.length > 6) return false;

  const goodbyePhrases = ['goodbye', 'good bye', 'bye', 'hang up', 'end call', "that's all", 'thats all'];
  return goodbyePhrases.some(phrase => {
    return lower === phrase || lower.includes(` ${phrase}`) ||
      lower.startsWith(`${phrase} `) || lower.endsWith(` ${phrase}`);
  });
}

/**
 * Validate a phone number is real (not a placeholder/example)
 * @param {string} number - Phone number to validate
 * @returns {boolean} True if the number looks real
 */
function isValidPhoneNumber(number) {
  if (!number || number.length < 7) return false;

  // Strip + and country code for checking
  const digits = number.replace(/\D/g, '');

  // Reject known placeholder patterns
  const placeholders = [
    '15551234567', '5551234567', '1234567890', '0000000000',
    '1111111111', '9999999999', '5555555555'
  ];
  if (placeholders.includes(digits)) return false;

  // Reject numbers with 555 area code (US fictitious)
  if (digits.match(/^1?555\d{7}$/)) return false;

  return true;
}

/**
 * Extract voice-friendly line from AI's response
 * Priority: VOICE_RESPONSE > CUSTOM COMPLETED > COMPLETED > first sentence
 */
function extractVoiceLine(response) {
  /**
   * Clean markdown and formatting from text for speech
   */
  function cleanForSpeech(text) {
    return text
      .replace(/\*+/g, '')              // Remove bold/italic markers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Convert [text](url) to just text
      .replace(/\[([^\]]+)\]/g, '$1')   // Remove remaining brackets
      .trim();
  }

  // Priority 1: Check for new VOICE_RESPONSE line (voice-optimized content)
  const voiceMatch = response.match(/🗣️\s*VOICE_RESPONSE:\s*([^\n]+)/im);
  if (voiceMatch) {
    const text = cleanForSpeech(voiceMatch[1]);
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    // Accept if under 60 words
    if (text && wordCount <= 60) {
      return text;
    }

    // If too long, log warning but continue to next fallback
    logger.warn('VOICE_RESPONSE too long, falling back', { wordCount, maxWords: 60 });
  }

  // Priority 2: Check for legacy CUSTOM COMPLETED line
  const customMatch = response.match(/🗣️\s*CUSTOM\s+COMPLETED:\s*(.+?)(?:\n|$)/im);
  if (customMatch) {
    const text = cleanForSpeech(customMatch[1]);
    if (text && text.split(/\s+/).length <= 50) {
      return text;
    }
  }

  // Priority 3: Check for standard COMPLETED line
  const completedMatch = response.match(/🎯\s*COMPLETED:\s*(.+?)(?:\n|$)/im);
  if (completedMatch) {
    return cleanForSpeech(completedMatch[1]);
  }

  // Priority 4: Fallback to first sentence
  const firstSentence = response.split(/[.!?]/)[0];
  if (firstSentence && firstSentence.length < 500) {
    return firstSentence.trim();
  }

  // Last resort: truncate
  return response.substring(0, 500).trim();
}

/**
 * Run the conversation loop
 *
 * @param {Object} endpoint - FreeSWITCH endpoint
 * @param {Object} dialog - SIP dialog
 * @param {string} callUuid - Unique call identifier
 * @param {Object} options - Configuration options
 * @param {Object} options.audioForkServer - WebSocket audio fork server
 * @param {Object} options.whisperClient - Whisper transcription client
 * @param {Object} options.aiBridge - AI API bridge
 * @param {Object} options.ttsService - TTS service
 * @param {number} options.wsPort - WebSocket port
 * @param {string} [options.initialContext] - Context for outbound calls (why we're calling)
 * @param {boolean} [options.skipGreeting=false] - Skip greeting (for outbound, greeting already played)
 * @param {number} [options.maxTurns=20] - Maximum conversation turns
 * @returns {Promise<void>}
 */
async function runConversationLoop(endpoint, dialog, callUuid, options) {
  const {
    audioForkServer,
    whisperClient,
    aiBridge,
    ttsService,
    wsPort,
    initialContext = null,
    skipGreeting = false,
    deviceConfig = null,
    maxTurns = 20
  } = options;

  const devicePrompt = deviceConfig?.prompt || null;
  const voiceId = deviceConfig?.voiceId || null;  // null = use default Morpheus voice
  const callerId = options.callerId || 'unknown';
  const { srf, mediaServer } = options;

  let session = null;
  let forkRunning = false;
  let callActive = true;
  let dtmfHandler = null;
  let callbackTarget = null; // Track immediate callback intent
  let scheduledCallbackInfo = null; // Track scheduled callback intent
  let streamAbortController = null; // Abort AI stream on hangup
  let audioRecordingPath = null; // Path to call audio recording
  const conversationLog = []; // Track user/AI turns for transcript saving
  const callStartTime = Date.now();

  // Enhance system prompt with caller info and callback capabilities
  // Only advertise callbacks if we have a real caller ID to call back
  const hasRealCallerId = callerId && callerId !== 'unknown' && callerId.length >= 4;
  const callbackInstructions = hasRealCallerId ? `
[SYSTEM] CALLBACK CAPABILITY (use ONLY when the caller explicitly asks you to call them back):
- If the caller says "call me back" or "remind me later", respond with:
  🗣️ SCHEDULED_CALLBACK: CALLER | <delay> | <message>
  The word CALLER will be replaced with their real number automatically.
- NEVER invent or guess phone numbers. NEVER use placeholder numbers.
- NEVER schedule a callback unless the user explicitly requests one.` : '';

  const systemContext = `
[SYSTEM] Incoming call from ${callerId}. You are ${deviceConfig?.name || 'Morpheus'}. Answer accordingly.
${callbackInstructions}
`;

  // Track when call ends to prevent operations on dead endpoints
  const onDialogDestroy = () => {
    callActive = false;
    // Abort any in-progress AI stream immediately
    if (streamAbortController) {
      streamAbortController.abort();
    }
    logger.info('Call ended (dialog destroyed)', { callUuid });
  };

  try {
    logger.info('Conversation loop starting', {
      callUuid,
      skipGreeting,
      hasInitialContext: !!initialContext
    });

    // Listen for call end
    dialog.on('destroy', onDialogDestroy);


    // Play greeting (skip for outbound where initial message already played)
    if (!skipGreeting && callActive) {
      const defaultGreeting = deviceConfig?.name === 'AI' || !deviceConfig?.name
        ? "Connection established. What do you need?"
        : `This is ${deviceConfig.name}. What do you need?`;

      const greetingUrl = await ttsService.generateSpeech(defaultGreeting, voiceId);
      await endpoint.play(greetingUrl);
    }

    // Prime AI with context if this is an outbound call (NON-BLOCKING)
    // Fire-and-forget: we don't use the response, just establishing session context
    if (initialContext && callActive) {
      logger.info('Priming AI with outbound context (non-blocking)', { callUuid });
      aiBridge.query(
        `[SYSTEM CONTEXT - DO NOT REPEAT]: You just called the user to tell them: "${initialContext}". They have answered. Now listen to their response and help them.`,
        { callId: callUuid, devicePrompt: devicePrompt, isSystemPrime: true }
      ).catch(err => logger.warn('Prime query failed', { callUuid, error: err.message }));
    }

    // Check if call is still active before starting audio fork
    if (!callActive) {
      logger.info('Call ended before audio fork could start', { callUuid });
      return;
    }

    // Start audio fork for entire call
    const wsUrl = `ws://127.0.0.1:${wsPort}/${encodeURIComponent(callUuid)}`;

    // Use try-catch for expectSession to handle race conditions
    let sessionPromise;
    try {
      sessionPromise = audioForkServer.expectSession(callUuid, { timeoutMs: 10000 });
    } catch (err) {
      logger.warn('Failed to set up session expectation', { callUuid, error: err.message });
      return;
    }

    await endpoint.forkAudioStart({
      wsUrl,
      mixType: 'mono',
      sampling: '16k'
    });
    forkRunning = true;

    // Start audio recording for the full call
    const audioDir = '/app/recordings/audio';
    try {
      if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
      audioRecordingPath = path.join(audioDir, `${callUuid}.wav`);
      await endpoint.api('uuid_record', `${endpoint.uuid} start ${audioRecordingPath}`);
      logger.info('Audio recording started', { callUuid, path: audioRecordingPath });
    } catch (recErr) {
      logger.warn('Failed to start audio recording', { callUuid, error: recErr.message });
      audioRecordingPath = null;
    }

    try {
      session = await sessionPromise;
      logger.info('Audio fork connected', { callUuid });
    } catch (err) {
      logger.warn('Audio fork session failed', { callUuid, error: err.message });
      // Cancel the pending expectation if still there
      audioForkServer.cancelExpectation && audioForkServer.cancelExpectation(callUuid);
      return;
    }

    // Set up DTMF handler for # key
    dtmfHandler = (evt) => {
      const digit = evt.dtmf || evt.digit;
      logger.info('DTMF received', { callUuid, digit });

      if (digit === '#' && session) {
        logger.info('DTMF # pressed - forcing utterance finalization', { callUuid });
        session.forceFinalize();
      }
    };

    // Enable DTMF detection on endpoint
    try {
      // Tell FreeSWITCH to detect DTMF
      await endpoint.api('uuid_recv_dtmf', `${endpoint.uuid} true`);
      endpoint.on('dtmf', dtmfHandler);
      logger.info('DTMF detection enabled', { callUuid });
    } catch (err) {
      logger.warn('Failed to enable DTMF detection', { callUuid, error: err.message });
      // Continue without DTMF - not critical
    }

    // Emit session event for external monitoring
    if (audioForkServer.emit) {
      audioForkServer.emit('session', session);
    }
    console.log('[AUDIO] New session for call ' + callUuid);

    // Main conversation loop
    let turnCount = 0;

    while (turnCount < maxTurns && callActive) {
      turnCount++;
      logger.info('Conversation turn', { callUuid, turn: turnCount, maxTurns });

      // Check if call is still active
      if (!callActive) {
        logger.info('Call ended during turn', { callUuid, turn: turnCount });
        break;
      }

      // ============================================
      // READY BEEP: Signal "your turn to speak"
      // ============================================
      try {
        if (callActive) await endpoint.play(READY_BEEP_URL);
      } catch (e) {
        if (!callActive) break;
        logger.warn('Ready beep failed', { callUuid, error: e.message });
      }

      // Enable capture and wait for speech
      session.setCaptureEnabled(true);
      logger.info('Waiting for speech (press # to send immediately)', { callUuid });

      let utterance = null;
      try {
        utterance = await session.waitForUtterance({ timeoutMs: 30000 });
        logger.info('Got utterance', { callUuid, bytes: utterance.audio.length, reason: utterance.reason });
      } catch (err) {
        if (!callActive) break;
        logger.info('Utterance timeout', { callUuid, error: err.message });
      }

      session.setCaptureEnabled(false);

      // Check if call ended during speech detection
      if (!callActive) {
        logger.info('Call ended during speech detection', { callUuid });
        break;
      }

      // Handle no speech
      if (!utterance) {
        const promptUrl = await ttsService.generateSpeech(
          "I didn't hear anything. Are you still there?",
          voiceId
        );
        if (callActive) await endpoint.play(promptUrl);
        continue;
      }

      // ============================================
      // GOT-IT BEEP: Signal "I heard you, processing"
      // ============================================
      try {
        if (callActive) await endpoint.play(GOTIT_BEEP_URL);
      } catch (e) {
        if (!callActive) break;
        logger.warn('Got-it beep failed', { callUuid, error: e.message });
      }

      // Transcribe
      const transcript = await whisperClient.transcribe(utterance.audio, {
        format: 'pcm',
        sampleRate: 16000
      });

      logger.info('Transcribed', { callUuid, transcript });

      // Handle empty transcription
      if (!transcript || transcript.trim().length < 2) {
        const clarifyUrl = await ttsService.generateSpeech(
          "Sorry, I didn't catch that. Could you repeat?",
          voiceId
        );
        if (callActive) await endpoint.play(clarifyUrl);
        continue;
      }

      // Handle goodbye
      if (isGoodbye(transcript)) {
        const byeUrl = await ttsService.generateSpeech("Goodbye! Call again anytime.", voiceId);
        if (callActive) await endpoint.play(byeUrl);
        break;
      }

      // ============================================
      // THINKING FEEDBACK + STREAMING AI RESPONSE
      // ============================================

      // Check if call still active before thinking feedback
      if (!callActive) break;

      // 1. Play random thinking phrase
      const thinkingPhrase = getRandomThinkingPhrase();
      logger.info('Playing thinking phrase', { callUuid, phrase: thinkingPhrase });
      try {
        const thinkingUrl = await getCachedPhrase(thinkingPhrase, ttsService, voiceId);
        if (callActive) await endpoint.play(thinkingUrl);
      } catch (e) {
        if (!callActive) break;
        logger.warn('Thinking phrase failed', { callUuid, error: e.message });
      }

      // 2. Start hold music in background
      let musicPlaying = false;
      if (callActive) {
        endpoint.play(HOLD_MUSIC_URL).catch(e => {
          logger.warn('Hold music failed', { callUuid, error: e.message });
        });
        musicPlaying = true;
      }

      // 3. Build AI prompt with context
      let voicemailContext = '';
      if (transcript.toLowerCase().includes('voicemail') || transcript.toLowerCase().includes('message')) {
        const messages = await voicemailService.listVoicemails(deviceConfig?.extension || '9000');
        if (messages.length > 0) {
          voicemailContext = `\n[SYSTEM] User has ${messages.length} voicemails. Latest from ${messages[messages.length - 1].callerId} at ${messages[messages.length - 1].timestamp}. You can offer to play them.`;
        } else {
          voicemailContext = '\n[SYSTEM] User has 0 voicemails.';
        }
      }

      const aiPrompt = transcript + voicemailContext + systemContext;
      let fullAiResponse = '';

      // 4. Stream AI response — TTS + play each sentence as it arrives
      logger.info('Querying AI (streaming)', { callUuid });

      try {
        streamAbortController = new AbortController();
        const stream = aiBridge.queryStream(aiPrompt, {
          callId: callUuid,
          devicePrompt: devicePrompt,
          signal: streamAbortController.signal
        });
        let sentenceCount = 0;
        let fillerTimer = null;
        let fillerIndex = 0;

        // Filler timeout: first fires at 8s, subsequent at 15s
        // Longer delays let hold music play uninterrupted
        const FILLER_FIRST_DELAY = 8000;
        const FILLER_REPEAT_DELAY = 15000;

        const startFillerTimer = (delayMs) => {
          if (fillerTimer) clearTimeout(fillerTimer);
          fillerTimer = setTimeout(async () => {
            if (!callActive) return;
            const filler = FILLER_PHRASES[fillerIndex % FILLER_PHRASES.length];
            fillerIndex++;
            logger.info('Playing filler phrase (AI slow)', { callUuid, phrase: filler });
            try {
              // Generate TTS first (while hold music still plays — no silence gap)
              const fillerUrl = await getCachedPhrase(filler, ttsService, voiceId);
              if (!callActive) return;
              // NOW stop hold music and play filler immediately
              if (musicPlaying) {
                try { await endpoint.api('uuid_break', endpoint.uuid); } catch (e) { /* ignore */ }
              }
              if (callActive) await endpoint.play(fillerUrl);
              // Restart hold music after filler
              if (callActive) {
                endpoint.play(HOLD_MUSIC_URL).catch(() => { });
                musicPlaying = true;
              }
            } catch (e) {
              logger.warn('Filler phrase failed', { callUuid, error: e.message });
            }
            // Set up next filler (longer interval)
            startFillerTimer(FILLER_REPEAT_DELAY);
          }, delayMs);
        };

        // Start the filler timer (short first delay)
        startFillerTimer(FILLER_FIRST_DELAY);

        for await (const sentence of stream) {
          if (!callActive) break;

          // Cancel filler timer on each sentence
          if (fillerTimer) clearTimeout(fillerTimer);

          sentenceCount++;
          fullAiResponse += (sentenceCount > 1 ? ' ' : '') + sentence;
          logger.info('Stream sentence', { callUuid, sentenceNum: sentenceCount, text: sentence.substring(0, 80) });

          // Stop hold music before first sentence
          if (sentenceCount === 1 && musicPlaying) {
            try {
              await endpoint.api('uuid_break', endpoint.uuid);
              musicPlaying = false;
            } catch (e) { /* ignore */ }
          }

          // Generate TTS and play this sentence immediately
          const sentenceUrl = await ttsService.generateSpeech(sentence, voiceId);
          if (callActive) await endpoint.play(sentenceUrl);

          // Restart filler timer for next sentence
          startFillerTimer(FILLER_REPEAT_DELAY);
        }

        // Clear filler timer
        if (fillerTimer) clearTimeout(fillerTimer);

        logger.info('AI stream complete', { callUuid, sentences: sentenceCount, totalLength: fullAiResponse.length });
        streamAbortController = null;

      } catch (streamError) {
        logger.warn('Streaming failed, falling back to non-streaming', { callUuid, error: streamError.message });

        // Fallback to non-streaming query
        fullAiResponse = await aiBridge.query(aiPrompt, { callId: callUuid, devicePrompt: devicePrompt });

        // Stop hold music
        if (musicPlaying && callActive) {
          try { await endpoint.api('uuid_break', endpoint.uuid); } catch (e) { /* ignore */ }
          musicPlaying = false;
        }

        if (!callActive) {
          logger.info('Call ended during AI processing', { callUuid });
          break;
        }

        const voiceLine = extractVoiceLine(fullAiResponse);
        const responseUrl = await ttsService.generateSpeech(voiceLine, voiceId);
        if (callActive) await endpoint.play(responseUrl);
      }

      // Stop hold music if still playing
      if (musicPlaying && callActive) {
        try { await endpoint.api('uuid_break', endpoint.uuid); } catch (e) { /* ignore */ }
      }

      // Check if call ended during AI processing
      if (!callActive) {
        logger.info('Call ended during AI processing', { callUuid });
        break;
      }

      logger.info('AI responded', { callUuid });

      // Log conversation turn for transcript
      conversationLog.push({
        turn: turnCount,
        timestamp: Date.now(),
        user: transcript,
        assistant: fullAiResponse
      });

      // 5. Check for IMMEDIATE CALLBACK in full response
      const callbackMatch = fullAiResponse.match(/🗣️\s*CALLBACK:\s*(CALLER|[+\d]+)/im);
      if (callbackMatch) {
        const target = callbackMatch[1].trim();
        if (target === 'CALLER' && hasRealCallerId) {
          callbackTarget = callerId;
          logger.info('IMMEDIATE CALLBACK Detected', { callUuid, target: callbackTarget });
        } else if (isValidPhoneNumber(target)) {
          callbackTarget = target;
          logger.info('IMMEDIATE CALLBACK Detected', { callUuid, target: callbackTarget });
        } else {
          logger.warn('CALLBACK rejected - invalid or placeholder number', { callUuid, target });
        }
      }

      // Check for SCHEDULED CALLBACK
      const scheduledMatch = fullAiResponse.match(/🗣️\s*SCHEDULED_CALLBACK:\s*(CALLER|[+\d]+)\s*\|\s*([^|]+)\s*\|\s*(.+)/im);
      if (scheduledMatch) {
        const target = scheduledMatch[1].trim();
        let resolvedNumber = null;

        if (target === 'CALLER' && hasRealCallerId) {
          resolvedNumber = callerId;
        } else if (isValidPhoneNumber(target)) {
          resolvedNumber = target;
        }

        if (resolvedNumber) {
          scheduledCallbackInfo = {
            phoneNumber: resolvedNumber,
            delay: scheduledMatch[2].trim(),
            message: scheduledMatch[3].trim()
          };
          logger.info('SCHEDULED CALLBACK Detected', { callUuid, info: scheduledCallbackInfo });
        } else {
          logger.warn('SCHEDULED CALLBACK rejected - invalid or placeholder number', { callUuid, target });
        }
      }

      if (callbackTarget || scheduledCallbackInfo) break; // End loop to trigger callback

      logger.info('Turn complete', { callUuid, turn: turnCount });
    }

    // Max turns reached
    if (turnCount >= maxTurns && callActive) {
      const maxUrl = await ttsService.generateSpeech(
        "We've been talking for a while. Goodbye!",
        voiceId
      );
      await endpoint.play(maxUrl);
    }

    logger.info('Conversation loop ended normally', { callUuid, turns: turnCount });

  } catch (error) {
    logger.error('Conversation loop error', {
      callUuid,
      error: error.message,
      stack: error.stack
    });

    try {
      if (session) session.setCaptureEnabled(false);
      if (callActive) {
        const errUrl = await ttsService.generateSpeech("System error. I can't process this fast enough.", voiceId);
        await endpoint.play(errUrl);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  } finally {
    logger.info('Conversation loop cleanup', { callUuid });

    // Stop audio recording
    if (audioRecordingPath) {
      try {
        await endpoint.api('uuid_record', `${endpoint.uuid} stop ${audioRecordingPath}`);
        logger.info('Audio recording stopped', { callUuid, path: audioRecordingPath });
      } catch (e) {
        logger.warn('Failed to stop audio recording', { callUuid, error: e.message });
      }
    }

    // Save call recording (transcript + audio) — only for inbound calls
    // Outbound calls are saved by outbound-session.js to avoid duplicates
    if (!initialContext) {
      try {
        const duration = Math.round((Date.now() - callStartTime) / 1000);
        // Check if audio file actually exists
        const audioFileExists = audioRecordingPath && fs.existsSync(audioRecordingPath);
        saveRecording({
          callId: callUuid,
          direction: 'inbound',
          callerNumber: callerId,
          device: deviceConfig?.name || 'Unknown',
          extension: deviceConfig?.extension || '',
          duration: duration,
          conversation: conversationLog,
          audioFile: audioFileExists ? path.basename(audioRecordingPath) : null
        });
      } catch (e) {
        logger.warn('Failed to save call recording', { callUuid, error: e.message });
      }
    }

    // Remove dialog listener
    dialog.off('destroy', onDialogDestroy);

    // Remove DTMF handler
    if (dtmfHandler) {
      endpoint.off('dtmf', dtmfHandler);
    }

    // Cancel any pending session expectations
    if (audioForkServer.cancelExpectation) {
      audioForkServer.cancelExpectation(callUuid);
    }

    // End AI session
    try {
      await aiBridge.endSession(callUuid);
    } catch (e) {
      // Ignore
    }

    // Stop audio fork
    if (forkRunning) {
      try {
        await endpoint.forkAudioStop();
      } catch (e) {
        // Ignore
      }
    }
  }

  // Execute IMMEDIATE Callback if requested (outside finally block to ensure cleanup is done)
  if (callbackTarget && srf && mediaServer) {
    logger.info('Initiating immediate callback', { target: callbackTarget });
    setTimeout(async () => {
      try {
        await initiateOutboundCall(srf, mediaServer, {
          to: callbackTarget,
          message: `Hello, this is ${deviceConfig?.name || 'Morpheus'} returning your call.`,
          callerId: deviceConfig?.extension || '9000',
          deviceConfig: deviceConfig,
          timeoutSeconds: 45,
          mode: 'conversation' // Start conversation immediately
        });
      } catch (err) {
        logger.error('Immediate callback failed', { error: err.message });
      }
    }, 2000);
  }

  // Execute SCHEDULED Callback if requested
  if (scheduledCallbackInfo && srf && mediaServer) {
    logger.info('Scheduling callback', { info: scheduledCallbackInfo });
    try {
      const result = scheduleCallback({
        phoneNumber: scheduledCallbackInfo.phoneNumber,
        message: scheduledCallbackInfo.message,
        delay: scheduledCallbackInfo.delay,
        deviceConfig: deviceConfig,
        srf: srf,
        mediaServer: mediaServer
      });
      logger.info('Callback scheduled successfully', { result });
    } catch (err) {
      logger.error('Failed to schedule callback', { error: err.message });
    }
  }
}

module.exports = {
  runConversationLoop,
  extractVoiceLine,
  isGoodbye,
  getRandomThinkingPhrase,
  READY_BEEP_URL,
  GOTIT_BEEP_URL,
  HOLD_MUSIC_URL
};
