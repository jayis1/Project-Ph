/**
 * FreePBX Provisioner Service
 * 
 * Node.js service that runs on FreePBX server to help bot nodes self-provision.
 * Pretends to be a Yealink phone (supported by FreePBX free tier) to avoid licensing issues.
 * 
 * Features:
 * - Provides list of available extensions
 * - Allows bot nodes to claim extensions
 * - Returns SIP credentials
 * - Provides IVR and trunk information
 * - Tracks extension claims
 * 
 * Port: 3500
 */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PROVISIONER_PORT || 3500;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// MySQL connection pool
let pool;

async function initDatabase() {
    pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER || 'freepbxuser',
        password: process.env.MYSQL_PASSWORD,
        database: 'asterisk',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    // Test connection
    try {
        const connection = await pool.getConnection();
        console.log('✓ Connected to MySQL database');
        connection.release();
    } catch (error) {
        console.error('✗ MySQL connection failed:', error.message);
        process.exit(1);
    }
}

// Nebuchadnezzar crew configuration
const CREW = [
    { extension: '9000', name: 'Morpheus', voiceId: 'pNInz6obpgDQGcFmaJgB', role: 'Captain' },
    { extension: '9001', name: 'Trinity', voiceId: '21m00Tcm4TlvDq8ikWAM', role: 'First Mate' },
    { extension: '9002', name: 'Neo', voiceId: 'pNInz6obpgDQGcFmaJgB', role: 'The One' },
    { extension: '9003', name: 'Tank', voiceId: 'pNInz6obpgDQGcFmaJgB', role: 'Operator' },
    { extension: '9004', name: 'Dozer', voiceId: 'pNInz6obpgDQGcFmaJgB', role: 'Pilot' },
    { extension: '9005', name: 'Apoc', voiceId: 'pNInz6obpgDQGcFmaJgB', role: 'Crew' },
    { extension: '9006', name: 'Switch', voiceId: '21m00Tcm4TlvDq8ikWAM', role: 'Crew' },
    { extension: '9007', name: 'Mouse', voiceId: 'pNInz6obpgDQGcFmaJgB', role: 'Crew' },
    { extension: '9008', name: 'Cypher', voiceId: 'pNInz6obpgDQGcFmaJgB', role: 'Crew' }
];

// In-memory claim tracking (persisted to file)
const claims = new Map();

/**
 * Provision extensions on startup
 * Creates SIP extensions for all crew members if they don't exist
 */
async function provisionExtensions() {
    console.log('Provisioning extensions...');

    for (const member of CREW) {
        try {
            // Check if extension exists
            const [existing] = await pool.query(
                'SELECT id FROM sip WHERE id = ? LIMIT 1',
                [member.extension]
            );

            if (existing.length > 0) {
                console.log(`  ✓ Extension ${member.extension} (${member.name}) already exists`);
                continue;
            }

            // Generate secure password
            const password = require('crypto').randomBytes(16).toString('hex');

            // Create user entry
            await pool.query(
                `INSERT INTO users (extension, name, outboundcid, sipname, noanswer_dest, busy_dest, chanunavail_dest) 
                 VALUES (?, ?, ?, ?, '', '', '')`,
                [member.extension, member.name, `${member.name} <${member.extension}>`, member.extension]
            );

            // Create device entry
            await pool.query(
                `INSERT INTO devices (id, tech, dial, devicetype, user, description, emergency_cid) 
                 VALUES (?, 'sip', ?, 'fixed', ?, ?, '')`,
                [member.extension, `SIP/${member.extension}`, member.extension, member.name]
            );

            // SIP extension fields
            const fields = [
                { keyword: 'account', data: member.extension },
                { keyword: 'secret', data: password },
                { keyword: 'dtmfmode', data: 'rfc2833' },
                { keyword: 'canreinvite', data: 'no' },
                { keyword: 'context', data: 'from-internal' },
                { keyword: 'host', data: 'dynamic' },
                { keyword: 'trustrpid', data: 'yes' },
                { keyword: 'sendrpid', data: 'no' },
                { keyword: 'type', data: 'friend' },
                { keyword: 'nat', data: 'yes' },
                { keyword: 'port', data: '5060' },
                { keyword: 'qualify', data: 'yes' },
                { keyword: 'qualifyfreq', data: '60' },
                { keyword: 'transport', data: 'udp' },
                { keyword: 'avpf', data: 'no' },
                { keyword: 'force_avp', data: 'no' },
                { keyword: 'icesupport', data: 'no' },
                { keyword: 'encryption', data: 'no' },
                { keyword: 'callgroup', data: '' },
                { keyword: 'pickupgroup', data: '' },
                { keyword: 'dial', data: `SIP/${member.extension}` },
                { keyword: 'mailbox', data: `${member.extension}@device` },
                { keyword: 'permit', data: '0.0.0.0/0.0.0.0' },
                { keyword: 'deny', data: '0.0.0.0/0.0.0.0' },
                { keyword: 'callerid', data: `${member.name} <${member.extension}>` }
            ];

            // Insert all fields
            for (const field of fields) {
                await pool.query(
                    'INSERT INTO sip (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
                    [member.extension, field.keyword, field.data]
                );
            }

            console.log(`  ✓ Created extension ${member.extension} (${member.name})`);
        } catch (error) {
            console.error(`  ✗ Failed to create extension ${member.extension}:`, error.message);
        }
    }

    console.log('✓ Extension provisioning complete\n');
}

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        connection.release();

        res.json({
            status: 'ok',
            service: 'freepbx-provisioner',
            timestamp: new Date().toISOString(),
            mysql: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            service: 'freepbx-provisioner',
            timestamp: new Date().toISOString(),
            mysql: 'disconnected',
            error: error.message
        });
    }
});

