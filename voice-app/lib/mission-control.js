const express = require('express');
const path = require('path');
const http = require('http');

function startMissionControl(port = 3030, apiPort = 3000) {
    const app = express();

    // Serve static files from public directory
    app.use(express.static(path.join(__dirname, '..', 'public')));

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    // Simple proxy for /api requests to bypass CORS
    app.use('/api', (req, res) => {
        const options = {
            hostname: '127.0.0.1',
            port: apiPort,
            path: '/api' + req.url,
            method: req.method,
            headers: req.headers
        };

        // Remove host header to avoid resolution issues
        delete options.headers.host;

        const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        });

        proxyReq.on('error', (err) => {
            console.error('[MISSION CONTROL] Proxy error:', err.message);
            res.status(500).json({ error: 'Proxy error', details: err.message });
        });

        req.pipe(proxyReq, { end: true });
    });

    const server = app.listen(port, () => {
        console.log(`[${new Date().toISOString()}] MISSION CONTROL Server started on port ${port}`);
    });

    return { app, server, close: () => server.close() };
}

module.exports = { startMissionControl };
