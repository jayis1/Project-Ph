#!/usr/bin/env node

/**
 * FreePBX IVR Provisioner - Schema-Correct Version
 * Works with actual FreePBX database schema
 */

const mysql = require('mysql2/promise');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Load environment variables
require('dotenv').config({ path: require('path').join(require('os').homedir(), '.gemini-phone', '.env') });

// Configuration from environment
const MYSQL_CONFIG = {
    host: process.env.FREEPBX_MYSQL_HOST || 'localhost',
    port: 3306,
    user: process.env.FREEPBX_MYSQL_USER || 'freepbxuser',
    password: process.env.FREEPBX_MYSQL_PASSWORD || 'mTbnCp0W7kqo',
    database: 'asterisk'
};

// Crew configuration
const CREW = [
    { name: 'Morpheus', extension: '9000' },
    { name: 'Trinity', extension: '9001' },
    { name: 'Neo', extension: '9002' },
    { name: 'Tank', extension: '9003' },
    { name: 'Dozer', extension: '9004' },
    { name: 'Apoc', extension: '9005' },
    { name: 'Switch', extension: '9006' },
    { name: 'Mouse', extension: '9007' },
    { name: 'Cypher', extension: '9008' }
];

function log(message, type = 'info') {
    const prefix = type === 'success' ? '✓' : type === 'error' ? '✗' : '•';
    console.log(`${prefix} ${message}`);
}

/**
 * Create IVR if it doesn't exist
 */
async function createIVR(connection) {
    log('Checking IVR configuration...');

    try {
        // Check if IVR exists
        const [existing] = await connection.execute(
            'SELECT id FROM ivr_details WHERE name = ?',
            ['Nebuchadnezzar']
        );

        let ivrId;

        if (existing.length > 0) {
            ivrId = existing[0].id;
            log(`IVR already exists (ID: ${ivrId})`);
        } else {
            // Create IVR
            const [result] = await connection.execute(`
                INSERT INTO ivr_details (
                    name, description, announcement, directdial,
                    invalid_loops, invalid_retry_recording, invalid_destination,
                    timeout_time, timeout_recording, timeout_retry_recording,
                    timeout_destination, timeout_loops, retvm
                ) VALUES (?, ?, 0, 'CHECKED', 3, '', 'app-blackhole,hangup,1',
                         10, '', '', 'app-blackhole,hangup,1', 3, 'CHECKED')
            `, ['Nebuchadnezzar', 'Nebuchadnezzar Crew IVR']);

            ivrId = result.insertId;
            log(`IVR created (ID: ${ivrId})`, 'success');
        }

        // Create IVR entries for each crew member
        const entries = [
            { selection: '0', dest: 'ext-queues,8001,1', description: 'All Crew (Queue)' },
            { selection: '1', dest: 'from-did-direct,9000,1', description: 'Morpheus' },
            { selection: '2', dest: 'from-did-direct,9002,1', description: 'Neo' },
            { selection: '3', dest: 'from-did-direct,9003,1', description: 'Tank' },
            { selection: '4', dest: 'from-did-direct,9004,1', description: 'Dozer' },
            { selection: '5', dest: 'from-did-direct,9005,1', description: 'Apoc' },
            { selection: '6', dest: 'from-did-direct,9006,1', description: 'Switch' },
            { selection: '7', dest: 'from-did-direct,9007,1', description: 'Mouse' },
            { selection: '8', dest: 'from-did-direct,9008,1', description: 'Cypher' }
        ];

        // Delete existing entries
        await connection.execute('DELETE FROM ivr_entries WHERE ivr_id = ?', [ivrId]);

        // Insert new entries
        for (const entry of entries) {
            await connection.execute(
                'INSERT INTO ivr_entries (ivr_id, selection, dest, ivr_ret) VALUES (?, ?, ?, 0)',
                [ivrId, entry.selection, entry.dest]
            );
        }

        log(`IVR configured with ${entries.length} options`, 'success');
        return { success: true, ivrId };
    } catch (error) {
        log(`IVR creation failed: ${error.message}`, 'error');
        return { success: false };
    }
}

