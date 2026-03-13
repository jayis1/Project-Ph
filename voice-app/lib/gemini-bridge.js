/**
 * Ollama LLM Bridge
 * HTTP client for local Ollama AI — no cloud dependencies
 */

const axios = require('axios');

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://host.docker.internal:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

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
  const { callId, devicePrompt, timeout = 120 } = options;
  const timestamp = new Date().toISOString();

  // Initialize conversation history for this call if it doesn't exist
  if (!callHistory.has(callId)) {
    callHistory.set(callId, [
      { role: 'system', content: devicePrompt || 'You are a helpful AI assistant. Be concise and direct. Keep responses under 40 words.' }
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

module.exports = { query, endSession, isAvailable };
