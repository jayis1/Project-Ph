#!/usr/bin/env node

import { loadConfig } from './lib/config.js';
import { FreePBXClient } from './lib/freepbx-api.js';

async function testIVRQuery() {
    const config = await loadConfig();
    const client = new FreePBXClient({
        clientId: config.api.freepbx.clientId,
        clientSecret: config.api.freepbx.clientSecret,
        apiUrl: config.api.freepbx.apiUrl
    });

    console.log('Testing different IVR query names...\n');

    // Try different possible query names
    const queries = [
        'fetchAllIVRs',
        'allIVRs',
        'allIvrs',
        'fetchAllIvrs',
        'allDigitalReceptionists',
        'fetchAllDigitalReceptionists'
    ];

    for (const queryName of queries) {
        try {
            console.log(`Trying: ${queryName}...`);
            const query = `query { ${queryName} { id name } }`;
            const res = await client.query(query);
            console.log(`✅ SUCCESS with ${queryName}:`, JSON.stringify(res, null, 2));
            break;
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
        }
    }

    // Also try to introspect the schema
    console.log('\n\nTrying schema introspection for IVR-related types...');
    try {
        const introspection = `
query {
  __schema {
    types {
      name
      fields {
        name
      }
    }
  }
}`;
        const res = await client.query(introspection);
        const ivrTypes = res.__schema.types.filter(t =>
            t.name.toLowerCase().includes('ivr') ||
            t.name.toLowerCase().includes('digital') ||
            t.name.toLowerCase().includes('receptionist')
        );
        console.log('IVR-related types found:', JSON.stringify(ivrTypes, null, 2));
    } catch (error) {
        console.log('Introspection failed:', error.message);
    }
}

testIVRQuery().catch(console.error);
