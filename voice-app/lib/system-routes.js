/**
 * System Routes
 * Provides system stats, health checks, and voicemail access for Mission Control
 */

const express = require('express');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');
const voicemailService = require('./voicemail-service');

const router = express.Router();

// Track server start time
const serverStartTime = Date.now();

/**
 * GET /api/system-stats
 * Returns CPU, memory, disk, and uptime info
 */
router.get('/system-stats', (req, res) => {
    const loadAvg = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Disk usage
    let disk = { total: 0, used: 0, percent: 0 };
    try {
        const dfOutput = execSync("df -B1 / | tail -1", { encoding: 'utf8' });
        const parts = dfOutput.trim().split(/\s+/);
        disk = {
            total: parseInt(parts[1]) || 0,
            used: parseInt(parts[2]) || 0,
            percent: parseInt(parts[4]) || 0
        };
    } catch (e) { /* ignore */ }

    res.json({
        uptime: Math.floor((Date.now() - serverStartTime) / 1000),
        systemUptime: os.uptime(),
        cpu: {
            cores: os.cpus().length,
            loadAvg: loadAvg.map(l => Math.round(l * 100) / 100)
        },
        memory: {
            total: totalMem,
            used: usedMem,
            percent: Math.round((usedMem / totalMem) * 100)
        },
        disk
    });
});

/**
 * GET /api/health
 * Check connectivity to Ollama, Whisper STT, and TTS services
 */
router.get('/health', async (req, res) => {
    const checks = {};

    // Ollama
    try {
        const ollamaUrl = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';
        const r = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 3000 });
        checks.ollama = { status: 'online', models: r.data.models?.length || 0 };
    } catch (e) {
        checks.ollama = { status: 'offline', error: e.message };
    }

    // Whisper STT
    try {
        const sttUrl = process.env.LOCAL_STT_URL || 'http://127.0.0.1:8080/v1';
        // Just check if the endpoint responds
        const baseUrl = sttUrl.replace(/\/v1\/?$/, '');
        await axios.get(`${baseUrl}/health`, { timeout: 3000 }).catch(() =>
            axios.get(baseUrl, { timeout: 3000 })
        );
        checks.whisper = { status: 'online' };
    } catch (e) {
        checks.whisper = { status: 'offline', error: e.message };
    }

    // TTS
    try {
        const ttsUrl = process.env.LOCAL_TTS_URL || 'http://127.0.0.1:8000/v1/audio/speech';
        const baseUrl = ttsUrl.replace(/\/v1\/audio\/speech\/?$/, '').replace(/\/api\/tts\/?$/, '');
        await axios.get(baseUrl, { timeout: 3000 });
        checks.tts = { status: 'online' };
    } catch (e) {
        checks.tts = { status: 'offline', error: e.message };
    }

    res.json(checks);
});

/**
 * GET /api/voicemails
 * List voicemails for all configured extensions
 */
router.get('/voicemails', async (req, res) => {
    try {
        const deviceRegistry = require('./device-registry');
        const extensions = deviceRegistry.getAllDevices().map(d => d.extension);

        const allMessages = [];
        for (const ext of extensions) {
            const messages = await voicemailService.listVoicemails(ext);
            messages.forEach(m => {
                m.extension = ext;
                allMessages.push(m);
            });
        }

        // Sort newest first
        allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json({ voicemails: allMessages });
    } catch (err) {
        res.json({ voicemails: [], error: err.message });
    }
});

/**
 * GET /api/voicemails/:extension/:id/audio
 * Stream voicemail audio file for playback
 */
router.get('/voicemails/:extension/:id/audio', async (req, res) => {
    try {
        const { extension, id } = req.params;
        const messages = await voicemailService.listVoicemails(extension);
        const msg = messages.find(m => m.id === id);

        if (!msg || !msg.wavPath) {
            return res.status(404).json({ error: 'Voicemail not found' });
        }

        res.setHeader('Content-Type', 'audio/wav');
        fs.createReadStream(msg.wavPath).pipe(res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
