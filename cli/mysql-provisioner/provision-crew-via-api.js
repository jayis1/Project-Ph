#!/usr/bin/env node

/**
 * Provision Nebuchadnezzar Crew Extensions via FreePBX GraphQL API
 * 
 * This script properly creates extensions 9002-9008 using FreePBX's official API,
 * ensuring they work like Morpheus (9000) and Trinity (9001).
 */

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';
import { FreePBXClient } from '../lib/freepbx-api.js';

const CREW = [
    { name: 'Morpheus', extension: '9000', voiceId: 'pNInz6obpgDQGcFmaJgB', prompt: 'You are Morpheus from The Matrix. You are the wise leader and mentor who guides others to see the truth. You speak with calm authority and philosophical depth.' },
    { name: 'Neo', extension: '9002', voiceId: 'pNInz6obpgDQGcFmaJgB', prompt: 'You are Neo from The Matrix. You are The One...' },
    { name: 'Tank', extension: '9003', voiceId: 'pNInz6obpgDQGcFmaJgB', prompt: 'You are Tank from The Matrix...' },
    { name: 'Dozer', extension: '9004', voiceId: 'pNInz6obpgDQGcFmaJgB', prompt: 'You are Dozer from The Matrix...' },
    { name: 'Apoc', extension: '9005', voiceId: 'pNInz6obpgDQGcFmaJgB', prompt: 'You are Apoc from The Matrix...' },
    { name: 'Switch', extension: '9006', voiceId: '21m00Tcm4TlvDq8ikWAM', prompt: 'You are Switch from The Matrix...' },
    { name: 'Mouse', extension: '9007', voiceId: 'pNInz6obpgDQGcFmaJgB', prompt: 'You are Mouse from The Matrix...' },
    { name: 'Cypher', extension: '9008', voiceId: 'pNInz6obpgDQGcFmaJgB', prompt: 'You are Cypher from The Matrix...' }
];

const SIP_SECRET = 'GeminiPhone123!';

async function main() {
    console.log(chalk.bold.cyan('\n🚢 Provisioning Nebuchadnezzar Crew via FreePBX API\n'));

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

    const freepbxConfig = config.api?.freepbx;
    if (!freepbxConfig?.clientId || !freepbxConfig?.clientSecret || !freepbxConfig?.apiUrl) {
        console.error(chalk.red('❌ FreePBX API credentials not found in config.json'));
        console.error(chalk.gray('Required: api.freepbx.clientId, api.freepbx.clientSecret, api.freepbx.apiUrl'));
        process.exit(1);
    }

    // Initialize FreePBX API client
    const client = new FreePBXClient({
        clientId: freepbxConfig.clientId,
        clientSecret: freepbxConfig.clientSecret,
        apiUrl: freepbxConfig.apiUrl
    });

    // Test connection
    console.log(chalk.cyan('🔌 Testing FreePBX API connection...\n'));
    const connectionTest = await client.testConnection();
    if (!connectionTest.valid) {
        console.error(chalk.red(`❌ FreePBX API connection failed: ${connectionTest.error}`));
        process.exit(1);
    }
    console.log(chalk.green('✅ FreePBX API connected\n'));

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const member of CREW) {
        console.log(chalk.cyan(`\n📞 Provisioning ${member.name} (${member.extension})...`));

        try {
            // Check if extension already exists
            const existingId = await client.findExtensionId(member.extension);

            if (existingId) {
                console.log(chalk.yellow(`  ⚠ ${member.name} already exists (ID: ${existingId}) - skipping`));
                skippedCount++;
                continue;
            }

            // Create extension via GraphQL API
            const mutation = `
                mutation($input: addExtensionInput!) {
                    addExtension(input: $input) {
                        status
                        message
                    }
                }
            `;

            const input = {
                extensionId: member.extension,  // Required: ID!
                name: member.name.toUpperCase(), // Required: String!
                email: `${member.name.toLowerCase()}@nebuchadnezzar.local`, // Required: String!
                tech: 'pjsip',
                outboundCid: member.name,
                emergencyCid: '',
                umEnable: false,
                umGroups: '',
                secret: SIP_SECRET  // Set the SIP password
            };

            const result = await client.query(mutation, { input });

            if (result?.addExtension?.status === true || result?.addExtension?.message?.includes('success')) {
                console.log(chalk.green(`  ✅ Created ${member.name}`));
                createdCount++;
            } else {
                console.log(chalk.yellow(`  ⚠ Unexpected response: ${JSON.stringify(result)}`));
                errorCount++;
            }

        } catch (error) {
            console.error(chalk.red(`  ❌ Failed to create ${member.name}`));
            console.error(chalk.gray(`     ${error.message}`));
            errorCount++;
        }
    }

    console.log(chalk.bold.cyan('\n📊 Summary\n'));
    console.log(chalk.green(`  ✅ Created: ${createdCount}`));
    console.log(chalk.yellow(`  ⚠ Skipped: ${skippedCount}`));
    console.log(chalk.red(`  ❌ Errors: ${errorCount}`));

    // Apply configuration
    if (createdCount > 0) {
        console.log(chalk.cyan('\n🔄 Applying FreePBX configuration...\n'));
        try {
            await client.applyConfig();
            console.log(chalk.green('✅ Configuration applied successfully\n'));
        } catch (error) {
            console.error(chalk.red('❌ Failed to apply configuration'));
            console.error(chalk.gray(error.message));
        }
    }

    console.log(chalk.bold.green('✅ Crew provisioning complete!\n'));
}

main().catch(error => {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
});
