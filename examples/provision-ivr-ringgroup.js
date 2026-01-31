#!/usr/bin/env node
/**
 * Example: Provision IVR and Ring Group via FreePBX API
 * 
 * This script demonstrates how to automatically create:
 * - A ring group that rings all AI assistants
 * - An IVR menu for selecting which AI to talk to
 */

import { FreePBXClient } from '../cli/lib/freepbx-api.js';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function main() {
    // Load config
    const configPath = join(homedir(), '.gemini-phone', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    if (!config.freepbx || !config.freepbx.clientId) {
        console.error('❌ FreePBX API not configured. Run: gemini-phone setup');
        process.exit(1);
    }

    const client = new FreePBXClient({
        clientId: config.freepbx.clientId,
        clientSecret: config.freepbx.clientSecret,
        apiUrl: config.freepbx.apiUrl
    });

    console.log('🔧 Provisioning IVR and Ring Group...\n');

    try {
        // Step 1: Create or Update Ring Group (8000) - All AIs
        console.log('📞 Checking Ring Group 8000...');
        const ringGroupExists = await client.ringGroupExists('8000');
        console.log(ringGroupExists ? '   Found existing Ring Group 8000, updating...' : '   Creating new Ring Group 8000...');

        const extensions = config.devices.map(d => d.extension);
        await client.createOrUpdateRingGroup(
            '8000',
            'All AI Assistants',
            extensions,
            'ringall' // All ring at once
        );
        console.log(`✅ Ring Group 8000 ${ringGroupExists ? 'updated' : 'created'}\n`);

        // Step 2: Create or Update IVR (7000) - AI Selection Menu
        console.log('🎙️  Checking IVR 7000...');
        const ivrExists = await client.ivrExists('7000');
        console.log(ivrExists ? '   Found existing IVR 7000, updating...' : '   Creating new IVR 7000...');

        // Build IVR entries dynamically from devices
        const ivrEntries = {};
        config.devices.forEach((device, index) => {
            const digit = (index + 1).toString();
            ivrEntries[digit] = `ext-local,${device.extension},1`;
        });
        // Add option 0 for ring group
        ivrEntries['0'] = 'ext-local,8000,1';

        await client.createOrUpdateIVR(
            '7000',
            'AI Selection Menu',
            'Choose your AI assistant',
            '0', // Announcement recording ID (0 = none, you'll need to record one)
            ivrEntries
        );
        console.log(`✅ IVR 7000 ${ivrExists ? 'updated' : 'created'}\n`);

        // Step 3: Apply configuration
        console.log('⚙️  Applying FreePBX configuration...');
        await client.applyConfig();
        console.log('✅ Configuration applied\n');

        console.log('🎉 Success! Your IVR and Ring Group are ready.\n');
        console.log('Next steps:');
        console.log('1. Record an announcement for IVR 7000 in FreePBX');
        console.log('2. Update the IVR to use your recording');
        console.log('3. Point your DID to IVR 7000');
        console.log('\nTest by calling:');
        console.log('  - Extension 7000: IVR menu');
        console.log('  - Extension 8000: Ring all AIs');
        config.devices.forEach((device, index) => {
            console.log(`  - Press ${index + 1} in IVR: ${device.name} (${device.extension})`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
