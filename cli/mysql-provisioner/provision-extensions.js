#!/usr/bin/env node

/**
 * Provision Missing Crew Extensions (9002-9008)
 * 
 * This script creates chan_sip extensions for the Nebuchadnezzar crew members
 * that don't already exist in FreePBX.
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

const CREW = [
    { name: 'Neo', extension: '9002' },
    { name: 'Tank', extension: '9003' },
    { name: 'Dozer', extension: '9004' },
    { name: 'Apoc', extension: '9005' },
    { name: 'Switch', extension: '9006' },
    { name: 'Mouse', extension: '9007' },
    { name: 'Cypher', extension: '9008' }
];

const SIP_SECRET = 'GeminiPhone123!';

// chan_sip configuration for each extension
const CHAN_SIP_FIELDS = [
    { keyword: 'account', data: '' },
    { keyword: 'accountcode', data: '' },
    { keyword: 'allow', data: '' },
    { keyword: 'avpf', data: 'yes' },
    { keyword: 'callerid', data: 'device' },
    { keyword: 'canreinvite', data: 'no' },
    { keyword: 'context', data: 'from-internal' },
    { keyword: 'deny', data: '0.0.0.0/0.0.0.0' },
    { keyword: 'disallow', data: '' },
    { keyword: 'dtmfmode', data: 'rfc2833' },
    { keyword: 'encryption', data: 'no' },
    { keyword: 'host', data: 'dynamic' },
    { keyword: 'mailbox', data: '' }, // Will be set to extension@device
    { keyword: 'nat', data: 'yes' },
    { keyword: 'permit', data: '0.0.0.0/0.0.0.0' },
    { keyword: 'port', data: '5060' },
    { keyword: 'qualify', data: 'yes' },
    { keyword: 'qualifyfreq', data: '60' },
    { keyword: 'secret', data: SIP_SECRET },
    { keyword: 'type', data: 'friend' },
    { keyword: 'vmexten', data: '*97' }
];

async function provisionExtensions() {
    const spinner = ora('Loading configuration...').start();

    try {
        // Load config from ~/.gemini-phone/config.json
        const configPath = join(homedir(), '.gemini-phone', 'config.json');
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        const { server } = config;

        if (!server?.mysql) {
            spinner.fail('MySQL configuration not found in config.json');
            process.exit(1);
        }

        spinner.text = 'Connecting to FreePBX MySQL...';

        const connection = await mysql.createConnection({
            host: server.mysql.host,
            user: server.mysql.user,
            password: server.mysql.password,
            database: server.mysql.database || 'asterisk'
        });

        spinner.succeed('Connected to FreePBX MySQL');

        // Check if sip table exists (chan_sip)
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'sip'"
        );

        if (tables.length === 0) {
            spinner.fail('chan_sip table not found. This script only works with chan_sip, not PJSIP.');
            await connection.end();
            process.exit(1);
        }

        let createdCount = 0;
        let skippedCount = 0;

        for (const member of CREW) {
            spinner.start(`Provisioning ${member.name} (${member.extension})...`);

            // Check if extension already exists
            const [existing] = await connection.execute(
                'SELECT DISTINCT id FROM sip WHERE id = ?',
                [member.extension]
            );

            if (existing.length > 0) {
                spinner.info(`${member.name} (${member.extension}) already exists - skipping`);
                skippedCount++;
                continue;
            }

            // Insert all chan_sip fields for this extension
            for (const field of CHAN_SIP_FIELDS) {
                let data = field.data;

                // Set mailbox to extension@device
                if (field.keyword === 'mailbox') {
                    data = `${member.extension}@device`;
                }

                // Set callerid to "Name <extension>"
                if (field.keyword === 'callerid') {
                    data = `${member.name} <${member.extension}>`;
                }

                await connection.execute(
                    'INSERT INTO sip (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
                    [member.extension, field.keyword, data]
                );
            }

            spinner.succeed(`${chalk.green('✓')} Created ${member.name} (${member.extension})`);
            createdCount++;
        }

        await connection.end();

        console.log('');
        console.log(chalk.bold('Summary:'));
        console.log(`  ${chalk.green('Created:')} ${createdCount} extensions`);
        console.log(`  ${chalk.yellow('Skipped:')} ${skippedCount} extensions (already exist)`);

        if (createdCount > 0) {
            console.log('');
            console.log(chalk.cyan('Next steps:'));
            console.log('  1. Reload FreePBX: fwconsole reload');
            console.log('  2. Restart voice-app: gemini-phone stop && gemini-phone start');
            console.log('  3. Verify IVR destinations are now valid in FreePBX GUI');
        }

    } catch (error) {
        spinner.fail(`Error: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

provisionExtensions();
