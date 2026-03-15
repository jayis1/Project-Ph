/**
 * Call Recordings Service
 * Persists completed call data (transcripts, metadata) to disk for Mission Control playback
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const RECORDINGS_DIR = process.env.RECORDINGS_DIR || '/app/recordings';
const MAX_RECORDINGS = 100; // Keep last N recordings

// Ensure directory exists
try {
    if (!fs.existsSync(RECORDINGS_DIR)) {
        fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    }
} catch (e) {
    console.error('[RECORDINGS] Failed to create dir:', e.message);
}

/**
 * Save a completed call record to disk
 * @param {Object} data - Call data
 * @param {string} data.callId - Unique call ID
 * @param {string} data.direction - 'inbound' or 'outbound'
 * @param {string} data.callerNumber - Phone number / caller ID
 * @param {string} data.device - Device name (e.g. 'Trinity')
 * @param {string} data.extension - Extension number
 * @param {number} data.duration - Duration in seconds
 * @param {Array} data.conversation - Array of {role, text, timestamp} turns
 * @param {string} [data.ttsAudioUrl] - Last TTS audio URL if available
 */
function saveRecording(data) {
    try {
        const record = {
            callId: data.callId,
            direction: data.direction || 'unknown',
            callerNumber: data.callerNumber || 'Unknown',
            device: data.device || 'Unknown',
            extension: data.extension || '',
            duration: data.duration || 0,
            initialMessage: data.initialMessage || null,
            conversation: data.conversation || [],
            ttsAudioUrl: data.ttsAudioUrl || null,
            timestamp: new Date().toISOString(),
            savedAt: Date.now()
        };

        const filename = `${record.savedAt}-${data.callId}.json`;
        const filepath = path.join(RECORDINGS_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(record, null, 2));

        logger.info('Call recording saved', { callId: data.callId, file: filename });

        // Prune old recordings
        pruneRecordings();

        return record;
    } catch (err) {
        logger.error('Failed to save recording', { callId: data.callId, error: err.message });
        return null;
    }
}

/**
 * List all saved recordings, newest first
 * @param {number} [limit=50] - Max recordings to return
 * @returns {Array} Recording records
 */
function listRecordings(limit = 50) {
    try {
        if (!fs.existsSync(RECORDINGS_DIR)) return [];

        const files = fs.readdirSync(RECORDINGS_DIR)
            .filter(f => f.endsWith('.json'))
            .sort()
            .reverse()
            .slice(0, limit);

        return files.map(f => {
            try {
                const content = fs.readFileSync(path.join(RECORDINGS_DIR, f), 'utf8');
                return JSON.parse(content);
            } catch (e) {
                return null;
            }
        }).filter(Boolean);
    } catch (err) {
        logger.error('Failed to list recordings', { error: err.message });
        return [];
    }
}

/**
 * Get a single recording by callId
 * @param {string} callId
 * @returns {Object|null}
 */
function getRecording(callId) {
    try {
        if (!fs.existsSync(RECORDINGS_DIR)) return null;

        const files = fs.readdirSync(RECORDINGS_DIR);
        const match = files.find(f => f.includes(callId));
        if (!match) return null;

        const content = fs.readFileSync(path.join(RECORDINGS_DIR, match), 'utf8');
        return JSON.parse(content);
    } catch (err) {
        return null;
    }
}

/**
 * Delete old recordings to stay under MAX_RECORDINGS
 */
function pruneRecordings() {
    try {
        const files = fs.readdirSync(RECORDINGS_DIR)
            .filter(f => f.endsWith('.json'))
            .sort();

        if (files.length > MAX_RECORDINGS) {
            const toDelete = files.slice(0, files.length - MAX_RECORDINGS);
            toDelete.forEach(f => {
                try { fs.unlinkSync(path.join(RECORDINGS_DIR, f)); } catch (e) { /* ignore */ }
            });
            logger.info('Pruned old recordings', { deleted: toDelete.length });
        }
    } catch (e) { /* ignore */ }
}

module.exports = { saveRecording, listRecordings, getRecording };
