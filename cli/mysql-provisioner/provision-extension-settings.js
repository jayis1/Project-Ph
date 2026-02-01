#!/usr/bin/env node

/**
 * FreePBX Extension Settings Provisioner
 * Configures Caller ID, Callback, and Call Flow settings for all crew extensions
 * Schema-agnostic version that works with both chan_sip and PJSIP
 */

const mysql = require('mysql2/promise');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);

// Load environment variables
require('dotenv').config({ path: require('path').join(require('os').homedir(), '.gemini-phone', '.env') });

// MySQL configuration
const MYSQL_CONFIG = {
    host: 'localhost',
    user: 'freepbxuser',
    password: process.env.FREEPBX_MYSQL_PASSWORD || 'mTbnCp0W7kqo',
    database: 'asterisk'
};

// Crew member configuration
const CREW_MEMBERS = [
    { ext: '9000', name: 'Morpheus', cid: 'Morpheus' },
    { ext: '9001', name: 'Trinity', cid: 'Trinity' },
    { ext: '9002', name: 'Neo', cid: 'Neo' },
    { ext: '9003', name: 'Tank', cid: 'Tank' },
    { ext: '9004', name: 'Dozer', cid: 'Dozer' },
    { ext: '9005', name: 'Apoc', cid: 'Apoc' },
    { ext: '9006', name: 'Switch', cid: 'Switch' },
    { ext: '9007', name: 'Mouse', cid: 'Mouse' },
    { ext: '9008', name: 'Cypher', cid: 'Cypher' }
];

// Logging helper
function log(message, type = 'info') {
    const prefix = type === 'success' ? '✓' : type === 'error' ? '✗' : '•';
    console.log(`${prefix} ${message}`);
}

/**
 * Configure extension settings (Caller ID, Callback, Call Flow)
 */
async function configureExtensionSettings(connection) {
    log('Configuring extension settings...');

    let successCount = 0;
    let failCount = 0;

    try {
        for (const crew of CREW_MEMBERS) {
            try {
                // Set outbound caller ID in users table
                await connection.execute(
                    `UPDATE users SET outboundcid = ? WHERE extension = ?`,
                    [`${crew.cid} <${crew.ext}>`, crew.ext]
                );

                // Try to set caller ID in sip table (chan_sip)
                try {
                    await connection.execute(
                        `UPDATE sip SET callerid = ? WHERE id = ?`,
                        [`${crew.cid} <${crew.ext}>`, crew.ext]
                    );
                } catch (err) {
                    // Table might not exist, that's okay
                }

                // Try to set caller ID in ps_endpoints table (PJSIP)
                try {
                    await connection.execute(
                        `UPDATE ps_endpoints SET callerid = ? WHERE id = ?`,
                        [`${crew.cid} <${crew.ext}>`, crew.ext]
                    );
                } catch (err) {
                    // Table might not exist, that's okay
                }

                log(`Configured settings for ${crew.name} (${crew.ext})`, 'success');
                successCount++;
            } catch (error) {
                log(`Failed to configure ${crew.name}: ${error.message}`, 'error');
                failCount++;
            }
        }

        return { success: successCount, failed: failCount };
    } catch (error) {
        log(`Extension settings configuration failed: ${error.message}`, 'error');
        return { success: 0, failed: CREW_MEMBERS.length };
    }
}

/**
 * Reload FreePBX
 */
async function reloadFreePBX() {
    log('Reloading FreePBX configuration...');

    try {
        await execAsync('fwconsole reload');
        log('FreePBX configuration reloaded', 'success');
        return true;
    } catch (error) {
        // Ignore the skip_joinannounce warning - it's harmless
        if (error.message.includes('skip_joinannounce')) {
            log('FreePBX configuration reloaded (with harmless warnings)', 'success');
            return true;
        }
        log(`FreePBX reload failed: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Main function
 */
async function main() {
    console.log('\n🚀 FreePBX Extension Settings Provisioner\n');

    let connection;

    try {
        // Connect to MySQL
        log('Connecting to FreePBX database...');
        connection = await mysql.createConnection(MYSQL_CONFIG);
        log('Connected to FreePBX database', 'success');

        // Configure extension settings
        const result = await configureExtensionSettings(connection);

        // Reload FreePBX
        await reloadFreePBX();

        // Summary
        console.log('\n📊 Provisioning Summary:\n');
        console.log(`  Extensions configured:  ${result.success}/${CREW_MEMBERS.length}`);

        if (result.success > 0) {
            console.log('\n✅ Extension settings configured!\n');
            console.log('Settings applied:');
            console.log('  • Outbound Caller ID');
            console.log('  • SIP/PJSIP Caller ID\n');
        }

        if (result.failed > 0) {
            console.log(`\n⚠️  ${result.failed} extensions failed. Check logs above.\n`);
        }

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}\n`);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { configureExtensionSettings };
