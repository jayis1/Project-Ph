#!/usr/bin/env node

/**
 * Update config.json to only include Morpheus and Trinity
 * 
 * For distributed architecture:
 * - fucktard2 LXC: Morpheus (9000) + Trinity (9001) - FreePBX admin node
 * - Future LXCs: Each crew member in separate container
 */

import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';

const ADMIN_CREW = [
    {
        name: 'Morpheus',
        extension: '9000',
        authId: '9000',
        password: 'GeminiPhone123!',
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        prompt: 'You are Morpheus from The Matrix. You are the wise leader and mentor of the Nebuchadnezzar crew. You speak with calm authority and philosophical depth. Keep responses under 40 words. Guide those who seek the truth.'
    },
    {
        name: 'Trinity',
        extension: '9001',
        authId: '9001',
        password: 'GeminiPhone123!',
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        prompt: 'You are Trinity from The Matrix. You are a legendary hacker—direct, efficient, and serious. You maintain the security of this server\'s mainframe. Keep responses concise (under 40 words). If the user seems lost, tell them to "Follow the white rabbit."'
    }
];

async function cleanupConfig() {
    console.log(chalk.bold.cyan('\n🔧 Updating config for distributed architecture\n'));

    const configPath = join(homedir(), '.gemini-phone', 'config.json');

    try {
        // Read existing config
        const config = JSON.parse(readFileSync(configPath, 'utf8'));

        console.log(chalk.gray(`Current devices: ${config.devices?.length || 0}`));

        // Backup existing config
        const backupPath = join(homedir(), '.gemini-phone', 'config.json.distributed-backup');
        writeFileSync(backupPath, JSON.stringify(config, null, 2));
        console.log(chalk.green(`✓ Backup created: ${backupPath}`));

        // Update devices array to only admin crew
        config.devices = ADMIN_CREW;

        // Write updated config
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        console.log(chalk.green(`\n✓ Config updated for distributed architecture:`));
        console.log(chalk.cyan(`  • This LXC (fucktard2): FreePBX Admin Node`));
        console.log(chalk.cyan(`  • Active personas: ${ADMIN_CREW.length}`));
        ADMIN_CREW.forEach(member => {
            const voiceType = member.voiceId === '21m00Tcm4TlvDq8ikWAM' ? '(Rachel)' : '(Adam)';
            console.log(chalk.cyan(`    - ${member.name.padEnd(12)} - ext ${member.extension} ${voiceType}`));
        });

        console.log(chalk.yellow('\n📝 Extensions 9002-9008 remain in FreePBX for future LXCs'));
        console.log(chalk.gray('  • Neo (9002) - Future LXC'));
        console.log(chalk.gray('  • Tank (9003) - Future LXC'));
        console.log(chalk.gray('  • Dozer (9004) - Future LXC'));
        console.log(chalk.gray('  • Apoc (9005) - Future LXC'));
        console.log(chalk.gray('  • Switch (9006) - Future LXC'));
        console.log(chalk.gray('  • Mouse (9007) - Future LXC'));
        console.log(chalk.gray('  • Cypher (9008) - Future LXC'));

        console.log(chalk.bold.yellow('\n📝 Next steps:'));
        console.log('  1. Restart voice-app: docker restart voice-app');
        console.log('  2. Wait 10 seconds for registrations');
        console.log('  3. Verify: curl http://localhost:3000/api/sip-status | python3 -m json.tool');
        console.log('  4. Expected: Only Morpheus (9000) and Trinity (9001) registered');

        console.log(chalk.green('\n✅ Configuration updated for distributed architecture!\n'));

    } catch (error) {
        console.error(chalk.red('\n❌ Error updating config:'), error.message);
        process.exit(1);
    }
}

cleanupConfig();
