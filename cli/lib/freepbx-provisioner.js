import {
    validateConnections,
    createMySQLPool,
    executeSSHCommand,
    executeMySQLQuery,
    reloadFreePBX
} from './freepbx-connection.js';
import { decryptConfig } from './credential-manager.js';

/**
 * FreePBX Provisioning Orchestrator
 * Coordinates all provisioning steps for complete FreePBX setup
 */

// Nebuchadnezzar crew configuration
const DEFAULT_CREW = [
    { name: 'Morpheus', extension: '9000', voiceId: 'pNInz6obpgDQGcFmaJgB' },
    { name: 'Trinity', extension: '9001', voiceId: '21m00Tcm4TlvDq8ikWAM' },
    { name: 'Neo', extension: '9002', voiceId: 'pNInz6obpgDQGcFmaJgB' },
    { name: 'Tank', extension: '9003', voiceId: 'pNInz6obpgDQGcFmaJgB' },
    { name: 'Dozer', extension: '9004', voiceId: 'pNInz6obpgDQGcFmaJgB' },
    { name: 'Apoc', extension: '9005', voiceId: 'pNInz6obpgDQGcFmaJgB' },
    { name: 'Switch', extension: '9006', voiceId: '21m00Tcm4TlvDq8ikWAM' },
    { name: 'Mouse', extension: '9007', voiceId: 'pNInz6obpgDQGcFmaJgB' },
    { name: 'Cypher', extension: '9008', voiceId: 'pNInz6obpgDQGcFmaJgB' }
];

/**
 * Validate FreePBX connectivity
 * @param {object} config - Configuration with freepbx section
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<object>} Validation result
 */
export async function validateConnection(config, progressCallback = () => { }) {
    progressCallback({ step: 'validate', status: 'running', message: 'Validating FreePBX connectivity...' });

    const decrypted = decryptConfig(config);

    const connectionConfig = {
        ssh: {
            host: decrypted.freepbx.host,
            user: decrypted.freepbx.sshUser || 'root',
            password: decrypted.freepbx.sshPassword
        },
        mysql: {
            host: decrypted.freepbx.mysqlHost || decrypted.freepbx.host,
            port: decrypted.freepbx.mysqlPort || 3306,
            user: decrypted.freepbx.mysqlUser || 'freepbxuser',
            password: decrypted.freepbx.mysqlPassword,
            database: 'asterisk'
        }
    };

    try {
        const result = await validateConnections(connectionConfig);

        if (result.success) {
            progressCallback({ step: 'validate', status: 'success', message: 'FreePBX connectivity validated' });
            return { success: true, connectionConfig };
        } else {
            progressCallback({ step: 'validate', status: 'error', message: 'FreePBX connectivity failed', details: result.results });
            return { success: false, error: 'Connection validation failed', details: result.results };
        }
    } catch (error) {
        progressCallback({ step: 'validate', status: 'error', message: error.message });
        return { success: false, error: error.message };
    }
}

/**
 * Provision infrastructure (MySQL users, firewall)
 * @param {object} config - Configuration
 * @param {object} connectionConfig - Connection configuration
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<object>} Provisioning result
 */
