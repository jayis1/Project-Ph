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

// Default device configuration
const DEFAULT_DEVICE = [
    { name: 'gemini-phone', extension: '9001', voiceId: 'EXAVITQu4vr4xnSDxMaL' }
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
    progressCallback({ step: 'extensions', status: 'running', message: 'Provisioning device...' });

    // Use devices config if available, otherwise fallback to DEFAULT_DEVICE
    // In gemini-phone, config.devices is an array, often with one object.
    const devices = (config.devices && config.devices.length > 0) ? config.devices : DEFAULT_DEVICE;
    const results = { created: 0, skipped: 0, failed: 0 };

    try {
        for (const member of devices) {
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
                { keyword: 'transport', data: '0.0.0.0-udp' },
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

// Removed multi-level IVR system.

/**
 * Provision SIP Trunk
 * @param {object} config - Configuration
 * @param {object} pool - MySQL connection pool
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<object>} Provisioning result
 */
async function provisionTrunks(config, pool, progressCallback = () => { }) {
    progressCallback({ step: 'trunk', status: 'running', message: 'Provisioning SIP Trunk...' });

    // Use decrypted credentials or CLI args for the trunk IP
    // The install-freepbx.sh hot-wires this into the config object as 'gatewayIp'
    // or we look for it in decrypted.freepbx.gatewayIp
    const decrypted = decryptConfig(config);
    const gatewayIp = config.gatewayIp || decrypted.freepbx.gatewayIp;

    if (!gatewayIp) {
        progressCallback({ step: 'trunk', status: 'warning', message: 'Skipping trunk: No Gateway IP provided' });
        return { success: true, skipped: true };
    }

    try {
        // Check if trunk exists
        const checkResult = await executeMySQLQuery(
            pool,
            'SELECT COUNT(*) as count FROM pjsip WHERE id = "to_gateway"',
            []
        );

        if (checkResult.success && checkResult.rows[0].count > 0) {
            progressCallback({ step: 'trunk', status: 'success', message: 'Trunk already exists' });
            return { success: true, skipped: true };
        }

        // 1. Create PJSIP Endpoint (to_gateway)
        // Note: Using transport-udp (which we assume exists or is 0.0.0.0-udp)
        // We use the same fields as the GUI would create for an IP-based trunk
        const pjsipFields = [
            { keyword: 'account', data: 'to_gateway' },
            { keyword: 'context', data: 'from-pstn' },
            { keyword: 'disallow', data: 'all' },
            { keyword: 'allow', data: 'ulaw,alaw,gsm,g726,g722' },
            { keyword: 'id', data: 'to_gateway' },
            { keyword: 'match', data: gatewayIp },
            { keyword: 'server_uri', data: `sip:${gatewayIp}:5060` },
            { keyword: 'client_uri', data: `sip:${gatewayIp}:5060` },
            { keyword: 'aors', data: 'to_gateway' }, // Links to AOR
            { keyword: 'sipdriver', data: 'chan_pjsip' }, // Critical
            { keyword: 'transport', data: '0.0.0.0-udp' }, // Explicitly use the default transport name
            { keyword: 'direct_media', data: 'no' },
            { keyword: 'force_rport', data: 'yes' },
            { keyword: 'rewrite_contact', data: 'yes' },
            { keyword: 'rtp_symmetric', data: 'yes' },
            { keyword: 'ice_support', data: 'no' }
        ];

        // Insert endpoint
        await executeMySQLQuery(pool, 'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, "endpoint", "to_gateway", 24)', ['to_gateway']);

        for (const field of pjsipFields) {
            // Some keywords are for AOR, some for Endpoint, some for Identify. PJSIP wizard splits them.
            // However, inserting into 'pjsip' table with correct ID usually works as a raw dump.
            // Let's use the standard fields.
            await executeMySQLQuery(
                pool,
                'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
                ['to_gateway', field.keyword, field.data]
            );
        }

        // 2. Create Identify (to match incoming IP)
        // Important: Identify maps IP -> Endpoint
        await executeMySQLQuery(pool, 'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, "identify", "to_gateway", 24)', ['to_gateway']);
        await executeMySQLQuery(pool, 'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, "match", ?, 0)', ['to_gateway', gatewayIp]);

        // 3. Create AOR (Address of Record)
        await executeMySQLQuery(pool, 'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, "aor", "to_gateway", 24)', ['to_gateway']);
        await executeMySQLQuery(pool, 'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, "contact", ?, 0)', ['to_gateway', `sip:${gatewayIp}:5060`]);

        // 4. Create Registration (None for IP peering)
        // (Skipped)

        // 5. Create Inbound Route (ANY -> Extension)
        // Dest format for extension: ext-local,<EXT>,1
        const ext = (config.devices && config.devices.length > 0) ? config.devices[0].extension : '9001';
        await executeMySQLQuery(
            pool,
            `INSERT INTO incoming (cidnum, extension, destination, description, pmmaxretries, pmminlength) VALUES ('', '', 'ext-local,${ext},1', 'To_Device', '', '')`
        );

        progressCallback({ step: 'trunk', status: 'success', message: 'Trunk and Inbound Route provisioned' });
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
export async function verifyProvisioning(config, pool, options = {}, progressCallback = () => { }) {
    progressCallback({ step: 'verify', status: 'running', message: 'Verifying provisioning...' });

    const checks = {
        extensions: false,
        ivr: false,
        trunk: true // Default true, set to false if skipped
    };

    try {
        // Check extensions count (at least 1)
        const extResult = await executeMySQLQuery(
            pool,
            'SELECT COUNT(*) as count FROM users'
        );
        checks.extensions = extResult.success && extResult.rows[0].count >= 1;

        // Trunk checking
        if (options.skipTrunks) {
            checks.trunk = true; // Skip check
        } else {
            const trunkResult = await executeMySQLQuery(
                pool,
                'SELECT COUNT(*) as count FROM pjsip WHERE id = ? LIMIT 1',
                ['outsideworld']
            );
            checks.trunk = trunkResult.success && trunkResult.rows[0].count > 0;
        }

        const allSuccess = checks.extensions && checks.trunk;

        progressCallback({
            step: 'verify',
            status: allSuccess ? 'success' : 'warning',
            message: allSuccess ? 'Provisioning verified' : 'Some checks failed',
            details: checks
        });

        if (!allSuccess) {
            return {
                success: false,
                error: `Verification failed: Extensions=${checks.extensions}, Trunk=${checks.trunk}`,
                checks
            };
        }

        return { success: true, checks };
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

        // Step 4: Removed IVR step.

        // Step 5: Provision Trunk (Optional)
        if (!options.skipTrunks) {
            results.trunk = await provisionTrunks(config, pool, progressCallback);
        }


        // Step 5: Reload FreePBX
        progressCallback({ step: 'reload', status: 'running', message: 'Reloading FreePBX...' });
        await reloadFreePBX(connectionConfig.ssh);
        progressCallback({ step: 'reload', status: 'success', message: 'FreePBX reloaded' });

        // Step 6: Verify
        results.verify = await verifyProvisioning(config, pool, options, progressCallback);

        const allSuccess = Object.values(results).every(r => r === null || r.success);

        // Populate global error if verify failed without throwing
        let errorMsg = null;
        if (!allSuccess && results.verify && !results.verify.success) {
            errorMsg = results.verify.error || 'Verification failed';
        }

        return {
            success: allSuccess,
            error: errorMsg,
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
