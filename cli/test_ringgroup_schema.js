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

    console.log('Testing Ring Group queries with introspection...\n');

    try {
        const introspection = `
query {
  __type(name: "RinggroupConnection") {
    name
    fields {
      name
      type {
        name
        kind
        ofType {
          name
          fields {
            name
          }
        }
      }
    }
  }
}`;
        const res = await client.query(introspection);
        console.log('RinggroupConnection fields:', JSON.stringify(res, null, 2));
    } catch (error) {
        console.log('Failed:', error.message);
    }
}

testRingGroupQuery().catch(console.error);
