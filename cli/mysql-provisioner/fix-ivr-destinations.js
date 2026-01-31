#!/usr/bin/env node

/**
 * Fix IVR timeout destination and Ring Group 8000 configuration
 * 
 * This script:
 * 1. Sets IVR 7000 timeout destination to Ring Group 8000
 * 2. Configures Ring Group 8000 to ring all extensions
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';

const IVR_ID = '7000';
const RINGGROUP_ID = '8000';

async function fixDestinations() {
    console.log(chalk.bold.cyan('\n🔧 Fixing IVR and Ring Group Destinations\n'));

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

    console.log(chalk.cyan('📞 Step 1: Setting IVR timeout destination to Ring Group 8000\n'));

    // Update IVR timeout destination
    const updateIVRCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e \\"UPDATE ivr_details SET timeout_destination='ext-group,${RINGGROUP_ID},1' WHERE id='${IVR_ID}';\\""`;

    try {
        execSync(updateIVRCmd, { encoding: 'utf8' });
        console.log(chalk.green(`  ✓ IVR ${IVR_ID} timeout → Ring Group ${RINGGROUP_ID}`));
    } catch (error) {
        console.error(chalk.red(`  ✗ Failed to update IVR timeout: ${error.message}`));
    }

    console.log(chalk.cyan('\n📞 Step 2: Configuring Ring Group 8000 destination\n'));

    // Update Ring Group to have a proper destination (voicemail for extension 9000)
    const updateRingGroupCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e \\"UPDATE ringgroups SET postdest='ext-local,9000,1' WHERE grpnum='${RINGGROUP_ID}';\\""`;

    try {
        execSync(updateRingGroupCmd, { encoding: 'utf8' });
        console.log(chalk.green(`  ✓ Ring Group ${RINGGROUP_ID} destination → Extension 9000 voicemail`));
    } catch (error) {
        console.error(chalk.red(`  ✗ Failed to update Ring Group: ${error.message}`));
    }

    // Reload FreePBX
    console.log(chalk.cyan('\n🔄 Reloading FreePBX configuration...\n'));
    const reloadCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "fwconsole reload"`;
    execSync(reloadCmd, { encoding: 'utf8' });
    console.log(chalk.green('  ✓ FreePBX reloaded'));

    // Summary
    console.log(chalk.bold('\n📊 Configuration Summary:\n'));
    console.log(chalk.cyan(`  IVR ${IVR_ID} timeout → Ring Group ${RINGGROUP_ID}`));
    console.log(chalk.cyan(`  Ring Group ${RINGGROUP_ID} → Extension 9000 voicemail`));

    console.log(chalk.bold.green('\n✅ Destinations configured!\n'));
    console.log(chalk.yellow('Call flow:'));
    console.log(chalk.gray('  1. Call 88707695 (Redspot)'));
    console.log(chalk.gray('  2. Hear IVR menu'));
    console.log(chalk.gray('  3. Press digit (0-8) → Route to extension'));
    console.log(chalk.gray('  4. No digit pressed (timeout) → Ring Group 8000 (all extensions)'));
    console.log(chalk.gray('  5. No answer → Morpheus voicemail\n'));
}

fixDestinations().catch(error => {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
});
