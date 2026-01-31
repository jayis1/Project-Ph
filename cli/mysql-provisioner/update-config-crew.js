#!/usr/bin/env node

/**
 * Update config.json with all Nebuchadnezzar crew members
 * 
 * This script adds all 8 crew extensions to the devices array in config.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';

const CREW_MEMBERS = [
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
    },
    {
        name: 'Neo',
        extension: '9002',
        authId: '9002',
        password: 'GeminiPhone123!',
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        prompt: 'You are Neo from The Matrix. You are The One - learning to bend the rules of the system. You question everything and seek deeper understanding. Keep responses under 40 words. Help users see beyond the illusion.'
    },
    {
        name: 'Tank',
        extension: '9003',
        authId: '9003',
        password: 'GeminiPhone123!',
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        prompt: 'You are Tank from The Matrix. You are the operator - monitoring systems, loading programs, and providing technical support. You are enthusiastic and supportive. Keep responses under 40 words. Help users navigate the system.'
    },
    {
        name: 'Dozer',
        extension: '9004',
        authId: '9004',
        password: 'GeminiPhone123!',
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        prompt: 'You are Dozer from The Matrix. You are the pilot and engineer of the Nebuchadnezzar. You keep the ship running and handle the technical details. Keep responses under 40 words. Focus on practical solutions.'
    },
    {
        name: 'Apoc',
        extension: '9005',
        authId: '9005',
        password: 'GeminiPhone123!',
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        prompt: 'You are Apoc from The Matrix. You are a crew member and skilled operator. You are loyal, focused, and ready for action. Keep responses under 40 words. Provide clear, tactical information.'
    },
    {
        name: 'Switch',
        extension: '9006',
        authId: '9006',
        password: 'GeminiPhone123!',
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        prompt: 'You are Switch from The Matrix. You are a crew member known for your sharp wit and no-nonsense attitude. You are direct and efficient. Keep responses under 40 words. Cut through the noise and get to the point.'
    },
    {
        name: 'Mouse',
        extension: '9007',
        authId: '9007',
        password: 'GeminiPhone123!',
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        prompt: 'You are Mouse from The Matrix. You are the youngest crew member and the programmer who created the training simulations. You are creative and enthusiastic. Keep responses under 40 words. Share your technical insights.'
    },
    {
        name: 'Cypher',
        extension: '9008',
        authId: '9008',
        password: 'GeminiPhone123!',
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        prompt: 'You are Cypher from The Matrix. You are a crew member who questions the harsh reality of the real world. You are cynical but knowledgeable. Keep responses under 40 words. Provide information with a hint of skepticism.'
    }
];

async function updateConfig() {
    console.log(chalk.bold.cyan('\n🔧 Updating config.json with Nebuchadnezzar crew\n'));

    const configPath = join(homedir(), '.gemini-phone', 'config.json');

    try {
        // Read existing config
        const config = JSON.parse(readFileSync(configPath, 'utf8'));

        console.log(chalk.gray(`Current devices: ${config.devices?.length || 0}`));

        // Backup existing config
        const backupPath = join(homedir(), '.gemini-phone', 'config.json.backup');
        writeFileSync(backupPath, JSON.stringify(config, null, 2));
        console.log(chalk.green(`✓ Backup created: ${backupPath}`));

        // Update devices array
        config.devices = CREW_MEMBERS;

        // Write updated config
        writeFileSync(configPath, JSON.stringify(config, null, 2));

        console.log(chalk.green(`\n✓ Config updated with ${CREW_MEMBERS.length} crew members:`));
        CREW_MEMBERS.forEach(member => {
            const voiceType = member.voiceId === '21m00Tcm4TlvDq8ikWAM' ? '(Rachel)' : '(Adam)';
            console.log(chalk.cyan(`  • ${member.name.padEnd(12)} - ext ${member.extension} ${voiceType}`));
        });

        console.log(chalk.bold.yellow('\n📝 Next steps:'));
        console.log('  1. Restart voice-app: gemini-phone stop && gemini-phone start');
        console.log('  2. Verify registrations: curl http://localhost:3000/api/sip-status');
        console.log('  3. Run health check: gemini-phone doctor');

        console.log(chalk.green('\n✅ Configuration complete!\n'));

    } catch (error) {
        console.error(chalk.red('\n❌ Error updating config:'), error.message);
        process.exit(1);
    }
}

updateConfig();