export async function provisionInfrastructure(config, connectionConfig, progressCallback = () => { }) {
    progressCallback({ step: 'infrastructure', status: 'running', message: 'Provisioning infrastructure...' });

    const decrypted = decryptConfig(config);
    const botSubnet = decrypted.freepbx.botSubnet || '172.16.1.0/24';
    const botSubnetPrefix = botSubnet.split('/')[0].split('.').slice(0, 3).join('.');

    try {
        // Create MySQL bot provisioning user
        progressCallback({ step: 'infrastructure', status: 'running', message: 'Creating MySQL bot user...' });

        const createUserSQL = `
      CREATE USER IF NOT EXISTS 'botprov'@'${botSubnetPrefix}.%' IDENTIFIED BY 'GeminiBot2026!';
      GRANT SELECT, INSERT, UPDATE, DELETE ON asterisk.* TO 'botprov'@'${botSubnetPrefix}.%';
      FLUSH PRIVILEGES;
    `;

        const mysqlResult = await executeSSHCommand(
            connectionConfig.ssh,
            `mysql -u root -e "${createUserSQL.replace(/"/g, '\\"')}"`
        );

        if (!mysqlResult.success) {
            throw new Error(`MySQL user creation failed: ${mysqlResult.error}`);
        }

        // Configure firewall rules
        progressCallback({ step: 'infrastructure', status: 'running', message: 'Configuring firewall...' });

        const firewallCommands = [
            `firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="${botSubnet}" port port="3306" protocol="tcp" accept'`,
            `firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="${botSubnet}" port port="5060" protocol="udp" accept'`,
            `firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="${botSubnet}" port port="10000-20000" protocol="udp" accept'`,
            `firewall-cmd --reload`
        ];

        for (const cmd of firewallCommands) {
            await executeSSHCommand(connectionConfig.ssh, cmd);
        }

        progressCallback({ step: 'infrastructure', status: 'success', message: 'Infrastructure provisioned' });
        return { success: true };
    } catch (error) {
        progressCallback({ step: 'infrastructure', status: 'error', message: error.message });
        return { success: false, error: error.message };
    }
}

/**
 * Provision extensions
 * @param {object} config - Configuration
 * @param {object} pool - MySQL connection pool
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<object>} Provisioning result
 */
export async function provisionExtensions(config, pool, progressCallback = () => { }) {
    progressCallback({ step: 'extensions', status: 'running', message: 'Provisioning extensions...' });

    const crew = config.crew || DEFAULT_CREW;
    const results = { created: 0, skipped: 0, failed: 0 };

    try {
        for (const member of crew) {
            progressCallback({
                step: 'extensions',
                status: 'running',
                message: `Provisioning ${member.name} (${member.extension})...`
            });

            // Check if extension exists
            const checkResult = await executeMySQLQuery(
                pool,
                'SELECT COUNT(*) as count FROM sip WHERE id = ?',
                [member.extension]
            );

            if (checkResult.success && checkResult.rows[0].count > 0) {
                results.skipped++;
                continue;
            }

            // Create extension with all PJSIP fields
            const pjsipFields = [
                { keyword: 'account', data: member.extension },
                { keyword: 'callerid', data: `${member.name} (AI) <${member.extension}>` },
                { keyword: 'context', data: 'from-internal' },
                { keyword: 'dial', data: `PJSIP/${member.extension}` },
                { keyword: 'mailbox', data: `${member.extension}@device` },
                { keyword: 'secret', data: 'GeminiPhone123!' },
                { keyword: 'sipdriver', data: 'chan_pjsip' },
                { keyword: 'transport', data: 'udp' },
                { keyword: 'dtmfmode', data: 'rfc4733' },
                { keyword: 'direct_media', data: 'yes' },
                { keyword: 'rtp_symmetric', data: 'yes' },
                { keyword: 'force_rport', data: 'yes' },
                { keyword: 'rewrite_contact', data: 'yes' },
                { keyword: 'max_contacts', data: '1' },
                { keyword: 'qualifyfreq', data: '60' }
            ];

            for (const field of pjsipFields) {
                await executeMySQLQuery(
                    pool,
                    'INSERT INTO sip (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
                    [member.extension, field.keyword, field.data]
                );
            }

            results.created++;
        }

        progressCallback({
            step: 'extensions',
            status: 'success',
            message: `Extensions provisioned: ${results.created} created, ${results.skipped} skipped`
        });

        return { success: true, results };
    } catch (error) {
        progressCallback({ step: 'extensions', status: 'error', message: error.message });
        return { success: false, error: error.message, results };
    }
}

/**
 * Provision IVR system
 * @param {object} config - Configuration
 * @param {object} pool - MySQL connection pool
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<object>} Provisioning result
 */
