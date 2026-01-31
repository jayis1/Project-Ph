#!/usr/bin/env node

/**
 * Debug and fix inbound route destination
 * 
 * Check current destination value and update if needed
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';

const INBOUND_DID = '88707695';
const IVR_ID = '7000';

async function debugInboundRoute() {
    console.log(chalk.bold.cyan('\n🔍 Debugging Inbound Route\n'));

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

    // Check current destination
    console.log(chalk.cyan('📊 Current inbound route configuration:\n'));
    const checkCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -se \\"SELECT cidnum, extension, destination, description FROM incoming WHERE cidnum='${INBOUND_DID}'\\""`;

    try {
        const result = execSync(checkCmd, { encoding: 'utf8' });
        console.log(chalk.gray(result));

        if (result.includes('ivr,7000,1')) {
            console.log(chalk.green('  ✓ Destination is correctly set to: ivr,7000,1'));
            console.log(chalk.yellow('\n  The FreePBX GUI may be caching the old value.'));
            console.log(chalk.yellow('  Try refreshing the page or clicking "Apply Config" in FreePBX.\n'));
        } else {
            console.log(chalk.yellow('  ⚠ Destination value looks incorrect, updating...\n'));

            // Update destination
            const updateCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e \\"UPDATE incoming SET destination='ivr,${IVR_ID},1' WHERE cidnum='${INBOUND_DID}';\\""`;
            execSync(updateCmd, { encoding: 'utf8' });

            console.log(chalk.green('  ✓ Updated destination to: ivr,7000,1'));

            // Reload
            console.log(chalk.cyan('\n🔄 Reloading FreePBX...\n'));
            const reloadCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "fwconsole reload"`;
            execSync(reloadCmd, { encoding: 'utf8' });
            console.log(chalk.green('  ✓ FreePBX reloaded\n'));
        }
    } catch (error) {
        console.error(chalk.red(`  ✗ Error: ${error.message}`));
    }

    console.log(chalk.bold.green('✅ Check complete!\n'));
}

debugInboundRoute().catch(error => {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
});
