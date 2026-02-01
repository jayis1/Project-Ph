#!/usr/bin/env node

/**
 * FreePBX Call Flow Control Provisioner
 * Configures call flow control (DND, call forwarding) for all crew extensions
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
 * Configure Call Flow Control for all crew extensions
 */
async function configureCallFlowControl(connection) {
    log('Configuring call flow control...');

    try {
        for (const crew of CREW_MEMBERS) {
            // Enable Do Not Disturb (DND) toggle capability
            await connection.execute(
                `UPDATE users SET noanswer = 'enabled' WHERE extension = ?`,
                [crew.ext]
            );

            // Set ring time before going to voicemail (20 seconds)
            await connection.execute(
                `UPDATE users SET ringing = 20 WHERE extension = ?`,
                [crew.ext]
            );

            // Enable call forward settings (disabled by default, but configurable)
            await connection.execute(
                `UPDATE users 
                 SET cfbstate = 'disabled', 
                     cfustate = 'disabled',
                     cfbdest = '',
                     cfudest = ''
                 WHERE extension = ?`,
                [crew.ext]
            );

            log(`Configured call flow control for ${crew.name} (${crew.ext})`, 'success');
        }

        return true;
    } catch (error) {
        log(`Call flow control configuration failed: ${error.message}`, 'error');
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
    console.log('\n🚀 FreePBX Call Flow Control Provisioner\n');

    let connection;

    try {
        // Connect to MySQL
        log('Connecting to FreePBX database...');
        connection = await mysql.createConnection(MYSQL_CONFIG);
        log('Connected to FreePBX database', 'success');

        // Configure Call Flow Control
        const flowResult = await configureCallFlowControl(connection);

        // Reload FreePBX
        await reloadFreePBX();

        // Summary
        console.log('\n📊 Provisioning Summary:\n');
        console.log(`  Call Flow Control:  ${flowResult ? '✓' : '✗'}`);

        if (flowResult) {
            console.log('\n✅ Call flow control configured for all crew members!\n');
            console.log('Settings enabled:');
            console.log('  • Ring time: 20 seconds before voicemail');
            console.log('  • DND capability enabled');
            console.log('  • Call forwarding ready (disabled by default)\n');
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

module.exports = { configureCallFlowControl };