export async function provisionIVR(config, pool, progressCallback = () => { }) {
    progressCallback({ step: 'ivr', status: 'running', message: 'Provisioning IVR system...' });

    try {
        // Create main IVR (7000)
        const ivrId = '7000';
        const ivrName = 'Nebuchadnezzar Main Menu';

        // Check if IVR exists
        const checkResult = await executeMySQLQuery(
            pool,
            'SELECT COUNT(*) as count FROM ivr_details WHERE ivr_id = ?',
            [ivrId]
        );

        if (checkResult.success && checkResult.rows[0].count > 0) {
            progressCallback({ step: 'ivr', status: 'success', message: 'IVR already exists' });
            return { success: true, skipped: true };
        }

        // Create IVR entries
        await executeMySQLQuery(
            pool,
            `INSERT INTO ivr_entries (ivr_id, name, description, timeout, invalid_loops, invalid_retry_recording, 
        invalid_destination, timeout_time, timeout_recording, timeout_destination) 
       VALUES (?, ?, ?, 10, 3, '', 'ext-local,9000,1', 10, '', 'ext-local,9000,1')`,
            [ivrId, ivrName, 'Main IVR for Nebuchadnezzar crew']
        );

        // Create IVR options
        const crew = config.crew || DEFAULT_CREW;
        for (let i = 0; i < Math.min(crew.length, 9); i++) {
            const member = crew[i];
            const digit = i === 0 ? '0' : String(i);

            await executeMySQLQuery(
                pool,
                'INSERT INTO ivr_details (ivr_id, selection, dest, ivr_ret) VALUES (?, ?, ?, 0)',
                [ivrId, digit, `ext-local,${member.extension},1`]
            );
        }

        progressCallback({ step: 'ivr', status: 'success', message: 'IVR system provisioned' });
        return { success: true };
    } catch (error) {
        progressCallback({ step: 'ivr', status: 'error', message: error.message });
        return { success: false, error: error.message };
    }
}

/**
 * Provision SIP trunk
 * @param {object} config - Configuration
 * @param {object} pool - MySQL connection pool
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<object>} Provisioning result
 */
export async function provisionTrunk(config, pool, progressCallback = () => { }) {
    progressCallback({ step: 'trunk', status: 'running', message: 'Provisioning SIP trunk...' });

    const decrypted = decryptConfig(config);
    const trunk = decrypted.sipTrunk;

    if (!trunk || !trunk.number || !trunk.password) {
        return { success: false, error: 'SIP trunk configuration missing' };
    }

    const trunkId = 'outsideworld';

    try {
        // Create PJSIP endpoint
        await executeMySQLQuery(
            pool,
            `INSERT INTO ps_endpoints (id, transport, aors, auth, outbound_auth, context, disallow, allow, from_user, from_domain)
       VALUES (?, 'transport-udp', ?, ?, ?, 'from-pstn', 'all', 'ulaw,alaw', ?, ?)
       ON DUPLICATE KEY UPDATE from_user = VALUES(from_user), from_domain = VALUES(from_domain)`,
            [trunkId, trunkId, trunkId, trunkId, trunk.username, trunk.server || 'voice.redspot.dk']
        );

        // Create AOR
        await executeMySQLQuery(
            pool,
            `INSERT INTO ps_aors (id, contact, qualify_frequency)
       VALUES (?, ?, 60)
       ON DUPLICATE KEY UPDATE contact = VALUES(contact)`,
            [trunkId, `sip:${trunk.server || 'voice.redspot.dk'}:${trunk.port || 5060}`]
        );

        // Create Auth
        await executeMySQLQuery(
            pool,
            `INSERT INTO ps_auths (id, auth_type, username, password)
       VALUES (?, 'userpass', ?, ?)
       ON DUPLICATE KEY UPDATE username = VALUES(username), password = VALUES(password)`,
            [trunkId, trunk.username, trunk.password]
        );

        // Create Registration
        await executeMySQLQuery(
            pool,
            `INSERT INTO ps_registrations (id, server_uri, client_uri, auth_rejection_permanent, outbound_auth)
       VALUES (?, ?, ?, 'yes', ?)
       ON DUPLICATE KEY UPDATE server_uri = VALUES(server_uri), client_uri = VALUES(client_uri)`,
            [
                trunkId,
                `sip:${trunk.server || 'voice.redspot.dk'}:${trunk.port || 5060}`,
                `sip:${trunk.username}@${trunk.server || 'voice.redspot.dk'}`,
                trunkId
            ]
        );

        // Create inbound route to IVR
        await executeMySQLQuery(
            pool,
            `INSERT INTO incoming (cidnum, extension, destination, mohclass)
       VALUES ('', '${trunk.number}', 'ivr,7000,1', 'default')
       ON DUPLICATE KEY UPDATE destination = VALUES(destination)`,
            []
        );

        progressCallback({ step: 'trunk', status: 'success', message: 'SIP trunk provisioned' });
        return { success: true };
    } catch (error) {
        progressCallback({ step: 'trunk', status: 'error', message: error.message });
        return { success: false, error: error.message };
    }
}

