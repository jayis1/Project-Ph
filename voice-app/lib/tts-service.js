/**
 * Local TTS Service — Voxtral TTS via vLLM-Omni
 * Sends text to a local vLLM-Omni server running Voxtral 4B TTS.
 * OpenAI-compatible /v1/audio/speech endpoint.
 * Requires NVIDIA GPU with ≥16GB VRAM.
 * No cloud API keys required — fully local inference.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

const LOCAL_TTS_URL = process.env.LOCAL_TTS_URL || 'http://127.0.0.1:8000/v1/audio/speech';
const VOXTRAL_MODEL = process.env.VOXTRAL_MODEL || 'mistralai/Voxtral-4B-TTS-2603';
const VOXTRAL_VOICE = process.env.VOXTRAL_VOICE || 'professional_female';

// Audio output directory
let audioDir = path.join(__dirname, '../audio-temp');

/**
 * Set the audio output directory
 * @param {string} dir
 */
function setAudioDir(dir) {
  audioDir = dir;
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
    logger.info('Created audio directory', { path: audioDir });
  }
}

/**
 * Generate unique filename for audio file
 * @param {string} text
 * @returns {string}
 */
function generateFilename(text) {
  const hash = crypto.createHash('md5').update(text).digest('hex').substring(0, 8);
  return `tts-${Date.now()}-${hash}.wav`;
}

/**
 * Generate speech from text using local Voxtral TTS (vLLM-Omni)
 *
 * Supports two endpoint styles:
 *   - OpenAI-compatible (`/audio/speech`): POST JSON with {model, input, voice, response_format}
 *   - Generic (anything else): POST JSON with {text}
 *
 * @param {string} text - Text to convert to speech
 * @param {string} _voiceId - Ignored (voice configured via VOXTRAL_VOICE env var)
 * @returns {Promise<string>} HTTP URL to the saved audio file
 */
async function generateSpeech(text, _voiceId) {
  const startTime = Date.now();

  logger.info('Generating speech with Voxtral TTS', { textLength: text.length, url: LOCAL_TTS_URL });

  let response;

  try {
    const isOpenAICompat = LOCAL_TTS_URL.includes('/audio/speech');

    if (isOpenAICompat) {
      response = await axios({
        method: 'POST',
        url: LOCAL_TTS_URL,
        headers: { 'Content-Type': 'application/json' },
        data: {
          model: VOXTRAL_MODEL,
          input: text,
          voice: VOXTRAL_VOICE,
          response_format: 'wav'
        },
        responseType: 'arraybuffer',
        timeout: 120000
      });
    } else {
      // Generic simple TTS POST (fallback for other TTS servers)
      response = await axios({
        method: 'POST',
        url: LOCAL_TTS_URL,
        headers: { 'Content-Type': 'application/json' },
        data: { text },
        responseType: 'arraybuffer',
        timeout: 120000
      });
    }

    const filename = generateFilename(text);
    const filepath = path.join(audioDir, filename);
    fs.writeFileSync(filepath, response.data);

    const latency = Date.now() - startTime;
    logger.info('Voxtral TTS generation successful', { filename, fileSize: response.data.length, latency });

    return `http://127.0.0.1:3000/audio-files/${filename}`;

  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error('Voxtral TTS generation failed', {
      error: error.message,
      latency,
      url: LOCAL_TTS_URL,
      status: error.response?.status
    });
    throw new Error(`TTS generation failed: ${error.message}`);
  }
}

/**
 * Clean up old audio files
 * @param {number} maxAgeMs - Max age in ms (default: 1 hour)
 */
function cleanupOldFiles(maxAgeMs = 60 * 60 * 1000) {
  try {
    const now = Date.now();
    const files = fs.readdirSync(audioDir);
    let deletedCount = 0;

    files.forEach(file => {
      if (!file.startsWith('tts-') || !file.endsWith('.wav')) return;
      const stats = fs.statSync(path.join(audioDir, file));
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(path.join(audioDir, file));
        deletedCount++;
      }
    });

    if (deletedCount > 0) logger.info('Cleaned up old audio files', { deletedCount });
  } catch (error) {
    logger.warn('Failed to cleanup old audio files', { error: error.message });
  }
}

// Initialize
setAudioDir(audioDir);

// Periodic cleanup every 30 minutes
setInterval(() => cleanupOldFiles(), 30 * 60 * 1000);

module.exports = { generateSpeech, setAudioDir, cleanupOldFiles };
