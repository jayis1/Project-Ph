#!/usr/bin/env node

import { loadConfig } from './lib/config.js';
import { FreePBXClient } from './lib/freepbx-api.js';

async function testRingGroupQuery() {
    const config = await loadConfig();
    const client = new FreePBXClient({
        clientId: config.api.freepbx.clientId,
        clientSecret: config.api.freepbx.clientSecret,
        apiUrl: config.api.freepbx.apiUrl
    });

    console.log('Testing Ring Group queries...\n');

    try {
        console.log('Trying: fetchAllRingGroups...');
        const query = `query { fetchAllRingGroups { grpnum description } }`;
        const res = await client.query(query);
        console.log('✅ SUCCESS:', JSON.stringify(res, null, 2));
    } catch (error) {
        console.log('❌ Failed:', error.message);
    }
}

testRingGroupQuery().catch(console.error);
