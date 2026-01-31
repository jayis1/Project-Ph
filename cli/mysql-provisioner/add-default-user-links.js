#!/usr/bin/env node

/**
 * Add default_user links for crew extensions
 * 
 * This script adds the missing "default_user" field in the sip table
 * to link extensions to their corresponding users in the users table.
 * 
 * Reads credentials from ~/.gemini-phone/config.json
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';

const CREW = [
    { name: 'Neo', extension: '9002' },
    { name: 'Tank', extension: '9003' },
    { name: 'Dozer', extension: '9004' },
    { name: 'Apoc', extension: '9005' },
    { name: 'Switch', extension: '9006' },
    { name: 'Mouse', extension: '9007' },
    { name: 'Cypher', extension: '9008' }
];

async function main() {
    console.log(chalk.bold.cyan('\n🔗 Add Default User Links for Crew Extensions\n'));

    // Load config
    const configPath = join(homedir(), '.gemini-phone', 'config.json');
    let config;

    try {
        config = JSON.parse(readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.error(chalk.red('❌ Failed to load config from ~/.gemini-phone/config.json'));
        console.error(chalk.gray(error.message));
        process.exit(1);
    }

    const freepbxHost = config.sip?.domain || '172.16.1.143';
    const mysqlPassword = config.api?.freepbx?.mysqlPassword;
    const sshPassword = config.voicemail?.sshPass || 'Jumbo2601';

    if (!mysqlPassword) {
        console.error(chalk.red('❌ FreePBX MySQL password not found in config.json'));
        process.exit(1);
    }

    console.log(chalk.gray(`FreePBX: ${freepbxHost}`));
    console.log(chalk.cyan('\n📋 Checking current default_user settings...\n'));

    // Check current state
    const checkCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e 'SELECT id, data FROM sip WHERE id IN (9000,9001,9002,9003,9004,9005,9006,9007,9008) AND keyword=\\\"default_user\\\" ORDER BY id;'"`;

    try {
        const result = execSync(checkCmd, { encoding: 'utf8' });
        console.log(chalk.gray(result));
    } catch (error) {
        console.error(chalk.red('❌ Failed to check current state'));
        console.error(chalk.gray(error.stderr || error.message));
        process.exit(1);
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (const member of CREW) {
        console.log(chalk.cyan(`\n🔗 Processing ${member.name} (${member.extension})...`));

        // Check if default_user already exists
        const checkExistingCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e 'SELECT COUNT(*) as count FROM sip WHERE id=\\\"${member.extension}\\\" AND keyword=\\\"default_user\\\" LIMIT 1;'"`;

        try {
            const result = execSync(checkExistingCmd, { encoding: 'utf8' });
            const count = parseInt(result.split('\n')[1]);

            if (count > 0) {
                console.log(chalk.yellow(`  ⚠ default_user already exists - skipping`));
                skippedCount++;
                continue;
            }
        } catch (error) {
            console.error(chalk.red(`  ❌ Failed to check ${member.name}`));
            console.error(chalk.gray(error.stderr || error.message));
            continue;
        }

        // Add default_user entry
        const insertCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e 'INSERT INTO sip (id, keyword, data, flags) VALUES (\\\"${member.extension}\\\", \\\"default_user\\\", \\\"${member.extension}\\\", 2);'"`;

        try {
            execSync(insertCmd, { encoding: 'utf8' });
            console.log(chalk.green(`  ✅ Added default_user link`));
            addedCount++;
        } catch (error) {
            console.error(chalk.red(`  ❌ Failed to add default_user for ${member.name}`));
            console.error(chalk.gray(error.stderr || error.message));
        }
    }

    console.log(chalk.bold.cyan('\n📊 Summary\n'));
    console.log(chalk.green(`  ✅ Added: ${addedCount}`));
    console.log(chalk.yellow(`  ⚠ Skipped: ${skippedCount}`));

    // Reload FreePBX
    console.log(chalk.cyan('\n🔄 Reloading FreePBX configuration...\n'));
    const reloadCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "fwconsole reload"`;

    try {
        execSync(reloadCmd, { encoding: 'utf8' });
        console.log(chalk.green('✅ FreePBX reloaded successfully\n'));
    } catch (error) {
        console.error(chalk.red('❌ Failed to reload FreePBX'));
        console.error(chalk.gray(error.stderr || error.message));
    }

    console.log(chalk.bold.green('✅ Default user links added successfully!\n'));
}

main().catch(error => {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
});