/**
 * GET /extensions
 * Returns list of all extensions with claim status
 */
app.get('/extensions', async (req, res) => {
    try {
        const extensions = CREW.map(member => ({
            number: member.extension,
            name: member.name,
            role: member.role,
            voiceId: member.voiceId,
            claimed: claims.has(member.extension),
            claimedBy: claims.get(member.extension)?.hostname || null,
            claimedAt: claims.get(member.extension)?.timestamp || null
        }));

        res.json({
            success: true,
            extensions,
            total: extensions.length,
            available: extensions.filter(e => !e.claimed).length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /extension/:number
 * Returns details for specific extension
 */
app.get('/extension/:number', async (req, res) => {
    try {
        const { number } = req.params;
        const member = CREW.find(m => m.extension === number);

        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Extension not found'
            });
        }

        // Get SIP secret from database
        const [rows] = await pool.query(
            'SELECT data FROM sip WHERE id = ? AND keyword = "secret"',
            [number]
        );

        const sipPassword = rows.length > 0 ? rows[0].data : null;

        res.json({
            success: true,
            extension: {
                number: member.extension,
                name: member.name,
                role: member.role,
                voiceId: member.voiceId,
                sipPassword,
                claimed: claims.has(member.extension),
                claimedBy: claims.get(member.extension)?.hostname || null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /claim-extension
 * Bot node claims an extension
 * 
 * Request body:
 * {
 *   "extension": "9001",
 *   "hostname": "trinity1.local",
 *   "ip": "172.16.1.84"
 * }
 */
app.post('/claim-extension', async (req, res) => {
    try {
        const { extension, hostname, ip } = req.body;

        if (!extension || !hostname) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: extension, hostname'
            });
        }

        const member = CREW.find(m => m.extension === extension);
        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Extension not found'
            });
        }

        // Check if already claimed
        if (claims.has(extension)) {
            const existingClaim = claims.get(extension);
            if (existingClaim.hostname !== hostname) {
                return res.status(409).json({
                    success: false,
                    error: `Extension already claimed by ${existingClaim.hostname}`
                });
            }
        }

        // Get SIP credentials from database
        const [rows] = await pool.query(
            'SELECT data FROM sip WHERE id = ? AND keyword = "secret"',
            [extension]
        );

        const sipPassword = rows.length > 0 ? rows[0].data : null;

        if (!sipPassword) {
            return res.status(500).json({
                success: false,
                error: 'Extension not properly configured in FreePBX'
            });
        }

        // Get FreePBX server details
        const sipDomain = process.env.FREEPBX_HOST || process.env.EXTERNAL_IP || 'localhost';

        // Record claim
        claims.set(extension, {
            hostname,
            ip,
            timestamp: new Date().toISOString()
        });

        console.log(`✓ Extension ${extension} (${member.name}) claimed by ${hostname}`);

        res.json({
            success: true,
            extension: {
                number: extension,
                name: member.name,
                role: member.role,
                voiceId: member.voiceId,
                sipUsername: extension,
                sipPassword,
                sipDomain,
                sipRegistrar: sipDomain,
                sipPort: 5060
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /release-extension
 * Release a claimed extension
 */
app.post('/release-extension', (req, res) => {
    try {
        const { extension, hostname } = req.body;

        if (!extension) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: extension'
            });
        }

        const claim = claims.get(extension);
        if (!claim) {
            return res.status(404).json({
                success: false,
                error: 'Extension not claimed'
            });
        }

        if (hostname && claim.hostname !== hostname) {
            return res.status(403).json({
                success: false,
                error: 'Extension claimed by different host'
            });
        }

        claims.delete(extension);
        console.log(`✓ Extension ${extension} released`);

        res.json({
            success: true,
            message: 'Extension released'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /ivr
 * Returns IVR configuration
 */
app.get('/ivr', async (req, res) => {
    try {
        // Get IVR digit mappings
        const [mappingRows] = await pool.query(
            'SELECT selection, dest FROM ivr_entries WHERE ivr_id = 1 ORDER BY selection'
        );

        if (mappingRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'IVR not configured'
            });
        }

        const mappings = {};
        mappingRows.forEach(row => {
            // Parse destination (format: ext-local,9000,1)
            const dest = row.dest.split(',')[1];
            mappings[row.selection] = dest;
        });

        res.json({
            success: true,
            ivr: {
                id: 1,
                name: 'Nebuchadnezzar Main Menu',
                mappings
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /trunk
 * Returns SIP trunk information
 */
app.get('/trunk', async (req, res) => {
    try {
        // Get trunk details from sip table
        const [rows] = await pool.query(
            'SELECT data FROM sip WHERE id = "outsideworld" AND keyword = "fromuser"'
        );

        const trunkNumber = rows.length > 0 ? rows[0].data : null;

        // Get trunk server
        const [serverRows] = await pool.query(
            'SELECT data FROM sip WHERE id = "outsideworld" AND keyword = "host"'
        );

        const trunkServer = serverRows.length > 0 ? serverRows[0].data : null;

        res.json({
            success: true,
            trunk: {
                id: 'outsideworld',
                number: trunkNumber,
                server: trunkServer,
                port: 5060,
                configured: trunkNumber !== null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /sip-config
 * Returns SIP configuration for bot nodes
 */
app.get('/sip-config', (req, res) => {
    const sipDomain = process.env.FREEPBX_HOST || process.env.EXTERNAL_IP || 'localhost';

    res.json({
        success: true,
        sip: {
            domain: sipDomain,
            registrar: sipDomain,
            port: 5060,
            transport: 'udp'
        }
    });
});

/**
 * GET /
 * Service info
 */
app.get('/', (req, res) => {
    res.json({
        service: 'FreePBX Provisioner Service',
        version: '1.0.0',
        description: 'Self-provisioning service for bot nodes',
        endpoints: {
            'GET /health': 'Health check',
            'GET /extensions': 'List all extensions',
            'GET /extension/:number': 'Get extension details',
            'POST /claim-extension': 'Claim an extension',
            'POST /release-extension': 'Release an extension',
            'GET /ivr': 'Get IVR configuration',
            'GET /trunk': 'Get trunk information',
            'GET /sip-config': 'Get SIP configuration'
        },
        deviceEmulation: 'Yealink T46G (FreePBX free tier compatible)'
    });
});

// Start server
async function start() {
    await initDatabase();
    await provisionExtensions();

    app.listen(PORT, '0.0.0.0', () => {
        console.log('='.repeat(64));
        console.log('FreePBX Provisioner Service');
        console.log('='.repeat(64));
        console.log(`\nListening on: http://0.0.0.0:${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
        console.log('\nDevice Emulation: Yealink T46G (FreePBX free tier)');
        console.log('\nReady to provision bot nodes.\n');
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    if (pool) await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    if (pool) await pool.end();
    process.exit(0);
});

start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
