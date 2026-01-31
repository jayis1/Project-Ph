#!/usr/bin/env node

/**
 * Configure IVR 7000 and create inbound route for redspot (88707695)
 * 
 * This script:
 * 1. Configures IVR destinations (digit 0-8 → extensions 9000-9008)
 * 2. Creates inbound route from redspot to IVR 7000
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';

const IVR_ID = '7000';
const IVR_NAME = 'Nebuchadnezzar Crew';
const INBOUND_DID = '88707695';
const TRUNK_NAME = 'Redspot';

const DIGIT_MAPPINGS = [
    { digit: '0', extension: '9000', name: 'Morpheus' },
    { digit: '1', extension: '9001', name: 'Trinity' },
    { digit: '2', extension: '9002', name: 'Neo' },
    { digit: '3', extension: '9003', name: 'Tank' },
    { digit: '4', extension: '9004', name: 'Dozer' },
    { digit: '5', extension: '9005', name: 'Apoc' },
    { digit: '6', extension: '9006', name: 'Switch' },
    { digit: '7', extension: '9007', name: 'Mouse' },
    { digit: '8', extension: '9008', name: 'Cypher' }
];

async function configureIVRAndRoute() {
    console.log(chalk.bold.cyan('\n🎯 Configuring IVR and Inbound Route\n'));

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

    console.log(chalk.cyan('📞 Step 1: Configuring IVR destinations\n'));

    // First, check if IVR exists
    const checkIVRCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -se \\"SELECT COUNT(*) FROM ivr_details WHERE id='${IVR_ID}'\\""`;

    try {
        const ivrCount = parseInt(execSync(checkIVRCmd, { encoding: 'utf8' }).trim());

        if (ivrCount === 0) {
            console.log(chalk.yellow(`⚠ IVR ${IVR_ID} not found - creating it first`));

            // Create IVR entry
            const createIVRCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e \\"INSERT INTO ivr_details (id, name, description, announcement, directdial, invalid_loops, invalid_retry_recording, invalid_destination, timeout_time, timeout_recording, timeout_destination, retvm) VALUES ('${IVR_ID}', '${IVR_NAME}', 'AI Selection Menu', '', 'CHECKED', '3', '', '', '10', '', '', '');\\""`;

            execSync(createIVRCmd, { encoding: 'utf8' });
            console.log(chalk.green(`  ✓ Created IVR ${IVR_ID}`));
        } else {
            console.log(chalk.green(`  ✓ IVR ${IVR_ID} exists`));
        }
    } catch (error) {
        console.error(chalk.red(`  ✗ Error checking IVR: ${error.message}`));
        process.exit(1);
    }

    // Clear existing IVR entries
    console.log(chalk.gray('\n  Clearing existing IVR digit mappings...'));
    const clearCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e \\"DELETE FROM ivr_entries WHERE ivr_id='${IVR_ID}';\\""`;
    execSync(clearCmd, { encoding: 'utf8' });

    // Add digit mappings
    for (const mapping of DIGIT_MAPPINGS) {
        const destination = `from-did-direct,${mapping.extension},1`;
        const insertCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e \\"INSERT INTO ivr_entries (ivr_id, selection, dest, ivr_ret) VALUES ('${IVR_ID}', '${mapping.digit}', '${destination}', '0');\\""`;

        try {
            execSync(insertCmd, { encoding: 'utf8' });
            console.log(chalk.green(`  ✓ Digit ${mapping.digit} → ${mapping.name} (${mapping.extension})`));
        } catch (error) {
            console.error(chalk.red(`  ✗ Failed to map digit ${mapping.digit}: ${error.message}`));
        }
    }

    console.log(chalk.cyan('\n📞 Step 2: Creating inbound route for redspot\n'));

    // Check if inbound route exists
    const checkRouteCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -se \\"SELECT COUNT(*) FROM incoming WHERE cidnum='${INBOUND_DID}'\\""`;

    try {
        const routeCount = parseInt(execSync(checkRouteCmd, { encoding: 'utf8' }).trim());

        if (routeCount > 0) {
            console.log(chalk.yellow(`  ⚠ Inbound route for ${INBOUND_DID} exists - updating`));

            // Update existing route
            const updateCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e \\"UPDATE incoming SET destination='ivr,${IVR_ID},1', description='${TRUNK_NAME} → Nebuchadnezzar IVR' WHERE cidnum='${INBOUND_DID}';\\""`;

            execSync(updateCmd, { encoding: 'utf8' });
            console.log(chalk.green(`  ✓ Updated inbound route: ${INBOUND_DID} → IVR ${IVR_ID}`));
        } else {
            console.log(chalk.gray(`  Creating new inbound route for ${INBOUND_DID}...`));

            // Create new route
            const insertCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e \\"INSERT INTO incoming (cidnum, extension, destination, description, grppre, delay_answer, pricid, ringing) VALUES ('${INBOUND_DID}', 's', 'ivr,${IVR_ID},1', '${TRUNK_NAME} → Nebuchadnezzar IVR', '', NULL, '', 'Ring');\\""`;

            execSync(insertCmd, { encoding: 'utf8' });
            console.log(chalk.green(`  ✓ Created inbound route: ${INBOUND_DID} → IVR ${IVR_ID}`));
        }
    } catch (error) {
        console.error(chalk.red(`  ✗ Error creating inbound route: ${error.message}`));
    }

    // Reload FreePBX
    console.log(chalk.cyan('\n🔄 Reloading FreePBX configuration...\n'));
    const reloadCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "fwconsole reload"`;
    execSync(reloadCmd, { encoding: 'utf8' });
    console.log(chalk.green('  ✓ FreePBX reloaded'));

    // Summary
    console.log(chalk.bold('\n📊 Configuration Summary:\n'));
    console.log(chalk.cyan(`  IVR: ${IVR_NAME} (extension ${IVR_ID})`));
    console.log(chalk.cyan(`  Inbound DID: ${INBOUND_DID} (${TRUNK_NAME})`));
    console.log(chalk.cyan(`  Route: ${INBOUND_DID} → IVR ${IVR_ID}\n`));

    console.log(chalk.yellow('  Digit Mappings:'));
    DIGIT_MAPPINGS.forEach(m => {
        console.log(chalk.gray(`    ${m.digit} → ${m.name} (${m.extension})`));
    });

    console.log(chalk.bold.green('\n✅ IVR and inbound route configured!\n'));
    console.log(chalk.cyan('📞 Test by calling 88707695 from your cell phone'));
    console.log(chalk.cyan('   You should hear the IVR menu and be able to press digits 0-8\n'));
}

configureIVRAndRoute().catch(error => {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
});
