#!/usr/bin/env node
/**
 * Add IVR option 0 to connect to Morpheus (9000)
 * This allows callers to press 0 in the IVR to reach Morpheus directly
 */

import { FreePBXClient } from '../lib/freepbx-api.js';
import { loadConfig } from '../lib/config.js';

async function addIvrOption0() {
    const config = loadConfig();

    if (!config.api?.freepbx) {
        console.error('❌ FreePBX API not configured');
        process.exit(1);
    }

    const client = new FreePBXClient(
        config.api.freepbx.apiUrl,
        config.api.freepbx.clientId,
        config.api.freepbx.clientSecret
    );

    console.log('🔧 Adding IVR option 0 → Morpheus (9000)...\n');

    try {
        // Get current IVR configuration
        const query = `
      query GetIVR {
        ivr(id: 1) {
          id
          name
          options {
            digit
            destination
          }
        }
      }
    `;

        const result = await client.query(query);
        console.log('Current IVR:', JSON.stringify(result, null, 2));

        // Add option 0 via mutation
        const mutation = `
      mutation AddIVROption {
        updateIVR(
          id: 1
          input: {
            options: [
              { digit: "0", destination: "from-did-direct,9000,1" }
            ]
          }
        ) {
          id
          name
        }
      }
    `;

        const updateResult = await client.mutate(mutation);
        console.log('\n✅ IVR option 0 added:', JSON.stringify(updateResult, null, 2));

        console.log('\n📞 Test it:');
        console.log('  1. Call IVR 7000');
        console.log('  2. Press 0');
        console.log('  3. Should connect to Morpheus (9000)\n');

    } catch (error) {
        console.error('❌ Failed:', error.message);
        console.log('\n💡 Manual alternative:');
        console.log('  1. Log into FreePBX GUI');
        console.log('  2. Go to: Admin → IVR → 7000 (Nebuchadnezzar Crew)');
        console.log('  3. Add option: 0 → Dial Extension → 9000');
        console.log('  4. Submit and Apply Config\n');
        process.exit(1);
    }
}

addIvrOption0();
