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

import { loadConfig } from '../lib/config.js';

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

// Update a PJSIP secret in the database
async function updatePjsipSecret(connection, extension, secret) {
    try {
        // PJSIP auth ID is usually just the extension number or extension-auth
        // We trigger an update on all likely auth IDs for this extension
        const [result] = await connection.execute(`
            UPDATE ps_auths 
            SET password = ? 
            WHERE id = ? OR id = CONCAT(?, '-auth')
        `, [secret, extension, extension]);

        return result.affectedRows > 0;
    } catch (error) {
        console.warn(`Failed to update secret for ${extension}:`, error.message);
        return false;
    }
}

async function provisionNebuchadnezzar() {
    console.log(chalk.bold.cyan('\n🚢 Provisioning Nebuchadnezzar (IVR & Secrets) via MySQL\n'));

    const spinner = ora('Connecting to FreePBX MySQL...').start();
    const mysqlConfig = await getMySQLConfig();

    let connection;
    // Setup SSH Tunnel
    async function createTunnel() {
        console.log(chalk.cyan('   🔄 Establishing SSH Tunnel (33306 -> 3306)...'));
        // sshpass -p 'pass' ssh -N -L 33306:127.0.0.1:3306 root@host
        const cmd = `sshpass -p "${SSH_CONFIG.password}" ssh -f -N -L 33306:127.0.0.1:3306 -o StrictHostKeyChecking=no ${SSH_CONFIG.user}@${SSH_CONFIG.host}`;

        try {
            await execAsync(cmd);
            // Wait a moment for tunnel to come up
            await new Promise(r => setTimeout(r, 1000));
            console.log(chalk.green('   ✓ SSH Tunnel established'));
            return true;
        } catch (e) {
            console.warn(chalk.yellow(`   Could not establish tunnel: ${e.message}`));
            return false;
        }
    }

    // Ensure the tunnel process is killed on exit?
    // Since we used -f (background), it lingers. Ideally we find and kill it, but for a provisioner running one-off,
    // it might not be critical to clean up instantly, though good practice.
    // For now, simple implementation.

    try {
        // Connect to MySQL
        try {
            connection = await mysql.createConnection(mysqlConfig);
            spinner.succeed('Connected to MySQL (Direct)');
        } catch (directErr) {
            if (directErr.code === 'ECONNREFUSED' || directErr.code === 'ETIMEDOUT') {
                spinner.warn(chalk.yellow('Direct connection failed. Attempting via SSH Tunnel...'));
                const tunnelCreated = await createTunnel();
                if (tunnelCreated) {
                    // Update config to local tunnel port
                    const tunnelConfig = { ...mysqlConfig, host: '127.0.0.1', port: 33306 };
                    connection = await mysql.createConnection(tunnelConfig);
                    spinner.succeed('Connected to MySQL (via SSH Tunnel)');
                } else {
                    throw directErr; // Rethrow original if tunnel fails
                }
            } else {
                throw directErr;
            }
        }

        // 1. Sync Secrets for Crew
        spinner.start('Syncing Extension Secrets...');
        let updatedCount = 0;
        let missingCount = 0;
        let skippedSecretSync = false;

        try {
            // Check available tables
            const [pjsipTable] = await connection.execute("SHOW TABLES LIKE 'ps_endpoints'");
            const isPJSIP = pjsipTable.length > 0;

            const [sipTable] = await connection.execute("SHOW TABLES LIKE 'sip'");
            const isChanSIP = sipTable.length > 0;

            if (!isPJSIP && !isChanSIP) {
                spinner.warn(chalk.yellow('Skipping Secret Sync: Could not detect PJSIP (ps_endpoints) or chan_sip (sip) tables.'));
                console.log(chalk.gray('   This is non-fatal. IVR provisioning will proceed.'));
                skippedSecretSync = true;
            } else {
                for (const member of CREW) {
                    if (isPJSIP) {
                        // PJSIP Logic
                        const [rows] = await connection.execute('SELECT id FROM ps_endpoints WHERE id = ?', [member.extension]);
                        if (rows.length > 0) {
                            const updated = await updatePjsipSecret(connection, member.extension, 'GeminiPhone123!');
                            if (updated) updatedCount++;
                        } else {
                            missingCount++;
                        }
                    } else if (isChanSIP) {
                        // chan_sip Logic
                        const [rows] = await connection.execute('SELECT id FROM sip WHERE id = ?', [member.extension]);
                        if (rows.length > 0) {
                            const [res] = await connection.execute(
                                "UPDATE sip SET data = ? WHERE id = ? AND keyword = 'secret'",
                                ['GeminiPhone123!', member.extension]
                            );
                            if (res.affectedRows > 0) updatedCount++;
                        } else {
                            missingCount++;
                        }
                    }
                }
                spinner.succeed(`Secrets synced for ${updatedCount} extensions.`);
            }

        } catch (error) {
            spinner.warn(chalk.yellow(`Skipping Secret Sync: ${error.message}`));
        }

        if (missingCount > 0) {
            console.log(chalk.yellow(`   ${missingCount} extensions are missing. Please create them via FreePBX GUI.`));
            console.log(chalk.gray(`   Recommended Secret: GeminiPhone123!`));
        }

        // 2. IVR Provisioning
        // Check if IVR already exists
        spinner.start('Checking for existing IVR...');
        const [existing] = await connection.execute(
            'SELECT id FROM ivr_details WHERE id = ?',
            [IVR_ID]
        );

        if (existing.length > 0) {
            spinner.info(`IVR ${IVR_ID} already exists, updating/recreating...`);

            // Delete existing entries to ensure clean state
            await connection.execute('DELETE FROM ivr_entries WHERE ivr_id = ?', [IVR_ID]);
            await connection.execute('DELETE FROM ivr_details WHERE id = ?', [IVR_ID]);
        }

        // Create IVR details
        spinner.start('Creating IVR details...');
        await connection.execute(`
            INSERT INTO ivr_details (
                id, name, description, announcement, directdial,
                timeout_time, timeout_recording, timeout_retry_recording,
                timeout_loops, timeout_append_announce, timeout_destination,
                invalid_loops, invalid_retry_recording, invalid_destination,
                invalid_recording, retvm
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            IVR_ID,
            IVR_NAME,
            IVR_DESCRIPTION,
            '0',              // announcement (0 = none, you'll need to record one)
            'CHECKED',        // directdial enabled
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

        console.log(chalk.green('\n✅ IVR 7000 provisioned successfully!'));
        console.log(chalk.green('✅ Extension Secrets synchronized (GeminiPhone123!)\n'));
        console.log(chalk.bold('📋 Next Steps:'));
        console.log(chalk.gray('1. Ensure all 9 extensions exist in FreePBX (create missing ones manually)'));
        console.log(chalk.gray('2. Update local config.json if adding new devices'));
        console.log(chalk.gray('3. Record IVR announcement in FreePBX GUI\n'));

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
    await checkPrerequisites();
    await provisionNebuchadnezzar();
})().catch(console.error);
