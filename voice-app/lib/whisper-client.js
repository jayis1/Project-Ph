/**
 * Local Whisper STT Client
 * Sends audio to a local Whisper-compatible HTTP endpoint (e.g. whisper.cpp server)
 * No OpenAI API key required.
 */

const axios = require('axios');
const FormData = require('form-data');
const WaveFile = require('wavefile').WaveFile;
const fs = require('fs');
const path = require('path');

const LOCAL_STT_URL = process.env.LOCAL_STT_URL || 'http://host.docker.internal:8080/v1';

/**
 * Convert L16 PCM buffer to WAV
 * @param {Buffer} pcmBuffer
 * @param {number} sampleRate
 * @returns {Buffer}
 */
function pcmToWav(pcmBuffer, sampleRate = 8000) {
  const wav = new WaveFile();
  const samples = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.length / 2);
  wav.fromScratch(1, sampleRate, '16', samples);
  return Buffer.from(wav.toBuffer());
}

/**
 * Transcribe audio using a local Whisper-compatible server
 * @param {Buffer} audioBuffer - Raw PCM or WAV audio
 * @param {Object} options
 * @param {string} options.format - 'pcm' or 'wav' (default: 'pcm')
 * @param {number} options.sampleRate - PCM sample rate (default: 8000)
 * @param {string} options.language - Language hint (default: 'en')
 * @returns {Promise<string>} Transcribed text
 */
async function transcribe(audioBuffer, options = {}) {
  const { format = 'pcm', sampleRate = 8000, language = 'en' } = options;
  const timestamp = new Date().toISOString();

  // Convert to WAV if needed
  const wavBuffer = format === 'pcm' ? pcmToWav(audioBuffer, sampleRate) : audioBuffer;

  const tempFile = path.join('/tmp', `whisper-${Date.now()}.wav`);

  try {
    fs.writeFileSync(tempFile, wavBuffer);
    console.log(`[${timestamp}] WHISPER Sending ${wavBuffer.length} bytes to ${LOCAL_STT_URL}`);

    const form = new FormData();
    form.append('file', fs.createReadStream(tempFile), { filename: 'audio.wav', contentType: 'audio/wav' });
    form.append('model', 'whisper-base');
    form.append('language', language);
    form.append('response_format', 'text');

    let response;
    try {
      // Try standard OpenAI-compatible whisper.cpp endpoint first
      response = await axios.post(
        `${LOCAL_STT_URL}/audio/transcriptions`,
        form,
        { headers: form.getHeaders(), timeout: 30000, maxContentLength: Infinity, maxBodyLength: Infinity }
      );
    } catch (apiError) {
      if (apiError.response && apiError.response.status === 404) {
        // Fallback to Linto STT engine format
        const lintoUrl = LOCAL_STT_URL.replace(/\/v1\/?$/, '') + '/transcribe';
        console.log(`[${timestamp}] WHISPER Retry with Linto API: ${lintoUrl}`);
        response = await axios.post(
          lintoUrl,
          form,
          { headers: form.getHeaders(), timeout: 30000, maxContentLength: Infinity, maxBodyLength: Infinity }
        );
      } else {
        throw apiError;
      }
    }

    const text = typeof response.data === 'string' ? response.data.trim() : (response.data.text || '').trim();
    console.log(`[${timestamp}] WHISPER Transcribed: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
    return text;

  } catch (error) {
    console.error(`[${timestamp}] WHISPER Error: ${error.message}`);
    throw error;
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (_) { /* ignore */ }
    }
  }
}

/**
 * Whisper is always considered available (local server)
 */
function isAvailable() {
  return true;
}

module.exports = { transcribe, pcmToWav, isAvailable };
