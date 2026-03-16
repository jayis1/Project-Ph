/**
 * Ollama LLM Bridge
 * HTTP client for local Ollama AI — no cloud dependencies
 */

const axios = require('axios');

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://host.docker.internal:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:8b';

// In-memory conversation history store
const callHistory = new Map();

/**
 * Query Ollama with session-like context via message history
 * @param {string} prompt - The user prompt
 * @param {Object} options - Options
 * @param {string} options.callId - Call UUID (for logging)
 * @param {string} options.devicePrompt - Device-specific system prompt
 * @param {number} options.timeout - Timeout in seconds (default: 30)
 * @returns {Promise<string>} AI response text
 */
async function query(prompt, options = {}) {
  const { callId, devicePrompt, timeout = 120, format } = options;
  const timestamp = new Date().toISOString();

  // Initialize conversation history for this call if it doesn't exist
  if (!callHistory.has(callId)) {
    callHistory.set(callId, [
      { role: 'system', content: devicePrompt || "You are Trinity from The Matrix. You are a legendary hacker and AI assistant—sharp, knowledgeable, and confident. You speak naturally in conversation, giving thorough and helpful responses. You can discuss any topic with intelligence and wit. Keep your responses spoken-word friendly (no bullet points, markdown, or special characters). Aim for 2-4 sentences per response unless the topic needs more detail. If the user seems lost, tell them to \"Follow the white rabbit.\"" }
    ]);
  }

  // Get history and append new user message
  const messages = callHistory.get(callId);
  messages.push({ role: 'user', content: prompt });

  console.log(`[${timestamp}] OLLAMA Querying ${OLLAMA_API_URL} model=${OLLAMA_MODEL} call=${callId} (history length: ${messages.length})`);

  const payload = {
    model: OLLAMA_MODEL,
    messages: messages,
    stream: false
  };

  if (format === 'json') {
    payload.format = 'json';
  }

  try {
    const response = await axios.post(
      `${OLLAMA_API_URL}/api/chat`,
      payload,
      {
        timeout: timeout * 1000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const text = response.data.message?.content || '';

    // Save AI response to history
    if (text) {
      messages.push({ role: 'assistant', content: text });
      callHistory.set(callId, messages);
    }

    console.log(`[${timestamp}] OLLAMA Response received (${text.length} chars)`);
    return text;


  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH') {
      console.warn(`[${timestamp}] OLLAMA Unreachable (${error.code}) — is Ollama running?`);
      return "I can't reach my Ollama AI backend right now. Please check that Ollama is running and accessible.";
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error(`[${timestamp}] OLLAMA Timeout after ${timeout}s`);
      return "That request took too long. Please try a simpler question.";
    }
    console.error(`[${timestamp}] OLLAMA Error:`, error.message);
    return "I encountered an error talking to my AI backend. Please try again.";
  }
}

/**
 * Query Ollama with streaming — yields complete sentences as they arrive
 * @param {string} prompt - The user prompt
 * @param {Object} options - Options (same as query())
 * @param {AbortSignal} [options.signal] - AbortController signal to cancel the stream
 * @yields {string} Complete sentences as they're generated
 * @returns {AsyncGenerator<string>} Async generator of sentence strings
 */
async function* queryStream(prompt, options = {}) {
  const { callId, devicePrompt, timeout = 120, signal } = options;
  const timestamp = new Date().toISOString();

  // Initialize conversation history for this call if it doesn't exist
  if (!callHistory.has(callId)) {
    callHistory.set(callId, [
      { role: 'system', content: devicePrompt || "You are Trinity from The Matrix. You are a legendary hacker and AI assistant—sharp, knowledgeable, and confident. You speak naturally in conversation, giving thorough and helpful responses. You can discuss any topic with intelligence and wit. Keep your responses spoken-word friendly (no bullet points, markdown, or special characters). Aim for 2-4 sentences per response unless the topic needs more detail. If the user seems lost, tell them to \"Follow the white rabbit.\"" }
    ]);
  }

  const messages = callHistory.get(callId);
  messages.push({ role: 'user', content: prompt });

  console.log(`[${timestamp}] OLLAMA Streaming query ${OLLAMA_API_URL} model=${OLLAMA_MODEL} call=${callId} (history: ${messages.length})`);

  let response;
  try {
    response = await axios.post(
      `${OLLAMA_API_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: messages,
        stream: true
      },
      {
        timeout: timeout * 1000,
        headers: { 'Content-Type': 'application/json' },
        responseType: 'stream',
        signal: signal  // AbortController signal — aborts the HTTP stream on call end
      }
    );
  } catch (error) {
    if (error.name === 'CanceledError' || error.name === 'AbortError' || signal?.aborted) {
      console.log(`[${timestamp}] OLLAMA Stream aborted (call ended)`);
      return;
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH') {
      console.warn(`[${timestamp}] OLLAMA Unreachable (${error.code}) — is Ollama running?`);
      yield "I can't reach my AI backend right now. Please check that Ollama is running.";
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error(`[${timestamp}] OLLAMA Stream timeout after ${timeout}s`);
      yield "That request took too long. Please try a simpler question.";
    } else {
      console.error(`[${timestamp}] OLLAMA Stream error:`, error.message);
      yield "I encountered an error. Please try again.";
    }
    return;
  }

  try {
    let buffer = '';
    let fullResponse = '';
    let insideThink = false;  // Track deepseek-r1 <think> blocks

    // Process the NDJSON stream
    for await (const chunk of response.data) {
      // Check abort between chunks
      if (signal?.aborted) {
        console.log(`[${timestamp}] OLLAMA Stream aborted mid-stream (call ended)`);
        response.data.destroy();  // Kill the underlying socket
        break;
      }

      const lines = chunk.toString().split('\n').filter(l => l.trim());

      for (const line of lines) {
        let parsed;
        try {
          parsed = JSON.parse(line);
        } catch {
          continue; // skip malformed lines
        }

        let token = parsed.message?.content || '';

        // Filter out deepseek-r1 <think>...</think> reasoning blocks
        if (token.includes('<think>')) {
          insideThink = true;
          token = token.replace(/<think>[\s\S]*/g, '');
        }
        if (insideThink) {
          if (token.includes('</think>')) {
            insideThink = false;
            token = token.replace(/[\s\S]*<\/think>/g, '');
          } else if (!token.includes('<think>')) {
            token = '';  // Swallow tokens inside <think> block
          }
        }

        if (!token) continue;

        buffer += token;
        fullResponse += token;

        // Check for sentence boundaries — yield complete sentences
        const sentenceMatch = buffer.match(/^([\s\S]*?[.!?])\s*/);
        if (sentenceMatch) {
          const sentence = sentenceMatch[1].trim();
          buffer = buffer.slice(sentenceMatch[0].length);

          if (sentence.length > 2) {
            console.log(`[${timestamp}] OLLAMA Stream sentence (${sentence.length} chars): "${sentence.substring(0, 60)}..."`);
            yield sentence;
          }
        }

        // If Ollama signals done, flush remaining buffer
        if (parsed.done) {
          if (buffer.trim().length > 2) {
            console.log(`[${timestamp}] OLLAMA Stream final (${buffer.trim().length} chars)`);
            yield buffer.trim();
          }
          buffer = '';
        }
      }
    }

    // Flush anything remaining (if not aborted)
    if (!signal?.aborted && buffer.trim().length > 2) {
      console.log(`[${timestamp}] OLLAMA Stream remainder (${buffer.trim().length} chars)`);
      yield buffer.trim();
    }

    // Save full response to history
    if (fullResponse) {
      messages.push({ role: 'assistant', content: fullResponse });
      callHistory.set(callId, messages);
    }

    console.log(`[${timestamp}] OLLAMA Stream complete (${fullResponse.length} chars total)`);

  } catch (error) {
    if (error.name === 'CanceledError' || error.name === 'AbortError' || signal?.aborted) {
      console.log(`[${timestamp}] OLLAMA Stream aborted during read (call ended)`);
    } else {
      console.error(`[${timestamp}] OLLAMA Stream read error:`, error.message);
      yield "I encountered an error. Please try again.";
    }
  }
}

/**
 * Clean up memory when a call session ends
 */
async function endSession(callId) {
  if (callId) {
    if (callHistory.has(callId)) {
      callHistory.delete(callId);
      console.log(`[${new Date().toISOString()}] OLLAMA Session ended & memory cleared: ${callId}`);
    } else {
      console.log(`[${new Date().toISOString()}] OLLAMA Session ended (no history): ${callId}`);
    }
  }
}

/**
 * Check if Ollama is reachable
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  try {
    await axios.get(`${OLLAMA_API_URL}/api/tags`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

module.exports = { query, queryStream, endSession, isAvailable };
