#!/usr/bin/env node

/**
 * FreePBX IVR Provisioner via MySQL
 * Directly inserts IVR configuration into FreePBX database
 */

import mysql from 'mysql2/promise';
import chalk from 'chalk';
import ora from 'ora';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

import { loadConfig } from '../../lib/config.js';

// Configuration loaded dynamically
async function getMySQLConfig() {
    const config = await loadConfig();

    // Check if MySQL creds exist, if not use defaults or error
    return {
        host: config.api?.freepbx?.host || '172.16.1.143',
        port: 3306,
        user: config.api?.freepbx?.mysqlUser || 'freepbxuser',
        password: config.api?.freepbx?.mysqlPassword || 'rCK+gZBKfILF', // Default to what we found
        database: 'asterisk'
    };
}

const SSH_CONFIG = {
    host: '172.16.1.143',
    user: 'root',
    password: 'Jumbo2601'  // Should also be in config ideally
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

const IVR_ID = '7000';
const IVR_NAME = 'Nebuchadnezzar Crew';
const IVR_DESCRIPTION = 'AI Selection Menu';

async function provisionIVR() {
    console.log(chalk.bold.cyan('\n🚢 Provisioning Nebuchadnezzar IVR via MySQL\n'));

    const spinner = ora('Connecting to FreePBX MySQL...').start();
    const mysqlConfig = await getMySQLConfig();

    let connection;
    try {
        // Connect to MySQL
        connection = await mysql.createConnection(mysqlConfig);
        spinner.succeed('Connected to MySQL');

        // Check if IVR already exists
        spinner.start('Checking for existing IVR...');
        const [existing] = await connection.execute(
            'SELECT id FROM ivr_details WHERE id = ?',
            [IVR_ID]
        );

        if (existing.length > 0) {
            spinner.info(`IVR ${IVR_ID} already exists, deleting...`);

            // Delete existing entries
            await connection.execute('DELETE FROM ivr_entries WHERE ivr_id = ?', [IVR_ID]);
            await connection.execute('DELETE FROM ivr_details WHERE id = ?', [IVR_ID]);

            spinner.succeed('Deleted existing IVR');
        } else {
            spinner.succeed('No existing IVR found');
        }

        // Create IVR details
        spinner.start('Creating IVR details...');
        await connection.execute(`
            INSERT INTO ivr_details (
                id, name, description, announcement, directdial,
                timeout, timeout_time, timeout_recording, timeout_retry_recording,
                timeout_loops, timeout_append_announce, timeout_destination,
                invalid_loops, invalid_retry_recording, invalid_destination,
                invalid_recording, retvm
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            IVR_ID,
            IVR_NAME,
            IVR_DESCRIPTION,
            '0',              // announcement (0 = none, you'll need to record one)
            'CHECKED',        // directdial enabled
            '1',              // timeout enabled
            '10',             // timeout_time (10 seconds)
            '0',              // timeout_recording
            '0',              // timeout_retry_recording
            '3',              // timeout_loops
            '0',              // timeout_append_announce
            'ext-local,8000,1', // timeout_destination (ring group 8000)
            '3',              // invalid_loops
            '0',              // invalid_retry_recording
            'app-blackhole,hangup,1', // invalid_destination
            '0',              // invalid_recording
            'CHECKED'         // retvm (return to IVR)
        ]);
        spinner.succeed('Created IVR details');

        // Create IVR entries
        spinner.start('Creating IVR menu options...');
        for (let i = 0; i < CREW.length; i++) {
            const member = CREW[i];
            const digit = (i + 1).toString();

            await connection.execute(`
                INSERT INTO ivr_entries (ivr_id, selection, dest, ivr_ret)
                VALUES (?, ?, ?, ?)
            `, [
                IVR_ID,
                digit,
                `ext-local,${member.extension},1`,
                '0'
            ]);

            console.log(chalk.gray(`   Press ${digit} → ${member.name} (${member.extension})`));
        }

        // Add option 0 for ring group
        await connection.execute(`
            INSERT INTO ivr_entries (ivr_id, selection, dest, ivr_ret)
            VALUES (?, ?, ?, ?)
        `, [IVR_ID, '0', 'ext-local,8000,1', '0']);
        console.log(chalk.gray(`   Press 0 → Ring All Crew (8000)`));

        spinner.succeed(`Created ${CREW.length + 1} IVR menu options`);

        // Reload FreePBX dialplan via SSH
        spinner.start('Reloading FreePBX dialplan...');
        try {
            const sshCmd = `sshpass -p "${SSH_CONFIG.password}" ssh -o StrictHostKeyChecking=no ${SSH_CONFIG.user}@${SSH_CONFIG.host} "fwconsole reload"`;
            await execAsync(sshCmd);
            spinner.succeed('FreePBX dialplan reloaded');
        } catch (error) {
            spinner.warn('Could not reload dialplan automatically');
            console.log(chalk.yellow('\n⚠️  Please run manually on FreePBX:'));
            console.log(chalk.gray('   ssh root@172.16.1.143 "fwconsole reload"\n'));
        }

        console.log(chalk.green('\n✅ IVR 7000 provisioned successfully!\n'));
        console.log(chalk.bold('📋 Next Steps:'));
        console.log(chalk.gray('1. Record IVR announcement in FreePBX GUI'));
        console.log(chalk.gray('   Admin → System Recordings → Add Recording'));
        console.log(chalk.gray('2. Update IVR 7000 to use the recording'));
        console.log(chalk.gray('   Applications → IVR → 7000 → Announcement'));
        console.log(chalk.gray('3. Point your DID to IVR 7000'));
        console.log(chalk.gray('   Connectivity → Inbound Routes → Set Destination\n'));

    } catch (error) {
        spinner.fail('Provisioning failed');
        console.error(chalk.red('\n❌ Error:'), error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log(chalk.yellow('\n💡 MySQL connection refused. Check:'));
            console.log(chalk.gray('   1. MySQL is running on FreePBX'));
            console.log(chalk.gray('   2. MySQL credentials are correct'));
            console.log(chalk.gray('   3. MySQL allows remote connections\n'));
        }
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Check if sshpass is installed
async function checkPrerequisites() {
    try {
        await execAsync('which sshpass');
    } catch {
        console.log(chalk.yellow('\n⚠️  sshpass not installed. Installing...\n'));
        try {
            await execAsync('sudo apt-get install -y sshpass');
            console.log(chalk.green('✅ sshpass installed\n'));
        } catch (error) {
            console.log(chalk.red('❌ Could not install sshpass'));
            console.log(chalk.yellow('Please install manually: sudo apt-get install sshpass\n'));
            process.exit(1);
        }
    }
}

// Main
(async () => {
    await checkPrerequisites();
    await provisionIVR();
})().catch(console.error);
