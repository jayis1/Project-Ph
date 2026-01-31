#!/usr/bin/env node

/**
 * Provision Ring Group with ALL Nebuchadnezzar crew members
 * This script creates/updates Ring Group 8000 with all your AI agents
 */

import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../lib/config.js';
import { FreePBXClient } from '../lib/freepbx-api.js';

// Define ALL your AI crew members here
const NEBUCHADNEZZAR_CREW = [
    { name: 'Morpheus', extension: '9000', role: 'Captain - Wise mentor' },
    { name: 'Trinity', extension: '9001', role: 'First Mate - Elite hacker' },
    { name: 'Neo', extension: '9002', role: 'The One - Learning fast' },
    { name: 'Tank', extension: '9003', role: 'Operator - Tech support' },
    { name: 'Dozer', extension: '9004', role: 'Pilot - Friendly helper' },
    { name: 'Apoc', extension: '9005', role: 'Crew - Street smart' },
    { name: 'Switch', extension: '9006', role: 'Crew - Quick thinker' },
    { name: 'Mouse', extension: '9007', role: 'Programmer - Enthusiastic' },
    { name: 'Cypher', extension: '9008', role: 'Traitor - Suspicious' }
];

async function provisionNebuchadnezzar() {
    console.log(chalk.bold.cyan('\n🚢 Provisioning Nebuchadnezzar Crew\n'));

    const config = await loadConfig();

    if (!config.api.freepbx || !config.api.freepbx.clientId) {
        console.log(chalk.red('❌ FreePBX API not configured. Run "gemini-phone setup" first.'));
        return;
    }

    const spinner = ora('Connecting to FreePBX...').start();

    try {
        const client = new FreePBXClient({
            clientId: config.api.freepbx.clientId,
            clientSecret: config.api.freepbx.clientSecret,
            apiUrl: config.api.freepbx.apiUrl
        });

        const pbxResult = await client.testConnection();
        if (!pbxResult.valid) {
            spinner.fail(chalk.red(`FreePBX API connection failed: ${pbxResult.error}`));
            return;
        }

        // Show crew roster
        console.log(chalk.bold('\n📋 Nebuchadnezzar Crew Roster:'));
        NEBUCHADNEZZAR_CREW.forEach(member => {
            console.log(chalk.gray(`   ${member.name.padEnd(12)} - Ext ${member.extension} - ${member.role}`));
        });
        console.log('');

        // Provision Ring Group
        spinner.text = 'Provisioning Ring Group 8000 (All Crew)...';
        const extensions = NEBUCHADNEZZAR_CREW.map(m => m.extension);
        const ringGroupExists = await client.ringGroupExists('8000');

        await client.createOrUpdateRingGroup(
            '8000',
            'Nebuchadnezzar Crew',
            extensions,
            'ringall'
        );

        spinner.info(chalk.cyan(`Ring Group 8000 ${ringGroupExists ? 'updated' : 'created'} with ${extensions.length} crew members`));

        // Show IVR instructions
        spinner.warn(chalk.yellow('\n⚠️  IVR provisioning not supported by FreePBX GraphQL API'));
        spinner.info(chalk.cyan('   Please create IVR 7000 manually in FreePBX GUI:'));
        spinner.info(chalk.gray('   Applications → IVR → Add IVR'));
        NEBUCHADNEZZAR_CREW.forEach((member, index) => {
            spinner.info(chalk.gray(`   - Press ${index + 1} → ${member.name} (Ext ${member.extension})`));
        });
        spinner.info(chalk.gray('   - Press 0 → Ring All Crew (8000)'));

        // Apply Config
        spinner.text = 'Applying configuration...';
        await client.applyConfig();

        spinner.succeed(chalk.green('\n✅ Nebuchadnezzar crew provisioned successfully!'));
        console.log(chalk.gray(`   Ring Group: 8000`));
        console.log(chalk.gray(`   Strategy: Ring All`));
        console.log(chalk.gray(`   Members: ${extensions.join(', ')}`));
        console.log('');

    } catch (error) {
        spinner.fail(chalk.red(`Provisioning Error: ${error.message}`));
    }
}

provisionNebuchadnezzar().catch(console.error);
