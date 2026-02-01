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


            // Check if extension exists (in PJSIP table)
            const checkResult = await executeMySQLQuery(
                pool,
                'SELECT COUNT(*) as count FROM pjsip WHERE id = ?',
                [member.extension]
            );

            if (checkResult.success && checkResult.rows[0].count > 0) {
                results.skipped++;
                continue;
            }

            // Create user entry
            await executeMySQLQuery(
                pool,
                `INSERT INTO users (extension, name, outboundcid, sipname, noanswer_cid, busy_cid, chanunavail_cid, noanswer_dest, busy_dest, chanunavail_dest) 
                 VALUES (?, ?, ?, ?, '', '', '', '', '', '')`,
                [member.extension, member.name, `${member.name} <${member.extension}>`, member.extension]
            );

            // Create device entry (using PJSIP)
            await executeMySQLQuery(
                pool,
                `INSERT INTO devices (id, tech, dial, devicetype, user, description) 
                 VALUES (?, 'pjsip', ?, 'fixed', ?, ?)`,
                [member.extension, `PJSIP/${member.extension}`, member.extension, member.name]
            );

            // Create PJSIP extension entries in pjsip table
            const pjsipFields = [
                { keyword: 'account', data: member.extension },
                { keyword: 'callerid', data: `${member.name} (AI) <${member.extension}>` },
                { keyword: 'context', data: 'from-internal' },
                { keyword: 'dial', data: `PJSIP/${member.extension}` },
                { keyword: 'mailbox', data: `${member.extension}@device` },
                { keyword: 'secret', data: 'GeminiPhone123!' },
                { keyword: 'sipdriver', data: 'chan_pjsip' },
                { keyword: 'transport', data: 'transport-udp' },
                { keyword: 'disallow', data: 'all' },
                { keyword: 'allow', data: 'ulaw,alaw' },
                { keyword: 'direct_media', data: 'yes' },
                { keyword: 'rtp_symmetric', data: 'yes' },
                { keyword: 'force_rport', data: 'yes' },
                { keyword: 'rewrite_contact', data: 'yes' },
                { keyword: 'max_contacts', data: '1' },
                { keyword: 'qualify_frequency', data: '60' }
            ];

            for (const field of pjsipFields) {
                await executeMySQLQuery(
                    pool,
                    'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
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
        // Create main IVR (ID = 1, standard FreePBX IVR ID)
        const ivrId = 1;
        const ivrName = 'Nebuchadnezzar';

        // Check if IVR exists
        const checkResult = await executeMySQLQuery(
            pool,
            'SELECT COUNT(*) as count FROM ivr_details WHERE id = ?',
            [ivrId]
        );

        if (checkResult.success && checkResult.rows[0].count > 0) {
            progressCallback({ step: 'ivr', status: 'success', message: 'IVR already exists' });
            return { success: true, skipped: true };
        }

        // Create main IVR entry in ivr_details
        await executeMySQLQuery(
            pool,
            `INSERT INTO ivr_details (id, name, description, announcement, directdial, invalid_loops, invalid_retry_recording, 
                invalid_destination, timeout_time, timeout_recording, timeout_destination, retvm) 
             VALUES (?, ?, ?, '', 'CHECKED', 3, '', 'app-blackhole,hangup,1', 10, '', 'app-blackhole,hangup,1', '')`,
            [ivrId, ivrName, 'Main IVR for Nebuchadnezzar crew']
        );

        // Create IVR digit mappings in ivr_entries
        const crew = config.crew || DEFAULT_CREW;

        // Map digit 0 to extension 9000 (Morpheus)
        await executeMySQLQuery(
            pool,
            'INSERT INTO ivr_entries (ivr_id, selection, dest, ivr_ret) VALUES (?, ?, ?, 0)',
            [ivrId, '0', `ext-local,9000,1`]
        );

        // Map digits 1-8 to extensions 9001-9008
        for (let i = 1; i < Math.min(crew.length, 9); i++) {
            const member = crew[i];
            const digit = String(i);

            await executeMySQLQuery(
                pool,
                'INSERT INTO ivr_entries (ivr_id, selection, dest, ivr_ret) VALUES (?, ?, ?, 0)',
                [ivrId, digit, `ext-local,${member.extension},1`]
            );
        }

        // Add option 9 to hangup
        await executeMySQLQuery(
            pool,
            'INSERT INTO ivr_entries (ivr_id, selection, dest, ivr_ret) VALUES (?, ?, ?, 0)',
            [ivrId, '9', 'app-blackhole,hangup,1']
        );

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
        // Store trunk number and server in sip table for provisioner service
        await executeMySQLQuery(
            pool,
            `INSERT INTO sip (id, keyword, data, flags) VALUES (?, 'trunknum', ?, 0)
             ON DUPLICATE KEY UPDATE data = VALUES(data)`,
            [trunkId, trunk.number]
        );

        await executeMySQLQuery(
            pool,
            `INSERT INTO sip (id, keyword, data, flags) VALUES (?, 'trunkserver', ?, 0)
             ON DUPLICATE KEY UPDATE data = VALUES(data)`,
            [trunkId, trunk.server || 'voice.redspot.dk']
        );

        // Create trunk PJSIP configuration in pjsip table
        const trunkPjsipFields = [
            { keyword: 'type', data: 'endpoint' },
            { keyword: 'transport', data: 'transport-udp' },
            { keyword: 'aors', data: trunkId },
            { keyword: 'auth', data: trunkId },
            { keyword: 'outbound_auth', data: trunkId },
            { keyword: 'context', data: 'from-pstn' },
            { keyword: 'disallow', data: 'all' },
            { keyword: 'allow', data: 'ulaw,alaw' },
            { keyword: 'from_user', data: trunk.username },
            { keyword: 'from_domain', data: trunk.server || 'voice.redspot.dk' },
            { keyword: 'contact', data: `sip:${trunk.server || 'voice.redspot.dk'}:${trunk.port || 5060}` },
            { keyword: 'auth_type', data: 'userpass' },
            { keyword: 'username', data: trunk.username },
            { keyword: 'password', data: trunk.password }
        ];

        for (const field of trunkPjsipFields) {
            await executeMySQLQuery(
                pool,
                `INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, ?, ?, 0)
                 ON DUPLICATE KEY UPDATE data = VALUES(data)`,
                [trunkId, field.keyword, field.data]
            );
        }

        // Create inbound route to IVR (using IVR ID 1)
        await executeMySQLQuery(
            pool,
            `INSERT INTO incoming (cidnum, extension, destination, mohclass)
       VALUES ('', '${trunk.number}', 'ivr,1,1', 'default')
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
