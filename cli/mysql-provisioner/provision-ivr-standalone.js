#!/usr/bin/env node

/**
 * FreePBX Enhanced IVR Provisioner (Standalone - CommonJS)
 * Run this directly on the FreePBX server
 * No dependencies on gemini-phone CLI
 */

const mysql = require('mysql2/promise');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const MYSQL_CONFIG = {
    host: 'localhost',
    port: 3306,
    user: 'freepbxuser',
    password: 'mTbnCp0W7kqo',
    database: 'asterisk'
};

// Nebuchadnezzar crew configuration
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

// IVR Enhancement Configuration
const ENHANCEMENTS = {
    queue: {
        id: '8001',
        name: 'Crew Queue',
        strategy: 'ringall',
        timeout: '15',
        retry: '5',
        maxWait: '300',
        joinAnnounce: 'queue-please-wait',
        periodicAnnounce: 'queue-periodic-announce',
        periodicAnnounceFrequency: '30'
    },
    timeCondition: {
        id: '1',
        name: 'Business Hours',
        timeGroupId: '1',
        trueDest: 'ivr,7000,1',
        falseDest: 'app-announcement,1,1'
    },
    timeGroup: {
        id: '1',
        description: 'Business Hours',
        times: [
            '09:00-17:00,mon-fri,*,*'
        ]
    },
    announcements: [
        {
            id: '1',
            description: 'Welcome Message',
            message: 'welcome-nebuchadnezzar',
            postDest: 'ivr,7000,1'
        },
        {
            id: '2',
            description: 'After Hours',
            message: 'after-hours',
            postDest: 'ext-local,9000,1'
        }
    ],
    callFlowToggle: {
        featureCode: '*2834',
        description: 'Crew Availability Toggle',
        normalDest: 'ivr,7000,1',
        overrideDest: 'app-announcement,2,1'
    }
};

function log(message, type = 'info') {
    const prefix = type === 'success' ? '✓' : type === 'error' ? '✗' : '•';
    console.log(`${prefix} ${message}`);
}

/**
 * Provision Queue
 */
