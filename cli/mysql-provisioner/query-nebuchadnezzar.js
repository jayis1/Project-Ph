#!/usr/bin/env node

/**
 * Query FreePBX for complete Nebuchadnezzar crew configuration
 * 
 * This script queries and displays:
 * - All 9 crew extensions (9000-9008)
 * - IVR 7000 configuration and digit mappings
 * - Inbound route (88707695 → IVR 7000)
 * - Ring Group 8000 configuration
 * - Current SIP registrations
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';

async function queryFreePBX() {
    console.log(chalk.bold.cyan('\n🔍 Nebuchadnezzar Crew Configuration Query\n'));

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

    // Helper function to run MySQL query
    const query = (sql) => {
        const cmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -se \\"${sql}\\""`;
        try {
            return execSync(cmd, { encoding: 'utf8' }).trim();
        } catch (error) {
            return `Error: ${error.message}`;
        }
    };

    // Helper function to run Asterisk command
    const asterisk = (cmd) => {
        const sshCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "asterisk -rx '${cmd}'"`;
        try {
            return execSync(sshCmd, { encoding: 'utf8' }).trim();
        } catch (error) {
            return `Error: ${error.message}`;
        }
    };

    // 1. Query Extensions
    console.log(chalk.bold('📞 Extensions (9000-9008):\n'));
    const extensions = query("SELECT id, data FROM sip WHERE keyword='account' AND data BETWEEN '9000' AND '9008' ORDER BY data");
    const extLines = extensions.split('\n');

    const crewNames = {
        '9000': 'Morpheus',
        '9001': 'Trinity',
        '9002': 'Neo',
        '9003': 'Tank',
        '9004': 'Dozer',
        '9005': 'Apoc',
        '9006': 'Switch',
        '9007': 'Mouse',
        '9008': 'Cypher'
    };

    extLines.forEach(line => {
        const [id, ext] = line.split('\t');
        if (ext && crewNames[ext]) {
            console.log(chalk.green(`  ✓ ${ext} - ${crewNames[ext]}`));
        }
    });

    // 2. Query IVR
    console.log(chalk.bold('\n📋 IVR 7000 Configuration:\n'));
    const ivrDetails = query("SELECT name, description, timeout_destination FROM ivr_details WHERE id='7000'");
    console.log(chalk.cyan(`  ${ivrDetails}`));

    console.log(chalk.bold('\n  Digit Mappings:\n'));
    const ivrEntries = query("SELECT selection, dest FROM ivr_entries WHERE ivr_id='7000' ORDER BY selection");
    const entryLines = ivrEntries.split('\n');

    entryLines.forEach(line => {
        const [digit, dest] = line.split('\t');
        if (digit && dest) {
            const ext = dest.match(/ext-local,(\d+)/)?.[1];
            if (ext && crewNames[ext]) {
                console.log(chalk.green(`    ${digit} → ${ext} (${crewNames[ext]})`));
            }
        }
    });

    const timeoutDest = query("SELECT timeout_destination FROM ivr_details WHERE id='7000'");
    if (timeoutDest) {
        console.log(chalk.yellow(`\n  Timeout: ${timeoutDest}`));
    }

    // 3. Query Inbound Route
    console.log(chalk.bold('\n📞 Inbound Route:\n'));
    const inboundRoute = query("SELECT cidnum, extension, destination, description FROM incoming WHERE cidnum='88707695'");
    const [did, ext, dest, desc] = inboundRoute.split('\t');
    if (did) {
        console.log(chalk.green(`  ✓ DID: ${did}`));
        console.log(chalk.green(`  ✓ Description: ${desc}`));
        console.log(chalk.green(`  ✓ Destination: ${dest}`));
    } else {
        console.log(chalk.red('  ✗ No inbound route found for 88707695'));
    }

    // 4. Query Ring Group
    console.log(chalk.bold('\n👥 Ring Group 8000:\n'));
    const ringGroup = query("SELECT description, grplist, strategy, grptime, postdest FROM ringgroups WHERE grpnum='8000'");
    const [rgDesc, grplist, strategy, grptime, postdest] = ringGroup.split('\t');

    if (rgDesc) {
        console.log(chalk.green(`  ✓ Description: ${rgDesc}`));
        console.log(chalk.green(`  ✓ Strategy: ${strategy}`));
        console.log(chalk.green(`  ✓ Ring Time: ${grptime}s`));
        console.log(chalk.green(`  ✓ Extensions: ${grplist}`));
        console.log(chalk.green(`  ✓ Destination: ${postdest || 'None'}`));
    } else {
        console.log(chalk.red('  ✗ Ring Group 8000 not found'));
    }

    // 5. Query SIP Registrations
    console.log(chalk.bold('\n🔌 Current SIP Registrations:\n'));
    const endpoints = asterisk("pjsip show endpoints | grep -E '(9000|9001|9002|9003|9004|9005|9006|9007|9008)' | grep Endpoint");
    const epLines = endpoints.split('\n');

    epLines.forEach(line => {
        if (line.includes('Endpoint:')) {
            const ext = line.match(/(\d{4})/)?.[1];
            const status = line.includes('Not in use') ? 'Available' : 'In Use';
            if (ext && crewNames[ext]) {
                const statusColor = status === 'Available' ? chalk.green : chalk.yellow;
                console.log(statusColor(`  ${ext} (${crewNames[ext]}): ${status}`));
            }
        }
    });

    // 6. Summary
    console.log(chalk.bold('\n📊 Configuration Summary:\n'));

    const extCount = extLines.filter(l => l.includes('\t')).length;
    const ivrEntryCount = entryLines.filter(l => l.includes('\t')).length;
    const hasInbound = !!did;
    const hasRingGroup = !!rgDesc;

    console.log(chalk.cyan(`  Extensions Provisioned: ${extCount}/9`));
    console.log(chalk.cyan(`  IVR Digit Mappings: ${ivrEntryCount}/9`));
    console.log(chalk.cyan(`  Inbound Route: ${hasInbound ? '✓' : '✗'}`));
    console.log(chalk.cyan(`  Ring Group: ${hasRingGroup ? '✓' : '✗'}`));

    // 7. Call Flow
    console.log(chalk.bold('\n📞 Call Flow:\n'));
    console.log(chalk.gray('  1. Call 88707695 (Redspot)'));
    console.log(chalk.gray('  2. → IVR 7000 (Nebuchadnezzar Crew)'));
    console.log(chalk.gray('  3. Press digit (0-8) → Route to extension'));
    console.log(chalk.gray('  4. No digit (timeout) → Ring Group 8000'));
    console.log(chalk.gray('  5. No answer → Voicemail\n'));

    console.log(chalk.bold.green('✅ Query complete!\n'));
}

queryFreePBX().catch(error => {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
});
