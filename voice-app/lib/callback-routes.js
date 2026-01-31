/**
 * API routes for managing scheduled callbacks
 */

const express = require('express');
const router = express.Router();
const logger = require('./logger');
const {
    listScheduledCallbacks,
    getCallback,
    cancelCallback
} = require('./scheduled-callbacks');

/**
 * GET /api/callbacks
 * List all scheduled callbacks
 */
router.get('/callbacks', (req, res) => {
    try {
        const callbacks = listScheduledCallbacks();
        res.json({
            success: true,
            count: callbacks.length,
            callbacks
        });
    } catch (error) {
        logger.error('Error listing callbacks', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/callbacks/:id
 * Get specific callback by ID
 */
router.get('/callbacks/:id', (req, res) => {
    try {
        const callback = getCallback(req.params.id);

        if (!callback) {
            return res.status(404).json({
                success: false,
                error: 'Callback not found'
            });
        }

        res.json({
            success: true,
            callback
        });
    } catch (error) {
        logger.error('Error getting callback', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/callbacks/:id
 * Cancel a scheduled callback
 */
router.delete('/callbacks/:id', (req, res) => {
    try {
        const success = cancelCallback(req.params.id);

        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Callback not found'
            });
        }

        res.json({
            success: true,
            message: 'Callback cancelled'
        });
    } catch (error) {
        logger.error('Error cancelling callback', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
