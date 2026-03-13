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

    // Proxy /api requests to the main voice-app API server
    app.use('/api', (req, res) => {
        // Buffer the incoming body first
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            const body = Buffer.concat(chunks);

            const options = {
                hostname: '127.0.0.1',
                port: apiPort,
                path: '/api' + req.url,
                method: req.method,
                headers: {
                    'content-type': req.headers['content-type'] || 'application/json',
                    'content-length': body.length
                }
            };

            const proxyReq = http.request(options, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res, { end: true });
            });

            proxyReq.on('error', (err) => {
                console.error('[MISSION CONTROL] Proxy error:', err.message);
                if (!res.headersSent) {
                    res.status(502).json({ error: 'Proxy error', details: err.message });
                }
            });

            proxyReq.write(body);
            proxyReq.end();
        });
    });

    const server = app.listen(port, () => {
        console.log(`[${new Date().toISOString()}] MISSION CONTROL Dashboard: http://localhost:${port}`);
    });

    return { app, server, close: () => server.close() };
}

module.exports = { startMissionControl };