/**
 * Create Queue
 */
async function createQueue(connection) {
    log('Provisioning crew queue...');

    try {
        // Check if queue exists
        const [existing] = await connection.execute(
            'SELECT extension FROM queues_config WHERE extension = ?',
            ['8001']
        );

        if (existing.length > 0) {
            log('Queue 8001 already exists, updating...');

            // Update queue
            await connection.execute(`
                UPDATE queues_config SET
                    descr = ?,
                    maxwait = ?,
                    queuewait = 1
                WHERE extension = ?
            `, ['Crew Queue', '300', '8001']);

        } else {
            // Create queue
            await connection.execute(`
                INSERT INTO queues_config (
                    extension, descr, grppre, alertinfo, ringing, maxwait,
                    password, ivr_id, dest, cwignore, queuewait, use_queue_context,
                    togglehint, qnoanswer, callconfirm, callback_id, joinannounce_id
                ) VALUES (?, ?, '', '', 0, '300', '', '0', '', 0, 1, 0, 0, 0, 0, '', NULL)
            `, ['8001', 'Crew Queue']);

            log('Queue 8001 created', 'success');
        }

        // Delete existing queue details
        await connection.execute('DELETE FROM queues_details WHERE id = ?', ['8001']);

        // Add queue details
        const queueDetails = [
            ['strategy', 'ringall'],
            ['timeout', '15'],
            ['retry', '5'],
            ['weight', '0'],
            ['autofill', 'yes'],
            ['autopause', 'no'],
            ['maxlen', '0'],
            ['servicelevel', '60'],
            ['announce-position', 'yes']
        ];

        for (const [keyword, data] of queueDetails) {
            await connection.execute(
                'INSERT INTO queues_details (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
                ['8001', keyword, data]
            );
        }

        // Add crew members to queues_details table
        for (const crew of CREW) {
            await connection.execute(
                'INSERT INTO queues_details (id, keyword, data, flags) VALUES (?, ?, ?, 2)',
                ['8001', 'member', `Local/${crew.extension}@from-queue/n`]
            );
        }

        log(`Queue 8001 configured with ${CREW.length} agents`, 'success');
        return true;
    } catch (error) {
        log(`Queue creation failed: ${error.message}`, 'error');
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
    console.log('\n🚀 FreePBX IVR Provisioner (Schema-Correct)\n');

    let connection;

    try {
        // Connect to MySQL
        log('Connecting to FreePBX database...');
        connection = await mysql.createConnection(MYSQL_CONFIG);
        log('Connected to FreePBX database', 'success');

        // Run provisioning steps
        const ivrResult = await createIVR(connection);
        const queueResult = await createQueue(connection);

        // Reload FreePBX
        await reloadFreePBX();

        // Summary
        console.log('\n📊 Provisioning Summary:\n');
        console.log(`  IVR Menu:        ${ivrResult.success ? '✓' : '✗'}`);
        console.log(`  Queue (8001):    ${queueResult ? '✓' : '✗'}`);

        const successCount = (ivrResult.success ? 1 : 0) + (queueResult ? 1 : 0);
        const totalCount = 2;

        console.log(`\n✅ ${successCount}/${totalCount} items provisioned successfully!\n`);

        if (successCount === totalCount) {
            console.log('🎉 IVR and Queue are now configured!\n');
            console.log('Next steps:');
            console.log('  1. Configure Inbound Route to point to IVR');
            console.log(`     Destination: IVR: Nebuchadnezzar (ID: ${ivrResult.ivrId})`);
            console.log('  2. Call your main number');
            console.log('  3. Press 0 to reach all crew members');
            console.log('  4. Press 1-8 for individual crew members\n');
        }

    } catch (error) {
        console.error(`\n✗ Provisioning failed: ${error.message}\n`);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

main().catch(console.error);
