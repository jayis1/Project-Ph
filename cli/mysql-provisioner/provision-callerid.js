#!/usr/bin/env node

/**
 * FreePBX Caller ID Provisioner
 * Configures Caller ID settings for all crew extensions
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
 * Configure Caller ID for all crew extensions
 */
async function configureCallerID(connection) {
    log('Configuring Caller ID settings...');

    try {
        for (const crew of CREW_MEMBERS) {
            // Update outbound CID in users table
            await connection.execute(
                `UPDATE users SET outboundcid = ? WHERE extension = ?`,
                [`${crew.cid} <${crew.ext}>`, crew.ext]
            );

            // Update display name in sip table (for PJSIP)
            await connection.execute(
                `UPDATE ps_endpoints SET callerid = ? WHERE id = ?`,
                [`${crew.cid} <${crew.ext}>`, crew.ext]
            );

            log(`Configured Caller ID for ${crew.name} (${crew.ext})`, 'success');
        }

        return true;
    } catch (error) {
        log(`Caller ID configuration failed: ${error.message}`, 'error');
        return false;
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
        log(`FreePBX reload failed: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Main function
 */
async function main() {
    console.log('\n🚀 FreePBX Caller ID Provisioner\n');

    let connection;

    try {
        // Connect to MySQL
        log('Connecting to FreePBX database...');
        connection = await mysql.createConnection(MYSQL_CONFIG);
        log('Connected to FreePBX database', 'success');

        // Configure Caller ID
        const cidResult = await configureCallerID(connection);

        // Reload FreePBX
        await reloadFreePBX();

        // Summary
        console.log('\n📊 Provisioning Summary:\n');
        console.log(`  Caller ID:       ${cidResult ? '✓' : '✗'}`);

        if (cidResult) {
            console.log('\n✅ Caller ID configured for all crew members!\n');
        } else {
            console.log('\n⚠️  Some items failed. Check logs above.\n');
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

module.exports = { configureCallerID };
