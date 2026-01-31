#!/usr/bin/env node

/**
 * Try FreePBX's internal PHP API for IVR management
 * FreePBX stores IVR configs in MySQL and has PHP classes to manage them
 */

import { loadConfig } from './lib/config.js';

async function testPHPAPI() {
    const config = await loadConfig();
    const baseUrl = config.api.freepbx.apiUrl.replace('/admin/api/api/gql', '');
    const clientId = config.api.freepbx.clientId;
    const clientSecret = config.api.freepbx.clientSecret;
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    console.log('🔍 Testing FreePBX PHP API for IVR\n');
    console.log('Base URL:', baseUrl, '\n');

    // Try FreePBX's module API endpoints
    const endpoints = [
        // Module API
        '/admin/config.php?display=ivr',
        '/admin/ajax.php?module=ivr&command=getJSON',

        // REST-style endpoints
        '/rest.php/ivr',
        '/rest.php/ivr/list',

        // API v2 endpoints
        '/api/v2/ivr',
        '/api/ivr',
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`Trying: ${endpoint}`);
            const url = `${baseUrl}${endpoint}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`  Status: ${response.status}`);
            const text = await response.text();

            if (response.ok || response.status === 200) {
                console.log(`  ✅ Response: ${text.substring(0, 200)}`);
                console.log('\n🎉 Found working endpoint!\n');
                break;
            } else {
                console.log(`  ❌ ${text.substring(0, 100)}`);
            }
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
        console.log('');
    }

    console.log('\n💡 Alternative: Direct MySQL access');
    console.log('   IVR configs are stored in MySQL database');
    console.log('   Table: ivr_details, ivr_entries');
    console.log('   We could write directly to MySQL if needed\n');
}

testPHPAPI().catch(console.error);