/**
 * Verify provisioning
 * @param {object} config - Configuration
 * @param {object} pool - MySQL connection pool
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<object>} Verification result
 */
export async function verifyProvisioning(config, pool, progressCallback = () => { }) {
    progressCallback({ step: 'verify', status: 'running', message: 'Verifying provisioning...' });

    const checks = {
        extensions: false,
        ivr: false,
        trunk: false
    };

    try {
        // Check extensions
        const extResult = await executeMySQLQuery(
            pool,
            'SELECT COUNT(*) as count FROM sip WHERE id >= 9000 AND id <= 9008'
        );
        checks.extensions = extResult.success && extResult.rows[0].count >= 9;

        // Check IVR
        const ivrResult = await executeMySQLQuery(
            pool,
            'SELECT COUNT(*) as count FROM ivr_details WHERE ivr_id = 7000'
        );
        checks.ivr = ivrResult.success && ivrResult.rows[0].count > 0;

        // Check trunk
        const trunkResult = await executeMySQLQuery(
            pool,
            'SELECT COUNT(*) as count FROM ps_endpoints WHERE id = ?',
            ['outsideworld']
        );
        checks.trunk = trunkResult.success && trunkResult.rows[0].count > 0;

        const allSuccess = checks.extensions && checks.ivr && checks.trunk;

        progressCallback({
            step: 'verify',
            status: allSuccess ? 'success' : 'warning',
            message: allSuccess ? 'Provisioning verified' : 'Some checks failed',
            details: checks
        });

        return { success: allSuccess, checks };
    } catch (error) {
        progressCallback({ step: 'verify', status: 'error', message: error.message });
        return { success: false, error: error.message };
    }
}

/**
 * Main provisioning orchestrator
 * @param {object} config - Complete configuration
 * @param {object} options - Provisioning options
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<object>} Provisioning result
 */
export async function provisionFreePBX(config, options = {}, progressCallback = () => { }) {
    const results = {
        validate: null,
        infrastructure: null,
        extensions: null,
        ivr: null,
        trunk: null,
        verify: null
    };

    let pool = null;
    let connectionConfig = null;

    try {
        // Step 1: Validate connection
        const validateResult = await validateConnection(config, progressCallback);
        results.validate = validateResult;

        if (!validateResult.success) {
            throw new Error('Connection validation failed');
        }

        connectionConfig = validateResult.connectionConfig;

        // Create MySQL pool
        pool = await createMySQLPool(connectionConfig.mysql);

        // Step 2: Provision infrastructure
        if (!options.skipInfrastructure) {
            results.infrastructure = await provisionInfrastructure(config, connectionConfig, progressCallback);
        }

        // Step 3: Provision extensions
        if (!options.skipExtensions) {
            results.extensions = await provisionExtensions(config, pool, progressCallback);
        }

        // Step 4: Provision IVR
        if (!options.skipIVR) {
            results.ivr = await provisionIVR(config, pool, progressCallback);
        }

        // Step 5: Provision trunk
        if (!options.skipTrunk) {
            results.trunk = await provisionTrunk(config, pool, progressCallback);
        }

        // Step 6: Reload FreePBX
        progressCallback({ step: 'reload', status: 'running', message: 'Reloading FreePBX...' });
        await reloadFreePBX(connectionConfig.ssh);
        progressCallback({ step: 'reload', status: 'success', message: 'FreePBX reloaded' });

        // Step 7: Verify
        results.verify = await verifyProvisioning(config, pool, progressCallback);

        const allSuccess = Object.values(results).every(r => r === null || r.success);

        return {
            success: allSuccess,
            results
        };
    } catch (error) {
        progressCallback({ step: 'error', status: 'error', message: error.message });
        return {
            success: false,
            error: error.message,
            results
        };
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}
