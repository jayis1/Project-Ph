/**
 * Simple logger module
 * Provides consistent logging format with timestamps
 * Stores recent logs in memory for the Mission Control dashboard
 */

// In-memory ring buffer for recent logs (max 200 entries)
const LOG_BUFFER_SIZE = 200;
const logBuffer = [];

function addToBuffer(level, message, data) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data: data || {}
  };
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

function formatMessage(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const dataStr = Object.keys(data).length > 0 ? ' ' + JSON.stringify(data) : '';
  return `[${timestamp}] ${level.toUpperCase()} ${message}${dataStr}`;
}

function info(message, data) {
  addToBuffer('info', message, data);
  console.log(formatMessage('info', message, data));
}

function warn(message, data) {
  addToBuffer('warn', message, data);
  console.warn(formatMessage('warn', message, data));
}

function error(message, data) {
  addToBuffer('error', message, data);
  console.error(formatMessage('error', message, data));
}

function debug(message, data) {
  if (process.env.DEBUG) {
    addToBuffer('debug', message, data);
    console.log(formatMessage('debug', message, data));
  }
}

function getRecentLogs(count = 50) {
  return logBuffer.slice(-count);
}

module.exports = {
  info,
  warn,
  error,
  debug,
  getRecentLogs
};

