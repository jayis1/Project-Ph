#!/usr/bin/env node

/**
 * FreePBX Enhanced IVR Provisioner
 * Provisions professional IVR features: queues, time conditions, announcements
 * Can use either MySQL or GraphQL API
 */

import mysql from 'mysql2/promise';
import chalk from 'chalk';
import ora from 'ora';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

import { loadConfig } from '../lib/config.js';

// Configuration
async function getMySQLConfig() {
    // Try to load config, but use defaults if not available
    let config;
    try {
        config = await loadConfig();
    } catch (error) {
        config = {};
    }

    return {
        host: config.api?.freepbx?.mysqlHost || 'localhost', // Use localhost when running on FreePBX server
        port: 3306,
        user: config.api?.freepbx?.mysqlUser || 'freepbxuser',
        password: config.api?.freepbx?.mysqlPassword || 'rCK+gZBKfILF',
        database: 'asterisk'
    };
}

const SSH_CONFIG = {
    host: '172.16.1.143',
    user: 'root',
    password: 'Jumbo2601'
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

/**
 * Provision Queue
 */
async function provisionQueue(connection) {
    const spinner = ora('Provisioning crew queue...').start();

    try {
        const { queue } = ENHANCEMENTS;

        // Check if queue exists
        const [existing] = await connection.execute(
            'SELECT extension FROM queues_config WHERE extension = ?',
            [queue.id]
        );

        if (existing.length > 0) {
            spinner.info(`Queue ${queue.id} already exists, updating...`);

            // Update existing queue
            await connection.execute(`
                UPDATE queues_config SET
                    descr = ?,
                    grppre = ?,
                    alertinfo = '',
                    ringing = 0,
                    maxwait = ?,
                    password = '',
                    ivr_id = '',
                    dest = '',
                    cwignore = 'NO',
                    qregex = '',
                    agentannounce_id = '',
                    joinannounce_id = ?,
                    queuewait = 'YES',
                    use_queue_context = 0,
                    togglehint = '',
                    qnoanswer = 'NO',
                    callconfirm = 'disabled',
                    callconfirm_id = '',
                    monitor_type = '',
                    monitor_heard = '',
                    monitor_spoken = ''
                WHERE extension = ?
            `, [queue.name, '', queue.maxWait, queue.joinAnnounce, queue.id]);

        } else {
            // Insert new queue
            await connection.execute(`
                INSERT INTO queues_config (
                    extension, descr, grppre, alertinfo, ringing, maxwait,
                    password, ivr_id, dest, cwignore, qregex, agentannounce_id,
                    joinannounce_id, queuewait, use_queue_context, togglehint,
                    qnoanswer, callconfirm, callconfirm_id, monitor_type,
                    monitor_heard, monitor_spoken
                ) VALUES (?, ?, '', '', 0, ?, '', '', '', 'NO', '', '', ?, 'YES', 0, '', 'NO', 'disabled', '', '', '', '')
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
            ['announce-frequency', '0'],
            ['min-announce-frequency', '15'],
            ['periodic-announce-frequency', queue.periodicAnnounceFrequency],
            ['announce-holdtime', 'no'],
            ['announce-position', 'yes'],
            ['relative-periodic-announce', 'yes']
        ];

        for (const [keyword, data] of queueDetails) {
            await connection.execute(
                'INSERT INTO queues_details (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
                [queue.id, keyword, data]
            );
        }

        // Add all crew members as static agents
        await connection.execute('DELETE FROM queues_config WHERE extension = ? AND member = ?', [queue.id, '%']);

        for (const crew of CREW) {
            await connection.execute(`
                INSERT INTO queues_config (extension, descr, member)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE member = VALUES(member)
            `, [queue.id, queue.name, `Local/${crew.extension}@from-queue/n`]);
        }

        spinner.succeed(`Queue ${queue.id} provisioned with ${CREW.length} agents`);
        return true;
    } catch (error) {
        spinner.fail(`Queue provisioning failed: ${error.message}`);
        return false;
    }
}

/**
 * Provision Time Conditions
 */
async function provisionTimeConditions(connection) {
    const spinner = ora('Provisioning time conditions...').start();

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
                timeconditions_id, displayname, time, truegoto, falsegoto,
                deptname, generate_hint
            ) VALUES (?, ?, ?, ?, ?, '', 'CHECKED')
        `, [
            timeCondition.id,
            timeCondition.name,
            timeGroup.id,
            timeCondition.trueDest,
            timeCondition.falseDest
        ]);

        spinner.succeed(`Time condition "${timeCondition.name}" provisioned`);
        return true;
    } catch (error) {
        spinner.fail(`Time condition provisioning failed: ${error.message}`);
        return false;
    }
}

/**
 * Provision Announcements
 */
async function provisionAnnouncements(connection) {
    const spinner = ora('Provisioning announcements...').start();

    try {
        for (const announcement of ENHANCEMENTS.announcements) {
            // Check if exists
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
                        allow_skip = 1,
                        return_ivr = 0,
                        noanswer = 0
                    WHERE announcement_id = ?
                `, [announcement.description, announcement.message, announcement.postDest, announcement.id]);
            } else {
                await connection.execute(`
                    INSERT INTO announcement (
                        announcement_id, description, recording_id, post_dest,
                        allow_skip, return_ivr, noanswer
                    ) VALUES (?, ?, ?, ?, 1, 0, 0)
                `, [announcement.id, announcement.description, announcement.message, announcement.postDest]);
            }
        }

        spinner.succeed(`${ENHANCEMENTS.announcements.length} announcements provisioned`);
        return true;
    } catch (error) {
        spinner.fail(`Announcement provisioning failed: ${error.message}`);
        return false;
    }
}

/**
 * Fix Call Flow Toggle
 */
async function fixCallFlowToggle(connection) {
    const spinner = ora('Fixing call flow toggle...').start();

    try {
        const { callFlowToggle } = ENHANCEMENTS;

        // Check if exists
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

        spinner.succeed(`Call flow toggle ${callFlowToggle.featureCode} configured`);
        return true;
    } catch (error) {
        spinner.fail(`Call flow toggle fix failed: ${error.message}`);
        return false;
    }
}

/**
 * Update IVR to use queue instead of ring group
 */
async function updateIVRForQueue(connection) {
    const spinner = ora('Updating IVR menu...').start();

    try {
        // Update option 0 to route to queue instead of ring group
        await connection.execute(`
            UPDATE ivr_details
            SET dest = 'ext-queues,8001,1'
            WHERE ivr_id = '7000' AND selection = '0'
        `);

        spinner.succeed('IVR updated to use queue for option 0');
        return true;
    } catch (error) {
        spinner.fail(`IVR update failed: ${error.message}`);
        return false;
    }
}

/**
 * Reload FreePBX configuration
 */
async function reloadFreePBX() {
    const spinner = ora('Reloading FreePBX configuration...').start();

    try {
        const sshCommand = `sshpass -p '${SSH_CONFIG.password}' ssh -o StrictHostKeyChecking=no ${SSH_CONFIG.user}@${SSH_CONFIG.host} 'fwconsole reload'`;
        await execAsync(sshCommand);

        spinner.succeed('FreePBX configuration reloaded');
        return true;
    } catch (error) {
        spinner.warn(`FreePBX reload failed (non-critical): ${error.message}`);
        return false;
    }
}

/**
 * Main provisioning function
 */
async function main() {
    console.log(chalk.cyan.bold('\n🚀 FreePBX Enhanced IVR Provisioner\n'));

    let connection;

    try {
        // Connect to MySQL
        const spinner = ora('Connecting to FreePBX database...').start();
        const mysqlConfig = await getMySQLConfig();
        connection = await mysql.createConnection(mysqlConfig);
        spinner.succeed('Connected to FreePBX database');

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
        console.log(chalk.cyan.bold('\n📊 Provisioning Summary:\n'));
        console.log(`  Queue:           ${results.queue ? chalk.green('✓') : chalk.red('✗')}`);
        console.log(`  Time Conditions: ${results.timeConditions ? chalk.green('✓') : chalk.red('✗')}`);
        console.log(`  Announcements:   ${results.announcements ? chalk.green('✓') : chalk.red('✗')}`);
        console.log(`  Call Flow Toggle:${results.callFlowToggle ? chalk.green('✓') : chalk.red('✗')}`);
        console.log(`  IVR Update:      ${results.ivrUpdate ? chalk.green('✓') : chalk.red('✗')}`);

        const successCount = Object.values(results).filter(r => r).length;
        const totalCount = Object.keys(results).length;

        console.log(chalk.cyan.bold(`\n✅ ${successCount}/${totalCount} enhancements provisioned successfully!\n`));

        if (successCount === totalCount) {
            console.log(chalk.green('🎉 All IVR enhancements are now active!\n'));
            console.log(chalk.white('Next steps:'));
            console.log(chalk.white('  1. Call 88707695 to test the enhanced IVR'));
            console.log(chalk.white('  2. Press 0 to test the crew queue'));
            console.log(chalk.white('  3. Dial *2834 to toggle crew availability'));
            console.log(chalk.white('  4. Record audio files for announcements in FreePBX GUI\n'));
        }

    } catch (error) {
        console.error(chalk.red(`\n✗ Provisioning failed: ${error.message}\n`));
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { main as provisionEnhancedIVR };
