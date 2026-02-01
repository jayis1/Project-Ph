#!/usr/bin/env node

/**
 * FreePBX Callback Provisioner
 * Configures callback settings for all crew extensions
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
    { ext: '9000', name: 'Morpheus' },
    { ext: '9001', name: 'Trinity' },
    { ext: '9002', name: 'Neo' },
    { ext: '9003', name: 'Tank' },
    { ext: '9004', name: 'Dozer' },
    { ext: '9005', name: 'Apoc' },
    { ext: '9006', name: 'Switch' },
    { ext: '9007', name: 'Mouse' },
    { ext: '9008', name: 'Cypher' }
];

// Logging helper
function log(message, type = 'info') {
    const prefix = type === 'success' ? '✓' : type === 'error' ? '✗' : '•';
    console.log(`${prefix} ${message}`);
}

/**
 * Configure Callback for all crew extensions
 */
async function configureCallback(connection) {
    log('Configuring callback settings...');

    try {
        for (const crew of CREW_MEMBERS) {
            // Enable call waiting (allows callbacks while on a call)
            await connection.execute(
                `UPDATE users SET callwaiting = 'ENABLED' WHERE extension = ?`,
                [crew.ext]
            );

            // Enable call forward on busy to voicemail (so callbacks can leave messages)
            await connection.execute(
                `UPDATE users SET cfbstate = 'enabled', cfbdest = ? WHERE extension = ?`,
                [`ext-local,${crew.ext},dest-VMAIL`, crew.ext]
            );

            // Enable call forward on unavailable to voicemail
            await connection.execute(
                `UPDATE users SET cfustate = 'enabled', cfudest = ? WHERE extension = ?`,
                [`ext-local,${crew.ext},dest-VMAIL`, crew.ext]
            );

            log(`Configured callback for ${crew.name} (${crew.ext})`, 'success');
        }

        return true;
    } catch (error) {
        log(`Callback configuration failed: ${error.message}`, 'error');
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
    console.log('\n🚀 FreePBX Callback Provisioner\n');

    let connection;

    try {
        // Connect to MySQL
        log('Connecting to FreePBX database...');
        connection = await mysql.createConnection(MYSQL_CONFIG);
        log('Connected to FreePBX database', 'success');

        // Configure Callback
        const callbackResult = await configureCallback(connection);

        // Reload FreePBX
        await reloadFreePBX();

        // Summary
        console.log('\n📊 Provisioning Summary:\n');
        console.log(`  Callback:        ${callbackResult ? '✓' : '✗'}`);

        if (callbackResult) {
            console.log('\n✅ Callback configured for all crew members!\n');
            console.log('Settings enabled:');
            console.log('  • Call waiting enabled');
            console.log('  • Call forward on busy → Voicemail');
            console.log('  • Call forward on unavailable → Voicemail\n');
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

module.exports = { configureCallback };