async function provisionQueue(connection) {
    log('Provisioning crew queue...');

    try {
        const { queue } = ENHANCEMENTS;

        // Check if queue exists
        const [existing] = await connection.execute(
            'SELECT extension FROM queues_config WHERE extension = ?',
            [queue.id]
        );

        if (existing.length > 0) {
            log(`Queue ${queue.id} already exists, updating...`);

            // Update existing queue
            await connection.execute(`
                UPDATE queues_config SET
                    descr = ?,
                    grppre = ?,
                    maxwait = ?,
                    joinannounce_id = ?
                WHERE extension = ?
            `, [queue.name, '', queue.maxWait, queue.joinAnnounce, queue.id]);

        } else {
            // Insert new queue
            await connection.execute(`
                INSERT INTO queues_config (
                    extension, descr, grppre, maxwait, joinannounce_id,
                    queuewait, use_queue_context
                ) VALUES (?, ?, '', ?, ?, 'YES', 0)
            `, [queue.id, queue.name, queue.maxWait, queue.joinAnnounce]);
        }

        // Add queue details
        await connection.execute('DELETE FROM queues_details WHERE id = ?', [queue.id]);

        const queueDetails = [
            ['strategy', queue.strategy],
            ['timeout', queue.timeout],
            ['retry', queue.retry],
            ['weight', '0'],
            ['autofill', 'yes'],
            ['autopause', 'no'],
            ['maxlen', '0'],
            ['servicelevel', '60'],
            ['periodic-announce-frequency', queue.periodicAnnounceFrequency],
            ['announce-position', 'yes']
        ];

        for (const [keyword, data] of queueDetails) {
            await connection.execute(
                'INSERT INTO queues_details (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
                [queue.id, keyword, data]
            );
        }

        // Add all crew members as static agents
        for (const crew of CREW) {
            await connection.execute(`
                INSERT IGNORE INTO queues_config (extension, descr, member)
                VALUES (?, ?, ?)
            `, [queue.id, queue.name, `Local/${crew.extension}@from-queue/n`]);
        }

        log(`Queue ${queue.id} provisioned with ${CREW.length} agents`, 'success');
        return true;
    } catch (error) {
        log(`Queue provisioning failed: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Provision Time Conditions
 */
async function provisionTimeConditions(connection) {
    log('Provisioning time conditions...');

    try {
        const { timeGroup, timeCondition } = ENHANCEMENTS;

        // Create time group
        await connection.execute('DELETE FROM timegroups_groups WHERE id = ?', [timeGroup.id]);
        await connection.execute(
            'INSERT INTO timegroups_groups (id, description) VALUES (?, ?)',
            [timeGroup.id, timeGroup.description]
        );

        // Add time entries
        await connection.execute('DELETE FROM timegroups_details WHERE timegroupid = ?', [timeGroup.id]);
        for (const time of timeGroup.times) {
            await connection.execute(
                'INSERT INTO timegroups_details (timegroupid, time) VALUES (?, ?)',
                [timeGroup.id, time]
            );
        }

        // Create time condition
        await connection.execute('DELETE FROM timeconditions WHERE timeconditions_id = ?', [timeCondition.id]);
        await connection.execute(`
            INSERT INTO timeconditions (
                timeconditions_id, displayname, time, truegoto, falsegoto, generate_hint
            ) VALUES (?, ?, ?, ?, ?, 'CHECKED')
        `, [
            timeCondition.id,
            timeCondition.name,
            timeGroup.id,
            timeCondition.trueDest,
            timeCondition.falseDest
        ]);

        log(`Time condition "${timeCondition.name}" provisioned`, 'success');
        return true;
    } catch (error) {
        log(`Time condition provisioning failed: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Provision Announcements
 */
async function provisionAnnouncements(connection) {
    log('Provisioning announcements...');

    try {
        for (const announcement of ENHANCEMENTS.announcements) {
            const [existing] = await connection.execute(
                'SELECT announcement_id FROM announcement WHERE announcement_id = ?',
                [announcement.id]
            );

            if (existing.length > 0) {
                await connection.execute(`
                    UPDATE announcement SET
                        description = ?,
                        recording_id = ?,
                        post_dest = ?,
                        allow_skip = 1
                    WHERE announcement_id = ?
                `, [announcement.description, announcement.message, announcement.postDest, announcement.id]);
            } else {
                await connection.execute(`
                    INSERT INTO announcement (
                        announcement_id, description, recording_id, post_dest, allow_skip
                    ) VALUES (?, ?, ?, ?, 1)
                `, [announcement.id, announcement.description, announcement.message, announcement.postDest]);
            }
        }

        log(`${ENHANCEMENTS.announcements.length} announcements provisioned`, 'success');
        return true;
    } catch (error) {
        log(`Announcement provisioning failed: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Fix Call Flow Toggle
 */
async function fixCallFlowToggle(connection) {
    log('Configuring call flow toggle...');

    try {
        const { callFlowToggle } = ENHANCEMENTS;

        const [existing] = await connection.execute(
            'SELECT * FROM callflow_toggle WHERE feature_code = ?',
            [callFlowToggle.featureCode]
        );

        if (existing.length > 0) {
            await connection.execute(`
                UPDATE callflow_toggle SET
                    description = ?,
                    dest_normal = ?,
                    dest_override = ?
                WHERE feature_code = ?
            `, [callFlowToggle.description, callFlowToggle.normalDest, callFlowToggle.overrideDest, callFlowToggle.featureCode]);
        } else {
            await connection.execute(`
                INSERT INTO callflow_toggle (
                    feature_code, description, dest_normal, dest_override
                ) VALUES (?, ?, ?, ?)
            `, [callFlowToggle.featureCode, callFlowToggle.description, callFlowToggle.normalDest, callFlowToggle.overrideDest]);
        }

        log(`Call flow toggle ${callFlowToggle.featureCode} configured`, 'success');
        return true;
    } catch (error) {
        log(`Call flow toggle fix failed: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Update IVR to use queue instead of ring group
 */
async function updateIVRForQueue(connection) {
    log('Updating IVR menu...');

    try {
        await connection.execute(`
            UPDATE ivr_details
            SET dest = 'ext-queues,8001,1'
            WHERE ivr_id = '7000' AND selection = '0'
        `);

        log('IVR updated to use queue for option 0', 'success');
        return true;
    } catch (error) {
        log(`IVR update failed: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Reload FreePBX configuration
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
 * Main provisioning function
 */
async function main() {
    console.log('\n🚀 FreePBX Enhanced IVR Provisioner\n');

    let connection;

    try {
        // Connect to MySQL
        log('Connecting to FreePBX database...');
        connection = await mysql.createConnection(MYSQL_CONFIG);
        log('Connected to FreePBX database', 'success');

        // Run provisioning steps
        const results = {
            queue: await provisionQueue(connection),
            timeConditions: await provisionTimeConditions(connection),
            announcements: await provisionAnnouncements(connection),
            callFlowToggle: await fixCallFlowToggle(connection),
            ivrUpdate: await updateIVRForQueue(connection)
        };

        // Reload FreePBX
        await reloadFreePBX();

        // Summary
        console.log('\n📊 Provisioning Summary:\n');
        console.log(`  Queue:           ${results.queue ? '✓' : '✗'}`);
        console.log(`  Time Conditions: ${results.timeConditions ? '✓' : '✗'}`);
        console.log(`  Announcements:   ${results.announcements ? '✓' : '✗'}`);
        console.log(`  Call Flow Toggle:${results.callFlowToggle ? '✓' : '✗'}`);
        console.log(`  IVR Update:      ${results.ivrUpdate ? '✓' : '✗'}`);

        const successCount = Object.values(results).filter(r => r).length;
        const totalCount = Object.keys(results).length;

        console.log(`\n✅ ${successCount}/${totalCount} enhancements provisioned successfully!\n`);

        if (successCount === totalCount) {
            console.log('🎉 All IVR enhancements are now active!\n');
            console.log('Next steps:');
            console.log('  1. Record audio files in FreePBX GUI (Admin → System Recordings)');
            console.log('  2. Test by calling your main number and pressing 0');
            console.log('  3. Dial *2834 to toggle crew availability\n');
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

// Run
main().catch(console.error);
