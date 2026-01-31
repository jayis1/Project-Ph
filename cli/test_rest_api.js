#!/usr/bin/env node

/**
 * Test FreePBX REST API for IVR support
 */

import { loadConfig } from './lib/config.js';

async function testRestAPI() {
    const config = await loadConfig();
    const apiUrl = config.api.freepbx.apiUrl.replace('/graphql', '');
    const clientId = config.api.freepbx.clientId;
    const clientSecret = config.api.freepbx.clientSecret;

    console.log('Testing FreePBX REST API endpoints...\n');
    console.log('Base URL:', apiUrl);

    // Try different possible REST endpoints
    const endpoints = [
        '/api/ivr',
        '/api/ivrs',
        '/admin/api/api/ivr',
        '/admin/api/api/ivrs',
        '/rest/ivr',
        '/rest/ivrs'
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`\nTrying: ${endpoint}`);
            const url = `${apiUrl}${endpoint}`;
            const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`Status: ${response.status}`);
            const text = await response.text();
            console.log(`Response: ${text.substring(0, 200)}`);

            if (response.ok) {
                console.log('✅ SUCCESS! This endpoint works!');
                break;
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }
}

testRestAPI().catch(console.error);
