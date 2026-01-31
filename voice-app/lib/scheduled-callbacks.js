/**
 * Scheduled Callback System
 * Allows AI to schedule callbacks at specific times or after delays
 */

const logger = require('./logger');
const { initiateOutboundCall } = require('./outbound-handler');

// In-memory store for scheduled callbacks
// In production, this should be persisted to a database
const scheduledCallbacks = new Map();
let callbackIdCounter = 1;

/**
 * Parse time expressions into milliseconds
 * Examples: "5 minutes", "1 hour", "30 seconds", "2 hours"
 */
function parseTimeDelay(expression) {
    const normalized = expression.toLowerCase().trim();

    // Match patterns like "5 minutes", "1 hour", "30 seconds"
    const match = normalized.match(/(\d+)\s*(second|minute|hour|min|sec|hr)s?/);

    if (!match) {
        throw new Error(`Cannot parse time expression: ${expression}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    // Convert to milliseconds
    const multipliers = {
        'second': 1000,
        'sec': 1000,
        'minute': 60 * 1000,
        'min': 60 * 1000,
        'hour': 60 * 60 * 1000,
        'hr': 60 * 60 * 1000
    };

    return value * multipliers[unit];
}

/**
 * Schedule a callback
 * @param {Object} options - Callback options
 * @param {string} options.phoneNumber - Number to call back
 * @param {string} options.message - Message to deliver
 * @param {string} options.delay - Time delay (e.g., "5 minutes")
 * @param {Object} options.deviceConfig - Device configuration
 * @param {Object} options.srf - SIP signaling
 * @param {Object} options.mediaServer - Media server instance
 * @returns {Object} Callback info
 */
function scheduleCallback(options) {
    const {
        phoneNumber,
        message,
        delay,
        deviceConfig,
        srf,
        mediaServer
    } = options;

    const callbackId = `CB${callbackIdCounter++}`;
    const delayMs = parseTimeDelay(delay);
    const scheduledTime = Date.now() + delayMs;

    logger.info('Scheduling callback', {
        callbackId,
        phoneNumber,
        delayMs,
        scheduledTime: new Date(scheduledTime).toISOString()
    });

    // Schedule the callback
    const timeoutId = setTimeout(async () => {
        logger.info('Executing scheduled callback', { callbackId, phoneNumber });

        try {
            await initiateOutboundCall(srf, mediaServer, {
                to: phoneNumber,
                message: message || `Hello, this is ${deviceConfig?.name || 'Morpheus'} calling you back as requested.`,
                callerId: deviceConfig?.extension || '9000',
                deviceConfig: deviceConfig,
                timeoutSeconds: 45,
                mode: 'conversation'
            });

            logger.info('Scheduled callback completed', { callbackId });
            scheduledCallbacks.delete(callbackId);
        } catch (error) {
            logger.error('Scheduled callback failed', {
                callbackId,
                error: error.message
            });
            scheduledCallbacks.delete(callbackId);
        }
    }, delayMs);

    // Store callback info
    const callbackInfo = {
        id: callbackId,
        phoneNumber,
        message,
        delay,
        delayMs,
        scheduledTime,
        timeoutId,
        deviceName: deviceConfig?.name || 'Morpheus'
    };

    scheduledCallbacks.set(callbackId, callbackInfo);

    return {
        success: true,
        callbackId,
        scheduledTime: new Date(scheduledTime).toISOString(),
        delay
    };
}

/**
 * Cancel a scheduled callback
 * @param {string} callbackId - Callback ID to cancel
 * @returns {boolean} Success
 */
function cancelCallback(callbackId) {
    const callback = scheduledCallbacks.get(callbackId);

    if (!callback) {
        return false;
    }

    clearTimeout(callback.timeoutId);
    scheduledCallbacks.delete(callbackId);

    logger.info('Cancelled scheduled callback', { callbackId });
    return true;
}

/**
 * List all scheduled callbacks
 * @returns {Array} List of scheduled callbacks
 */
function listScheduledCallbacks() {
    return Array.from(scheduledCallbacks.values()).map(cb => ({
        id: cb.id,
        phoneNumber: cb.phoneNumber,
        message: cb.message,
        scheduledTime: new Date(cb.scheduledTime).toISOString(),
        deviceName: cb.deviceName
    }));
}

/**
 * Get callback by ID
 * @param {string} callbackId - Callback ID
 * @returns {Object|null} Callback info or null
 */
function getCallback(callbackId) {
    const callback = scheduledCallbacks.get(callbackId);
    if (!callback) return null;

    return {
        id: callback.id,
        phoneNumber: callback.phoneNumber,
        message: callback.message,
        scheduledTime: new Date(callback.scheduledTime).toISOString(),
        deviceName: callback.deviceName
    };
}

module.exports = {
    scheduleCallback,
    cancelCallback,
    listScheduledCallbacks,
    getCallback,
    parseTimeDelay
};
