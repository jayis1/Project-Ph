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
 * Detect hallucinated transcription (repeated phrases)
 * Whisper commonly hallucinates by repeating the same word/phrase many times
 * @param {string} text
 * @returns {boolean} true if hallucination detected
 */
function isHallucination(text) {
  if (!text || text.length < 10) return false;

  // Split into words
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length < 4) return false;

  // Check if a single word dominates (>70% of words are the same)
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(freq));
  if (maxFreq / words.length > 0.7 && maxFreq >= 4) return true;

  // Check for repeated 2-3 word phrases
  for (const phraseLen of [2, 3]) {
    if (words.length < phraseLen * 3) continue;
    const phrases = {};
    for (let i = 0; i <= words.length - phraseLen; i++) {
      const phrase = words.slice(i, i + phraseLen).join(' ');
      phrases[phrase] = (phrases[phrase] || 0) + 1;
    }
    const maxPhraseFreq = Math.max(...Object.values(phrases));
    if (maxPhraseFreq >= 4 && maxPhraseFreq / (words.length / phraseLen) > 0.5) return true;
  }

  return false;
}

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

    const createForm = () => {
      const f = new FormData();
      f.append('file', fs.createReadStream(tempFile), { filename: 'audio.wav', contentType: 'audio/wav' });
      f.append('model', process.env.WHISPER_MODEL || 'whisper-1');
      if (language) {
        f.append('language', language);
      }
      f.append('response_format', 'json');
      // Anti-hallucination parameters
      f.append('temperature', '0');
      f.append('condition_on_previous_text', 'false');
      return f;
    };

    let response;
    try {
      // Try standard OpenAI-compatible whisper.cpp endpoint first
      const form1 = createForm();
      response = await axios.post(
        `${LOCAL_STT_URL}/audio/transcriptions`,
        form1,
        { headers: form1.getHeaders(), timeout: 120000, maxContentLength: Infinity, maxBodyLength: Infinity }
      );
    } catch (apiError) {
      if (apiError.response && apiError.response.status === 404) {
        // Fallback to Linto STT engine format
        const lintoUrl = LOCAL_STT_URL.replace(/\/v1\/?$/, '') + '/transcribe';
        console.log(`[${timestamp}] WHISPER Retry with Linto API: ${lintoUrl}`);

        const form2 = createForm();
        const fallbackHeaders = form2.getHeaders();
        fallbackHeaders['Accept'] = 'application/json';

        response = await axios.post(
          lintoUrl,
          form2,
          { headers: fallbackHeaders, timeout: 120000, maxContentLength: Infinity, maxBodyLength: Infinity }
        );
      } else {
        throw apiError;
      }
    }

    let data = response.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { /* keep as string */ }
    }

    let text = '';
    if (typeof data === 'string') {
      text = data.trim();
    } else if (data && data.text) {
      text = data.text.trim();
    } else if (data && data.transcripts && data.transcripts.length > 0) {
      // Linto STT response format
      text = data.transcripts[0].text.trim();
    }

    console.log(`[${timestamp}] WHISPER Transcribed: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);

    // Detect and reject hallucinated transcriptions
    if (isHallucination(text)) {
      console.log(`[${timestamp}] WHISPER Hallucination detected, discarding: "${text.substring(0, 60)}..."`);
      return '';
    }

    return text;

  } catch (error) {
    console.error(`[${timestamp}] WHISPER Error: ${error.message}`);
    if (error.response) console.error(`[${timestamp}] WHISPER API Error: ${JSON.stringify(error.response.data)}`);
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
