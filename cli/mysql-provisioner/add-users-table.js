#!/usr/bin/env node

/**
 * Add missing users table entries for extensions 9002-9008
 * 
 * FreePBX requires entries in BOTH 'sip' and 'users' tables.
 * The provision-extensions.js script only created 'sip' entries.
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

const SIP_SECRET = 'GeminiPhone123!';

async function addUsersTableEntries() {
    console.log(chalk.bold.cyan('\n📝 Adding users table entries for crew extensions\n'));

    // Load config
    const configPath = join(homedir(), '.gemini-phone', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    const freepbxHost = config.sip?.domain || '172.16.1.143';
    const mysqlPassword = config.api?.freepbx?.mysqlPassword;
    const sshPassword = config.voicemail?.sshPass || 'Jumbo2601';

    if (!mysqlPassword) {
        console.error(chalk.red('Error: FreePBX MySQL password not found in config.json'));
        process.exit(1);
    }

    let createdCount = 0;

    for (const member of CREW) {
        console.log(chalk.cyan(`\n📞 Adding ${member.name} (${member.extension}) to users table...`));

        // Check if already exists
        const checkCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -se \\"SELECT COUNT(*) FROM users WHERE extension='${member.extension}'\\""`;

        try {
            const count = parseInt(execSync(checkCmd, { encoding: 'utf8' }).trim());

            if (count > 0) {
                console.log(chalk.yellow(`  ⚠ ${member.name} already exists in users table - skipping`));
                continue;
            }
        } catch (error) {
            console.error(chalk.red(`  ✗ Error checking ${member.name}: ${error.message}`));
            continue;
        }

        // Insert into users table
        const insertCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e \\"INSERT INTO users (extension, password, name, voicemail, ringtimer, noanswer, recording, outboundcid, sipname, noanswer_cid, busy_cid, chanunavail_cid, noanswer_dest, busy_dest, chanunavail_dest) VALUES ('${member.extension}', '${SIP_SECRET}', '${member.name} (AI)', 'default', '0', '', '', '', '${member.extension}', '', '', '', '', '', '');\\""`;

        try {
            execSync(insertCmd, { encoding: 'utf8' });
            console.log(chalk.green(`  ✓ ${member.name} added to users table`));
            createdCount++;
        } catch (error) {
            console.error(chalk.red(`  ✗ Failed to add ${member.name}: ${error.message}`));
        }
    }

    // Reload FreePBX
    console.log(chalk.cyan('\n🔄 Reloading FreePBX configuration...'));
    const reloadCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "fwconsole reload"`;
    execSync(reloadCmd, { encoding: 'utf8' });
    console.log(chalk.green('  ✓ FreePBX reloaded'));

    // Summary
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(`  ${chalk.green('Created:')} ${createdCount} users table entries`);

    if (createdCount > 0) {
        console.log(chalk.cyan('\n📝 Next steps:'));
        console.log('  1. Restart voice-app: docker restart voice-app');
        console.log('  2. Wait 10 seconds for registrations');
        console.log('  3. Check status: curl http://localhost:3000/api/sip-status | python3 -m json.tool');
        console.log('  4. Verify in FreePBX GUI: All 9 extensions should now be visible');
    }

    console.log(chalk.green('\n✅ Users table update complete!\n'));
}

addUsersTableEntries().catch(error => {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
});
