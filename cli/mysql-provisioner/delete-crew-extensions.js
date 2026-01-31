#!/usr/bin/env node

/**
 * Delete MySQL-provisioned crew extensions (9002-9008)
 * This removes the broken extensions so they can be recreated via API
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';

const EXTENSIONS = ['9002', '9003', '9004', '9005', '9006', '9007', '9008'];

async function main() {
    console.log(chalk.bold.cyan('\n🗑️  Deleting MySQL-Provisioned Extensions\n'));

    // Load config
    const configPath = join(homedir(), '.gemini-phone', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    const freepbxHost = config.sip?.domain || '172.16.1.143';
    const mysqlPassword = config.api?.freepbx?.mysqlPassword;
    const sshPassword = config.voicemail?.sshPass || 'Jumbo2601';

    if (!mysqlPassword) {
        console.error(chalk.red('❌ FreePBX MySQL password not found in config.json'));
        process.exit(1);
    }

    let deletedCount = 0;

    for (const ext of EXTENSIONS) {
        console.log(chalk.cyan(`\n🗑️  Deleting extension ${ext}...`));

        try {
            // Delete from sip table
            const deleteSipCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e 'DELETE FROM sip WHERE id=\\\"${ext}\\\";'"`;
            execSync(deleteSipCmd, { encoding: 'utf8' });

            // Delete from users table
            const deleteUsersCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e 'DELETE FROM users WHERE extension=\\\"${ext}\\\";'"`;
            execSync(deleteUsersCmd, { encoding: 'utf8' });

            console.log(chalk.green(`  ✅ Deleted ${ext}`));
            deletedCount++;
        } catch (error) {
            console.error(chalk.red(`  ❌ Failed to delete ${ext}`));
            console.error(chalk.gray(error.stderr || error.message));
        }
    }

    console.log(chalk.bold.cyan('\n📊 Summary\n'));
    console.log(chalk.green(`  ✅ Deleted: ${deletedCount}/${EXTENSIONS.length}`));

    // Reload FreePBX
    console.log(chalk.cyan('\n🔄 Reloading FreePBX...\n'));
    const reloadCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "fwconsole reload"`;

    try {
        execSync(reloadCmd, { encoding: 'utf8' });
        console.log(chalk.green('✅ FreePBX reloaded\n'));
    } catch (error) {
        console.error(chalk.red('❌ Failed to reload FreePBX'));
    }

    console.log(chalk.bold.green('✅ Cleanup complete! Now run provision-crew-via-api.js\n'));
}

main().catch(error => {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
});
