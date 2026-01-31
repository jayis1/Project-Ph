#!/usr/bin/env node

import { loadConfig } from './lib/config.js';
import { FreePBXClient } from './lib/freepbx-api.js';

async function introspectMutation() {
    const config = await loadConfig();
    const client = new FreePBXClient({
        clientId: config.api.freepbx.clientId,
        clientSecret: config.api.freepbx.clientSecret,
        apiUrl: config.api.freepbx.apiUrl
    });

    console.log('Testing Ring Group mutation schema...\n');

    try {
        const query = `
query {
  __type(name: "addRingGroupInput") {
    name
    inputFields {
      name
      type {
        name
        kind
        ofType {
          name
          kind
        }
      }
    }
  }
}`;
        const res = await client.query(query);
        console.log('addRingGroupInput fields:', JSON.stringify(res, null, 2));
    } catch (error) {
        console.log('Failed:', error.message);
    }
}

introspectMutation().catch(console.error);
